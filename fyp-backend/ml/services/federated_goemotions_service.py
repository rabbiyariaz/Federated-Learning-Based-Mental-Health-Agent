"""
Lightweight federated-learning *simulation* for GoEmotions using TF-IDF + linear models.

Uses scikit-learn (Tfidf + SGDClassifier + OneVsRest) instead of retraining DistilBERT so
that local rounds stay fast enough for demos on a laptop. The production inference path
still uses the existing HF GoEmotions checkpoint; this module is standalone for FL demos.
"""

from __future__ import annotations

import json
import random
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import accuracy_score, f1_score, hamming_loss
from sklearn.multiclass import OneVsRestClassifier

# Training caps keep round times reasonable for simulation (see requirement).
_MAX_TRAIN_ROWS = 12000
_MAX_VALIDATION_ROWS = 2000


class FederatedGoEmotionsService:
    """Simulated federated rounds over partitioned GoEmotions JSONL rows (metrics only)."""

    _CLIENT_IDS = ("client-1", "client-2", "client-3", "client-4", "client-5")
    _CLIENT_NAMES = (
        "GoEmotions Client A",
        "GoEmotions Client B",
        "GoEmotions Client C",
        "GoEmotions Client D",
        "GoEmotions Client E",
    )

    _PARTITION_WEIGHTS = (0.30, 0.25, 0.20, 0.15, 0.10)

    def __init__(self, total_rounds: int = 10) -> None:
        self.total_rounds = total_rounds
        self.current_round = int(0)
        self.status = "idle"
        self.rounds: list[dict[str, Any]] = []
        self.clients: dict[str, dict[str, Any]] = {}
        self.client_partitions: dict[str, list[dict[str, Any]]] = {}
        self.global_accuracy = 0.0
        self.global_loss = 1.0
        self.global_f1 = 0.0
        self.vectorizer: TfidfVectorizer | None = None
        self._val_rows: list[dict[str, Any]] = []
        self._test_rows: list[dict[str, Any]] = []
        self._label_dim: int = 7
        self.model_version: str = "v-fl-0.0"

        backend_root = Path(__file__).resolve().parents[2]
        self._data_jsonl = backend_root / "data" / "emotion_dataset.jsonl"
        self._label_json = backend_root / "data" / "emotion_label_names.json"

        self._reload_from_disk()

    @staticmethod
    def _now() -> str:
        return datetime.utcnow().isoformat()

    def _load_label_names(self) -> list[str]:
        payload = json.loads(self._label_json.read_text(encoding="utf-8"))
        labels = payload.get("labels", [])
        self._label_dim = len(labels)
        return labels

    def _load_dataset(
        self,
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
        train_rows: list[dict[str, Any]] = []
        validation_rows: list[dict[str, Any]] = []
        test_rows: list[dict[str, Any]] = []
        if not self._data_jsonl.exists():
            raise FileNotFoundError(
                f"FL dataset missing: {self._data_jsonl}. Run scripts/create_goemotions_jsonl.py first."
            )

        with self._data_jsonl.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                row = json.loads(line)
                split = row.get("split") or ""
                if split == "train":
                    train_rows.append(row)
                elif split == "validation":
                    validation_rows.append(row)
                elif split == "test":
                    test_rows.append(row)

        random.seed(42)
        random.shuffle(train_rows)
        train_rows = train_rows[:_MAX_TRAIN_ROWS]
        validation_rows = validation_rows[:_MAX_VALIDATION_ROWS]

        return train_rows, validation_rows, test_rows

    def _partition_clients(
        self, train_rows: list[dict[str, Any]]
    ) -> dict[str, list[dict[str, Any]]]:
        n = len(train_rows)
        if n == 0:
            return {cid: [] for cid in self._CLIENT_IDS}

        raw_sizes = [int(round(n * w)) for w in self._PARTITION_WEIGHTS]
        drift = n - sum(raw_sizes)
        if drift != 0:
            raw_sizes[-1] = max(0, raw_sizes[-1] + drift)

        partitions: dict[str, list[dict[str, Any]]] = {}
        idx = 0
        for i, cid in enumerate(self._CLIENT_IDS):
            size = raw_sizes[i] if i < len(raw_sizes) else 0
            end_idx = idx + size
            partitions[cid] = train_rows[idx:end_idx]
            idx = end_idx

        leftover = train_rows[idx:]
        if leftover and partitions:
            last_id = self._CLIENT_IDS[-1]
            partitions[last_id] = list(partitions[last_id]) + leftover

        return partitions

    def _build_vectorizer(self, texts: list[str]) -> TfidfVectorizer:
        vectorizer = TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            min_df=2,
            max_df=0.95,
        )
        vectorizer.fit(texts)
        return vectorizer

    @staticmethod
    def _make_model() -> OneVsRestClassifier:
        return OneVsRestClassifier(
            SGDClassifier(
                loss="log_loss",
                max_iter=5,
                tol=None,
                random_state=42,
            ),
        )

    def _rows_to_dense_labels(self, rows: list[dict[str, Any]]) -> np.ndarray:
        return np.asarray([r["labels"] for r in rows], dtype=np.int32)

    def _evaluate_model(
        self,
        model: OneVsRestClassifier,
        texts: list[str],
        y_true: np.ndarray,
    ) -> tuple[float, float, float, float]:
        if not texts or self.vectorizer is None:
            return 0.0, 1.0, 0.0, 1.0
        X = self.vectorizer.transform(texts)
        y_pred = model.predict(X)

        accuracy = float(accuracy_score(y_true, y_pred))
        h_loss = float(hamming_loss(y_true, y_pred))
        micro_f1 = float(
            f1_score(y_true, y_pred, average="micro", zero_division=0)
        )
        loss_approx = float(h_loss)
        return accuracy, loss_approx, micro_f1, h_loss

    def _reload_from_disk(self) -> None:
        self._label_names = self._load_label_names()

        train_rows, val_rows, test_rows = self._load_dataset()
        self._val_rows = val_rows
        self._test_rows = test_rows

        self.client_partitions = self._partition_clients(train_rows)
        texts_fit = [r["text"] for r in train_rows if r.get("text")]
        self.vectorizer = self._build_vectorizer(texts_fit)

        total_size = sum(len(p) for p in self.client_partitions.values()) or 1

        self.clients = {}
        for cid, display_name in zip(self._CLIENT_IDS, self._CLIENT_NAMES):
            part = self.client_partitions.get(cid, [])
            data_size = len(part)
            self.clients[cid] = {
                "id": cid,
                "name": display_name,
                "datasetType": "GoEmotions 7-label emotion data",
                "status": "idle",
                "dataSize": data_size,
                "lastUpdate": self._now(),
                "localAccuracy": 0.0,
                "localLoss": 1.0,
                "localF1": 0.0,
                "contributionWeight": round(data_size / total_size, 4),
            }

    def _train_local_client(
        self, client_id: str, round_number: int
    ) -> dict[str, Any]:
        _ = round_number

        partition = self.client_partitions.get(client_id, [])
        client_meta = self.clients[client_id]
        texts = [(r.get("text") or "").strip() for r in partition]
        y = self._rows_to_dense_labels(partition)

        t0 = time.perf_counter()
        client_meta["status"] = "training"

        if not texts or y.size == 0 or self.vectorizer is None:
            training_time = 0.0
            local_accuracy, local_loss, local_f1, _ = 0.0, 1.0, 0.0, 1.0
        else:
            model = self._make_model()
            X = self.vectorizer.transform(texts)
            model.fit(X, y)

            val_texts = [(r.get("text") or "").strip() for r in self._val_rows]
            y_val = self._rows_to_dense_labels(self._val_rows)

            local_accuracy, local_loss, local_f1, _ = self._evaluate_model(
                model, val_texts, y_val
            )
            training_time = round(time.perf_counter() - t0, 2)

        now = self._now()
        client_meta["localAccuracy"] = round(local_accuracy, 4)
        client_meta["localLoss"] = round(local_loss, 4)
        client_meta["localF1"] = round(local_f1, 4)
        client_meta["lastUpdate"] = now
        client_meta["status"] = "active"

        return {
            "clientId": client_id,
            "clientName": client_meta["name"],
            "dataSize": len(partition),
            "localAccuracy": local_accuracy,
            "localLoss": local_loss,
            "localF1": local_f1,
            "trainingTime": training_time,
            "updatedAt": now,
        }

    @staticmethod
    def _aggregate_client_metrics(
        client_updates: list[dict[str, Any]],
    ) -> tuple[float, float, float]:
        if not client_updates:
            return 0.0, 1.0, 0.0

        total_weight = sum(u["dataSize"] for u in client_updates)
        if total_weight <= 0:
            total_weight = 1

        global_accuracy = sum(
            u["localAccuracy"] * u["dataSize"] for u in client_updates
        ) / total_weight
        global_loss = sum(u["localLoss"] * u["dataSize"] for u in client_updates) / total_weight
        global_f1 = sum(u["localF1"] * u["dataSize"] for u in client_updates) / total_weight

        return float(global_accuracy), float(global_loss), float(global_f1)

    def simulate_round(self) -> dict[str, Any]:
        if self.current_round >= self.total_rounds:
            self.status = "idle"
            return self.get_metrics()

        self.status = "training"
        round_number = self.current_round + 1

        random.seed(42 + round_number)
        participating_ids = list(self._CLIENT_IDS)
        if len(participating_ids) > 1 and random.random() < 0.35:
            idle_id = random.choice(participating_ids)
            participating_ids.remove(idle_id)

        idle_ids = set(self._CLIENT_IDS) - set(participating_ids)
        for cid in idle_ids:
            self.clients[cid]["status"] = "idle"

        client_updates: list[dict[str, Any]] = []
        total_training_time = 0.0

        for cid in participating_ids:
            upd = self._train_local_client(cid, round_number)
            client_updates.append(upd)
            total_training_time += float(upd.get("trainingTime", 0))

        self.global_accuracy, self.global_loss, self.global_f1 = (
            self._aggregate_client_metrics(client_updates)
        )

        aggregated_hamming = float(self.global_loss)

        self.current_round = round_number
        self.model_version = f"v-fl-{self.current_round}.0"

        participating_names = [
            next(c["name"] for c in self.clients.values() if c["id"] == u["clientId"])
            for u in client_updates
        ]

        round_entry = {
            "round": round_number,
            "timestamp": self._now(),
            "loss": round(float(self.global_loss), 6),
            "accuracy": round(float(self.global_accuracy), 6),
            "clientsParticipated": len(participating_ids),
            "trainingTime": int(round(total_training_time)),
            "f1": round(float(self.global_f1), 6),
            "hammingLoss": round(aggregated_hamming, 6),
            "aggregationMethod": "FedAvg-weighted-client-metrics",
            "participatingClients": participating_names,
        }
        self.rounds.append(round_entry)
        self.rounds = self.rounds[-10:]

        self.status = "training" if self.current_round < self.total_rounds else "idle"

        return self.get_metrics()

    def get_metrics(self) -> dict[str, Any]:
        active_clients = sum(
            1
            for c in self.clients.values()
            if c.get("status") in ("active", "training")
        )

        clients_list = [self.clients[cid] for cid in self._CLIENT_IDS]

        return {
            "clients": clients_list,
            "rounds": list(self.rounds),
            "globalModel": {
                "status": self.status,
                "currentRound": self.current_round,
                "totalRounds": self.total_rounds,
                "aggregatedAt": self._now(),
                "modelVersion": self.model_version,
                "totalClients": len(self.clients),
                "activeClients": active_clients,
                "accuracy": round(self.global_accuracy, 6),
                "loss": round(self.global_loss, 6),
                "f1": round(self.global_f1, 6),
                "aggregationMethod": "FedAvg-weighted-client-metrics",
                "dataset": "GoEmotions 7-label coarse emotion dataset",
                "privacyNote": "Raw client text remains in local virtual partitions; only metrics are aggregated.",
            },
        }

    def reset(self) -> None:
        """Reset simulated FL state; reload partition and vectorizer (same seed -> same splits if data unchanged)."""
        self.current_round = 0
        self.rounds.clear()
        self.global_accuracy = 0.0
        self.global_loss = 1.0
        self.global_f1 = 0.0
        self.model_version = "v-fl-0.0"
        self.status = "idle"
        self._reload_from_disk()
