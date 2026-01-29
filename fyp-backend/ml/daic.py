from __future__ import annotations

import re
import torch
import torch.nn as nn
from transformers import AutoTokenizer, DistilBertModel
from .config import ModelConfig


class DistilBertMultiTaskWithAggregator(nn.Module):
    def __init__(self, encoder_ckpt: str):
        super().__init__()
        self.encoder = DistilBertModel.from_pretrained(encoder_ckpt)
        enc_dim = self.encoder.config.hidden_size

        self.emotion_head = nn.Sequential(
            nn.Dropout(0.1),
            nn.Linear(enc_dim, enc_dim // 2),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(enc_dim // 2, ModelConfig.DAIC_EMOTION_NUM_LABELS),  # ✅ From config
        )
        self.phq_reg_head = nn.Sequential(
            nn.Dropout(0.1),
            nn.Linear(enc_dim, enc_dim // 2),
            nn.ReLU(),
            nn.Linear(enc_dim // 2, 1),
        )
        self.phq_bin_head = nn.Sequential(
            nn.Dropout(0.1),
            nn.Linear(enc_dim, enc_dim // 2),
            nn.ReLU(),
            nn.Linear(enc_dim // 2, 1),
        )

        # Session aggregator (BiLSTM)
        self.aggr_lstm = nn.LSTM(
            input_size=enc_dim,
            hidden_size=ModelConfig.DAIC_AGGR_HIDDEN,      # ✅ From config
            num_layers=ModelConfig.DAIC_AGGR_LAYERS,       # ✅ From config
            batch_first=True,
            bidirectional=True,
            dropout=ModelConfig.DAIC_AGGR_DROPOUT if ModelConfig.DAIC_AGGR_LAYERS > 1 else 0.0,  # ✅
        )

        self.session_phq_reg = nn.Sequential(
            nn.Dropout(0.2),
            nn.Linear(2 * ModelConfig.DAIC_AGGR_HIDDEN, 1)  # ✅ From config
        )
        self.session_phq_bin = nn.Sequential(
            nn.Dropout(0.2),
            nn.Linear(2 * ModelConfig.DAIC_AGGR_HIDDEN, 1)  # ✅ From config
        )

    def forward_utterance(self, input_ids, attention_mask):
        out = self.encoder(input_ids=input_ids, attention_mask=attention_mask, return_dict=True)
        last = out.last_hidden_state
        pooled = last[:, 0, :]
        return pooled

    def forward_session(self, utter_embs_padded, lengths):
        packed = torch.nn.utils.rnn.pack_padded_sequence(
            utter_embs_padded, lengths=lengths, batch_first=True, enforce_sorted=True
        )
        _, (h_n, _) = self.aggr_lstm(packed)

        last_forward = h_n[-2]
        last_backward = h_n[-1]
        session_repr = torch.cat([last_forward, last_backward], dim=-1)

        phq_reg = self.session_phq_reg(session_repr).squeeze(-1)
        phq_bin_logit = self.session_phq_bin(session_repr).squeeze(-1)
        return phq_reg, phq_bin_logit


_tokenizer = None
_model = None
_device = torch.device("cuda" if torch.cuda.is_available() and ModelConfig.ENABLE_GPU else "cpu")  # ✅


def _split_into_utterances(text: str):
    parts = [p.strip() for p in re.split(r"[.\n!?]+", text) if p.strip()]
    return parts[:ModelConfig.DAIC_MAX_UTTERANCES] if parts else [text.strip()]  # ✅


def load_daic():
    global _tokenizer, _model

    if _model is not None and _tokenizer is not None:
        return _tokenizer, _model

    if not ModelConfig.DAIC_CHECKPOINT.exists():  # ✅
        raise FileNotFoundError(f"DAIC checkpoint not found: {ModelConfig.DAIC_CHECKPOINT}")

    if not ModelConfig.DAIC_TOKENIZER_DIR.exists():  # ✅
        raise FileNotFoundError(f"Tokenizer directory not found: {ModelConfig.DAIC_TOKENIZER_DIR}")

    tok = AutoTokenizer.from_pretrained(str(ModelConfig.DAIC_TOKENIZER_DIR))  # ✅
    model = DistilBertMultiTaskWithAggregator(encoder_ckpt=str(ModelConfig.DAIC_TOKENIZER_DIR))  # ✅

    state_dict = torch.load(str(ModelConfig.DAIC_CHECKPOINT), map_location="cpu")  # ✅
    model.load_state_dict(state_dict, strict=True)
    model.eval()
    model.to(_device)

    _tokenizer, _model = tok, model
    return _tokenizer, _model


def predict_phq(text: str):
    text = (text or "").strip()
    if not text:
        raise ValueError("Empty text")

    tokenizer, model = load_daic()

    utterances = _split_into_utterances(text)
    enc = tokenizer(
        utterances,
        truncation=True,
        max_length=ModelConfig.DAIC_MAX_SEQ_LEN,  # ✅
        padding=True,
        return_tensors="pt",
    )

    with torch.no_grad():
        pooled = model.forward_utterance(
            enc["input_ids"].to(_device),
            enc["attention_mask"].to(_device),
        )

        seq = pooled.unsqueeze(0)
        lengths = [pooled.size(0)]
        phq_reg, phq_bin_logit = model.forward_session(seq, lengths)

        score = float(phq_reg.cpu().item())
        score = max(ModelConfig.PHQ8_MIN_SCORE, min(ModelConfig.PHQ8_MAX_SCORE, score))  # ✅
        prob = float(torch.sigmoid(phq_bin_logit).cpu().item())
        binary = bool(prob >= ModelConfig.DAIC_PHQ_BIN_THRESHOLD)  # ✅

    return {
        "phq8_score": round(score, 2),
        "phq8_binary": binary,
        "phq8_prob": round(prob, 4),
        "utterance_count": len(utterances),
    }