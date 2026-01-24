"""
convert_to_lmstudio.py

This script takes a HuggingFace fine-tuned model (after training)
and converts it into a format suitable for LMStudio (like GGML / GGUF).

You don’t need to edit anything here — just make sure the paths are correct.

To run:
    python convert_to_lmstudio.py
"""

import subprocess
from pathlib import Path

# ——— CONFIGURATION ———

# Path to your fine-tuned HuggingFace model
# Example: "./aegis_finetuned_model"
HF_MODEL_DIR = Path("aegis_finetuned_model")

# Output directory for the converted model
OUTPUT_DIR = Path("lmstudio_model_export")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Choose the target format
# LMStudio commonly uses GGML/GGUF
TARGET_FORMAT = "gguf"

# A helper for llama-cpp/transformers conversion
# Make sure you have installed the conversion tool:
# pip install llama-cpp-python
# or the python binding to whatever converter you use
CONVERSION_COMMAND = [
    "python",
    "-m",
    "llama_cpp.convert",
    str(HF_MODEL_DIR),
    "--format",
    TARGET_FORMAT,
    "--output",
    str(OUTPUT_DIR / "aegis_lmstudio_model")
]

# ——— SCRIPT LOGIC ———

def run_conversion():
    print("\n📦 Converting your fine-tuned model for LMStudio…\n")
    print(f"Source (HuggingFace): {HF_MODEL_DIR}")
    print(f"Target output dir: {OUTPUT_DIR}")
    print(f"Target format: {TARGET_FORMAT}\n")

    try:
        res = subprocess.run(CONVERSION_COMMAND, check=True)
        print("\n✅ Conversion complete!")
        print(f"Your LMStudio model is here:\n{OUTPUT_DIR}")
    except subprocess.CalledProcessError as exc:
        print("\n❌ Conversion failed with error:\n")
        print(exc)
        print("\nMake sure you have the conversion tool installed:")
        print("pip install llama-cpp-python")
        print("Or check your environment PATH variables.")

# ——— RUN ———

if __name__ == "__main__":
    run_conversion()
