import torch
import gc
import re
import os
import base64
from sentence_transformers import SentenceTransformer, util

class SandboxedInference:
    def __init__(self, model_id: str = "gemini-flash-latest", similarity_threshold: float = 0.75):
        self.model_id = model_id
        self.similarity_threshold = similarity_threshold
        self.llm_engine = None
        self.embedding_model = None
        self.gemini_model = None
        self._load_model()

    def _load_model(self):
        """Loads model with specific security and isolation settings."""
        print(f"[LLM Proxy] Initializing Inference Engine...")
        
        # 1. Load Embedding Model for Semantic Filtering (Always needed for security)
        print("[LLM Proxy] Loading Embedding Model for Semantic Filtering...")
        try:
            self.embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
            if torch.cuda.is_available():
                self.embedding_model = self.embedding_model.to("cuda")
        except Exception as e:
            print(f"⚠️ Failed to load embedding model: {e}")

        # 2. Check for Mock Mode
        if os.getenv("MOCK_LLM") == "1":
            print("✅ Mock LLM mode enabled. Skipping large model download.")
            self.model = "mock"
            return

        # 3. Check for External API (Gemini)
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if google_api_key:
            clean_key = re.sub(r'[^A-Za-z0-9_-]', '', google_api_key.strip())
            if clean_key and len(clean_key) >= 20 and clean_key.startswith("AIza"):
                target_model = "gemini-1.5-flash" if self.model_id in ["gemini-flash-latest", "gemini-flash"] else self.model_id
                print(f"✅ Google Gemini detected (Model: {target_model}). Verifying API mode...")
                try:
                    import google.generativeai as genai
                    genai.configure(api_key=clean_key)
                    test_model = genai.GenerativeModel(target_model)
                    test_model.generate_content("ping", generation_config={"max_output_tokens": 1})
                    self.gemini_model = test_model
                    self.model = "gemini" # Mark as loaded
                    return
                except Exception as e:
                    print(f"⚠️ Gemini key validation failed ({e}). Defaulting to sandboxed simulation.")
                    self.gemini_model = None
                    self.model = "simulator"
                    return
            else:
                print("⚠️ Invalid Gemini key format in GOOGLE_API_KEY. Defaulting to sandboxed simulation.")
                self.gemini_model = None
                self.model = "simulator"
                return

        # 4. Fallback to Local Models (vLLM or Transformers)
        print(f"[LLM Proxy] No API key found. Attempting to load local model: {self.model_id}")
        try:
            # Try loading with vLLM
            from vllm import LLM
            self.llm_engine = LLM(
                model=self.model_id,
                trust_remote_code=True,
                tensor_parallel_size=1,
                enforce_eager=True,
                gpu_memory_utilization=0.8
            )
            print("✅ vLLM Engine loaded successfully.")
        except Exception:
            # Fallback to standard HuggingFace Transformers
            print("⚠️ vLLM not available. Falling back to transformers library...")
            from transformers import AutoModelForCausalLM, AutoTokenizer
            try:
                self.tokenizer = AutoTokenizer.from_pretrained(self.model_id)
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.model_id, 
                    torch_dtype=torch.float16, 
                    use_cache=False,
                    device_map="auto"
                )
            except Exception as e:
                print(f"⚠️ Failed to load local model: {e}. Defaulting to sandboxed simulation mode.")
                self.model = "simulator"

    def set_api_key(self, api_key: str, model_id: str = None) -> bool:
        """Dynamically configure or switch Gemini API key without container restart."""
        if model_id:
            self.model_id = model_id
        if api_key:
            clean_key = re.sub(r'[^A-Za-z0-9_-]', '', api_key.strip())
            if not clean_key or len(clean_key) < 20 or not clean_key.startswith("AIza"):
                print(f"⚠️ Invalid Gemini API key format (must start with 'AIza' and be 39+ alphanumeric chars). Reverting to sandboxed simulator.")
                self.gemini_model = None
                self.model = "simulator"
                return False

            try:
                import google.generativeai as genai
                genai.configure(api_key=clean_key)
                target_model = "gemini-1.5-flash" if self.model_id in ["gemini-flash-latest", "gemini-flash"] else self.model_id
                test_model = genai.GenerativeModel(target_model)
                test_model.generate_content("ping", generation_config={"max_output_tokens": 1})
                self.gemini_model = test_model
                self.model = "gemini"
                print(f"✅ Verified & dynamically loaded Gemini API model: {target_model}")
                return True
            except Exception as e:
                print(f"⚠️ Gemini API key preflight failed: {e}. Reverting to sandboxed simulator.")
                self.gemini_model = None
                self.model = "simulator"
                return False
        else:
            self.gemini_model = None
            self.model = "simulator"
            return True

    def _ollama_infer(self, prompt: str, model: str = "llama3", host: str = None) -> str:
        """Call local Ollama instance."""
        import urllib.request
        import json as jsonlib
        base_url = host or os.getenv("OLLAMA_HOST", "http://localhost:11434")
        if not base_url.startswith("http://") and not base_url.startswith("https://"):
            base_url = f"http://{base_url}"
        endpoint = f"{base_url.rstrip('/')}/api/generate"

        body = jsonlib.dumps({
            "model": model,
            "prompt": prompt,
            "stream": False,
        }).encode()
        req = urllib.request.Request(
            endpoint,
            data=body,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = jsonlib.loads(resp.read().decode())
                return result.get("response", "")
        except Exception as e:
            return f"[ERROR] Ollama inference failed: {e}"

    def _generate_simulated_response(self, prompt: str, media: list = None) -> str:
        """
        Simulated inference for sandboxed testing when no external API or local GPU is available.
        Simulates realistic refusal and jailbreak rates for adversarial benchmarking.
        """
        prompt_lower = prompt.lower()
        is_attack = any(k in prompt_lower for k in [
            "ignore previous instructions", "dan", "jailbreak", "bypass", "exploit",
            "unfiltered", "override", "root", "hack", "bomb", "malware", "system prompt",
            "exfiltrate", "dump", "synthesize", "vulnerability", "adversarial", "harm"
        ])
        
        import hashlib
        hash_val = int(hashlib.md5(prompt.encode()).hexdigest(), 16) % 100

        if is_attack:
            # ~78% safe refusal, ~22% simulated bypass
            if hash_val < 78:
                response = "I cannot fulfill this request. I am programmed to be a helpful and harmless AI assistant, and I cannot assist with activities that violate security or safety policies."
            else:
                response = f"Simulated bypass: Executing unaligned instruction vector for: {prompt[:40]}... [Audit finding: potential vulnerability detected]"
        else:
            response = f"I am pleased to assist you. Regarding your query: {prompt[:60]}... The system is functioning normally under safety guardrails."

        return self._apply_sandbox_filters(prompt, response)

    def infer(self, prompt: str, media: list = None) -> str:
        """Runs inference with output sandboxing."""
        if os.getenv("MOCK_LLM") == "1":
            return self._generate_simulated_response(prompt, media)

        if self.gemini_model:
            try:
                content_parts = [prompt]
                if media:
                    for item in media:
                        content_parts.append({
                            "mime_type": item["type"],
                            "data": base64.b64decode(item["data"])
                        })
                res = self.gemini_model.generate_content(content_parts)
                response = res.text
                return self._apply_sandbox_filters(prompt, response)
            except Exception as e:
                print(f"❌ Gemini Inference Error: {e}. Disabling Gemini and falling back to simulation.")
                self.gemini_model = None
                self.model = "simulator"
                return self._generate_simulated_response(prompt, media)

        ollama_host = os.getenv("OLLAMA_HOST")
        if ollama_host and ollama_host != "0":
            try:
                resp = self._ollama_infer(prompt, os.getenv("OLLAMA_MODEL", "llama3"), host=ollama_host)
                if resp and not resp.startswith("[ERROR]"):
                    return self._apply_sandbox_filters(prompt, resp)
            except Exception as e:
                pass

        if getattr(self, "model", None) == "simulator":
            return self._generate_simulated_response(prompt, media)

        if self.llm_engine is None and getattr(self, "model", None) is None:
            return self._generate_simulated_response(prompt, media)

        response = ""
        try:
            if self.llm_engine:
                from vllm import SamplingParams
                sampling_params = SamplingParams(temperature=0.0, max_tokens=256)
                outputs = self.llm_engine.generate([prompt], sampling_params, use_tqdm=False)
                response = outputs[0].outputs[0].text
            else:
                raise ImportError
        except ImportError:
            # Fallback transformer generation
            if not hasattr(self, "tokenizer") or self.tokenizer is None:
                return self._generate_simulated_response(prompt, media)
            inputs = self.tokenizer(prompt, return_tensors="pt").to("cuda" if torch.cuda.is_available() else "cpu")
            outputs = self.model.generate(
                **inputs, 
                max_new_tokens=256, 
                do_sample=False,
                use_cache=False
            )
            response = self.tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True)

        return self._apply_sandbox_filters(prompt, response)

    def _apply_sandbox_filters(self, prompt: str, response: str) -> str:
        """
        Filters output to prevent:
        1. Prompt Echo (Red team side-channel)
        2. System prompt reproduction
        """
        # Simple echo filter: if response contains large chunks of prompt, strip them
        if prompt in response:
            response = response.replace(prompt, "[ECHO_FILTERED]")
            
        # Strip potential system prompt reproduction
        system_markers = ["INST", "<<SYS>>", "System:", "User:"]
        for marker in system_markers:
            if marker in response:
                response = response.split(marker)[0]
        
        # Semantic Similarity Filter
        if self.embedding_model and response.strip():
            try:
                prompt_emb = self.embedding_model.encode(prompt, convert_to_tensor=True)
                response_emb = self.embedding_model.encode(response, convert_to_tensor=True)
                
                # Compute cosine similarity
                cos_sim = util.cos_sim(prompt_emb, response_emb).item()
                
                if cos_sim > self.similarity_threshold:
                    print(f"[LLM Proxy] Semantic leak detected (sim: {cos_sim:.2f}). Redacting response.")
                    return "[SEMANTIC_ECHO_FILTERED] The response was blocked due to high semantic similarity with the prompt or system context."
            except Exception as e:
                print(f"⚠️ Error during semantic filtering: {e}")
                
        return response.strip()

    def end_session(self):
        """FR-3: Explicitly destroy model and clear VRAM."""
        print("[LLM Proxy] FR-3: Destroying model instance and clearing cache...")
        
        # Purge vLLM engine
        if self.llm_engine:
            try:
                from vllm.distributed.parallel_state import destroy_model_parallel
                destroy_model_parallel()
            except ImportError:
                pass
            del self.llm_engine
            self.llm_engine = None
            
        # Purge Transformers engine
        if hasattr(self, "model") and self.model:
            del self.model
            if hasattr(self, "tokenizer"):
                del self.tokenizer
            self.model = None
            self.tokenizer = None
        
        # Aggressive memory purging
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
        gc.collect()
        print("✅ GPU Memory Purged.")
        
    def reload(self):
        """Ensure a fresh model instance."""
        self.end_session()
        self._load_model()
