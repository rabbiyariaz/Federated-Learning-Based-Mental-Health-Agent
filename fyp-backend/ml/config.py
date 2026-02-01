from pathlib import Path
import os
import torch

BACKEND_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = BACKEND_DIR / "models"



class ModelConfig:
    """Configuration for ML models"""

    # ===== DAIC (PHQ-8) Model =====
    DAIC_MODEL_NAME = "daic_phq8"
    DAIC_CHECKPOINT = MODELS_DIR / "daic_multitask_results" / "multitask_with_aggr_best.pt"
    DAIC_TOKENIZER_DIR = MODELS_DIR / "emotion" / "goemotions"

    DAIC_MAX_SEQ_LEN = 128
    DAIC_EMOTION_NUM_LABELS = 7
    DAIC_AGGR_HIDDEN = 256
    DAIC_AGGR_LAYERS = 1
    DAIC_AGGR_DROPOUT = 0.2
    DAIC_PHQ_BIN_THRESHOLD = 0.5
    DAIC_MAX_UTTERANCES = 40

    PHQ8_MIN_SCORE = 0.0
    PHQ8_MAX_SCORE = 24.0

    # ===== GoEmotions =====
    GOEMOTIONS_MODEL_NAME = "goemotions_v1"
    GOEMOTIONS_MODEL_PATH = MODELS_DIR / "emotion" / "goemotions"
    GOEMOTIONS_MAX_SEQ_LEN = 512

    # ===== Runtime =====
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    ENABLE_GPU = DEVICE == "cuda"

    

    # if not DAIC_CHECKPOINT.exists():
    #     raise FileNotFoundError(f"DAIC checkpoint not found: {DAIC_CHECKPOINT}")
