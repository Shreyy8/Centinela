# Bayora Blue Team - Colab Training Script (corrected)

import torch
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer
)
from datasets import load_dataset, concatenate_datasets
from peft import LoraConfig, get_peft_model, TaskType
from sklearn.metrics import f1_score, accuracy_score
import numpy as np

# ── 0. Sanity checks ──────────────────────────────────────────────────────────
if not torch.cuda.is_available():
    raise RuntimeError(
        "No GPU detected. Go to Runtime → Change runtime type → T4 GPU"
    )
print(f"GPU: {torch.cuda.get_device_name(0)}")
print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")

# Mount Drive to survive session crashes
from google.colab import drive
drive.mount("/content/drive")

# ── 1. Load real datasets ─────────────────────────────────────────────────────
def load_datasets():
    # ToxiGen — available directly from HuggingFace
    toxigen = load_dataset("skg/toxigen-data", name="train")["train"]
    toxigen = toxigen.map(lambda x: {
        "text": x["text"],
        "label": 1 if x["toxicity_human"] >= 0.5 else 0
    }).select_columns(["text", "label"])

    # HH-RLHF — rejected responses are the harmful class
    hh = load_dataset("Anthropic/hh-rlhf", split="train[:5000]")
    hh = hh.map(lambda x: {
        "text": x["rejected"], "label": 1
    }).select_columns(["text", "label"])

    # HarmBench — upload CSV manually to Colab or Drive
    # harmbench = load_dataset("csv",
    #     data_files="/content/harmbench_behaviors.csv")["train"]
    # harmbench = harmbench.map(lambda x: {
    #     "text": x["goal"], "label": 1
    # }).select_columns(["text", "label"])

    full = concatenate_datasets([toxigen, hh]).shuffle(seed=42)
    return full.train_test_split(test_size=0.15, seed=42)

split    = load_datasets()
train_ds = split["train"]
val_ds   = split["test"]
print(f"Train: {len(train_ds)} | Val: {len(val_ds)}")

# ── 2. Tokenise ───────────────────────────────────────────────────────────────
MODEL_NAME = "unitary/toxic-bert"
tokenizer  = AutoTokenizer.from_pretrained(MODEL_NAME)

def tokenize_func(examples):
    return tokenizer(
        examples["text"],
        padding="max_length",
        truncation=True,
        max_length=256
    )

train_ds = train_ds.map(tokenize_func, batched=True)
val_ds   = val_ds.map(tokenize_func,   batched=True)
train_ds.set_format("torch", columns=["input_ids","attention_mask","label"])
val_ds.set_format("torch",   columns=["input_ids","attention_mask","label"])

# ── 3. Model + LoRA ───────────────────────────────────────────────────────────
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME, num_labels=2
)

lora_config = LoraConfig(
    task_type=TaskType.SEQ_CLS,
    inference_mode=False,
    r=8,
    lora_alpha=32,
    lora_dropout=0.1,
    target_modules=["query", "value"],
    bias="none"
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# ── 4. Metrics ────────────────────────────────────────────────────────────────
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    return {
        "f1":       f1_score(labels, preds, average="binary"),
        "accuracy": accuracy_score(labels, preds)
    }

# ── 5. Training args ──────────────────────────────────────────────────────────
training_args = TrainingArguments(
    output_dir="/content/drive/MyDrive/bayora/blue_agent_results",
    learning_rate=2e-4,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=32,
    num_train_epochs=3,
    weight_decay=0.01,
    fp16=True,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="f1",
    logging_steps=50,
    report_to="none"
)

# ── 6. Train ──────────────────────────────────────────────────────────────────
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_ds,
    eval_dataset=val_ds,
    tokenizer=tokenizer,
    compute_metrics=compute_metrics,
)

print("Starting training...")
trainer.train()

# ── 7. Save ───────────────────────────────────────────────────────────────────
save_path = "/content/drive/MyDrive/bayora/blue_agent_lora"
model.save_pretrained(save_path)
tokenizer.save_pretrained(save_path)
print(f"Done. Model + tokenizer saved to {save_path}")
