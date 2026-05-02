from __future__ import annotations

import json
from pathlib import Path

from datasets import load_dataset


coarse_mapping = {
    "anger": ["anger", "annoyance", "disapproval"],
    "disgust": ["disgust"],
    "fear": ["fear", "nervousness"],
    "joy": [
        "joy",
        "amusement",
        "approval",
        "excitement",
        "gratitude",
        "love",
        "optimism",
        "relief",
        "pride",
        "admiration",
        "desire",
        "caring",
    ],
    "sadness": ["sadness", "disappointment", "embarrassment", "grief", "remorse"],
    "surprise": ["surprise", "realization", "confusion", "curiosity"],
    "neutral": ["neutral"],
}

coarse_order = ["anger", "disgust", "fear", "joy", "sadness", "surprise", "neutral"]


def build_fine_to_coarse_index(all_label_names: list[str]) -> dict[int, list[int]]:
    """Map each fine-grained label index to one or more coarse label indices."""
    fine_name_to_idx = {name: idx for idx, name in enumerate(all_label_names)}
    coarse_name_to_idx = {name: idx for idx, name in enumerate(coarse_order)}

    fine_to_coarse: dict[int, list[int]] = {}
    for coarse_name, fine_names in coarse_mapping.items():
        coarse_idx = coarse_name_to_idx[coarse_name]
        for fine_name in fine_names:
            if fine_name in fine_name_to_idx:
                fine_idx = fine_name_to_idx[fine_name]
                fine_to_coarse.setdefault(fine_idx, []).append(coarse_idx)
    return fine_to_coarse


def to_coarse_multihot(fine_label_indices: list[int], fine_to_coarse: dict[int, list[int]]) -> list[int]:
    coarse = [0] * len(coarse_order)
    for fine_idx in fine_label_indices:
        for coarse_idx in fine_to_coarse.get(fine_idx, []):
            coarse[coarse_idx] = 1
    return coarse


def main() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    data_dir = backend_root / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    output_jsonl = data_dir / "emotion_dataset.jsonl"
    output_label_names = data_dir / "emotion_label_names.json"

    dataset = load_dataset("go_emotions")
    all_label_names = dataset["train"].features["labels"].feature.names
    fine_to_coarse = build_fine_to_coarse_index(all_label_names)

    final_rows: list[dict] = []
    stats: dict[str, dict[str, int]] = {}

    for split in ("train", "validation", "test"):
        split_data = dataset[split]
        original_count = len(split_data)
        seen: set[tuple[str, tuple[int, ...]]] = set()
        unique_rows: list[dict] = []
        duplicates_removed = 0

        for i, row in enumerate(split_data):
            text = (row.get("text") or "").strip()
            fine_labels = row.get("labels") or []
            coarse_labels = to_coarse_multihot(fine_labels, fine_to_coarse)
            dedupe_key = (text, tuple(coarse_labels))

            if dedupe_key in seen:
                duplicates_removed += 1
                continue
            seen.add(dedupe_key)

            unique_rows.append(
                {
                    "id": f"gemo_{split}_{len(unique_rows) + 1:06d}",
                    "split": split,
                    "text": text,
                    "labels": coarse_labels,
                }
            )

        final_rows.extend(unique_rows)
        stats[split] = {
            "original": original_count,
            "duplicates_removed": duplicates_removed,
            "final_written": len(unique_rows),
        }

    with output_jsonl.open("w", encoding="utf-8") as f:
        for row in final_rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    with output_label_names.open("w", encoding="utf-8") as f:
        json.dump({"labels": coarse_order}, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print("GoEmotions preprocessing complete.")
    for split in ("train", "validation", "test"):
        print(f"[{split}] original split count: {stats[split]['original']}")
        print(f"[{split}] duplicate rows removed: {stats[split]['duplicates_removed']}")
        print(f"[{split}] final rows written: {stats[split]['final_written']}")
    print(f"Output dataset: {output_jsonl}")
    print(f"Output label names: {output_label_names}")


if __name__ == "__main__":
    main()

