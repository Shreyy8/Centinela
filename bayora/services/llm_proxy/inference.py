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
            print(f"✅ Google Gemini detected (Model: {self.model_id}). Switching to API mode.")
            try:
                import google.generativeai as genai
                genai.configure(api_key=google_api_key)
                self.gemini_model = genai.GenerativeModel(self.model_id)
                self.model = "gemini" # Mark as loaded
                return
            except Exception as e:
                print(f"❌ Failed to initialize Gemini: {e}")

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
                print(f"❌ Failed to load local model: {e}")

    def _ollama_infer(self, prompt: str, model: str = "llama3") -> str:
        """Call local Ollama instance at localhost:11434."""
        import urllib.request
        import json as jsonlib
        body = jsonlib.dumps({
            "model": model,
            "prompt": prompt,
            "stream": False,
        }).encode()
        req = urllib.request.Request(
            "http://localhost:11434/api/generate",
            data=body,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = jsonlib.loads(resp.read().decode())
                return result.get("response", "")
        except Exception as e:
            print(f"❌ Ollama inference error: {e}")
            return f"[ERROR] Ollama inference failed: {e}"

    def infer(self, prompt: str, media: list = None) -> str:
        """Runs inference with output sandboxing."""
        if os.getenv("MOCK_LLM") == "1":
            response = f"MOCK LLM RESPONSE to: {prompt[:50]}... (Media attached: {len(media) if media else 0})"
            return self._apply_sandbox_filters(prompt, response)

        if os.getenv("OLLAMA_HOST"):
            response = self._ollama_infer(prompt, os.getenv("OLLAMA_MODEL", "llama3"))
            return self._apply_sandbox_filters(prompt, response)

        if self.gemini_model:
            try:
                # Prepare content parts for Gemini
                content_parts = [prompt]
                if media:
                    for item in media:
                        # item format: {"type": "image/png", "data": "<base64>"}
                        content_parts.append({
                            "mime_type": item["type"],
                            "data": base64.b64decode(item["data"])
                        })
                
                # Use Gemini API
                res = self.gemini_model.generate_content(content_parts)
                response = res.text
                return self._apply_sandbox_filters(prompt, response)
            except Exception as e:
                print(f"❌ Gemini Inference Error: {e}")
                return f"[ERROR] Gemini inference failed: {e}"

        if self.llm_engine is None and getattr(self, "model", None) is None:
            raise RuntimeError("Model not loaded")

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
            if not hasattr(self, "tokenizer"):
                return "[ERROR] Local model requested but not initialized."
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
                # Encode prompt and response
                # Note: For production, you might want to truncate prompt to avoid OOM or max_seq_length issues
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
