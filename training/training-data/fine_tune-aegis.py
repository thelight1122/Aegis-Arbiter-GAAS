import os
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForCausalLM, Trainer, TrainingArguments
from transformers import DataCollatorForSeq2Seq

# ——— Config ———
MODEL_NAME = "TheBloke/Llama-2-7B-chat-GPTQ"  # replace with your chosen base model
TRAIN_FILE = "aegis_reflection_training.jsonl"
OUTPUT_DIR = "aegis_finetuned_model"
BATCH_SIZE = 4
EPOCHS = 3
LR = 5e-5

# ——— Load Dataset ———
print("Loading dataset...")
dataset = load_dataset("json", data_files={"train": TRAIN_FILE})

# ——— Tokenizer + Model ———
print("Loading tokenizer and model...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, use_fast=True)
model = AutoModelForCausalLM.from_pretrained(MODEL_NAME, trust_remote_code=True)

# ——— Tokenize ———
def tokenize_fn(example):
    prompt = example["input"]
    target = example["output"]
    full_text = prompt + "\n" + target
    return tokenizer(full_text, truncation=True)

print("Tokenizing dataset...")
tokenized = dataset["train"].map(tokenize_fn, batched=True)

# ——— Data Collator ———
data_collator = DataCollatorForSeq2Seq(tokenizer, model=model)

# ——— Training ———
print("Setting up training arguments...")
training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    per_device_train_batch_size=BATCH_SIZE,
    learning_rate=LR,
    num_train_epochs=EPOCHS,
    logging_strategy="epoch",
    save_strategy="epoch",
    fp16=True,
    push_to_hub=False,
)

print("Initializing Trainer...")
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized,
    tokenizer=tokenizer,
    data_collator=data_collator,
)

print("Starting training...")
trainer.train()

print("Saving model to", OUTPUT_DIR)
trainer.save_model(OUTPUT_DIR)
