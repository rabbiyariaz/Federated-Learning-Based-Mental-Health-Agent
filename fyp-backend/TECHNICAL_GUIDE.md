# Backend Technical Guide

## Architecture Overview
FastAPI-based REST API serving ML inference for mental health monitoring. Uses PyTorch models (DAIC-PHQ8, GoEmotions) for emotion detection and depression screening via PHQ-8 scoring.

## Core Components

### Application Layer (`app/`)
- **main.py**: FastAPI app with CORS, routes `/health`, `/predict`, and router includes
- **schemas.py**: Pydantic models (`EMARequest`, `PHQRequest`) for request validation
- **database.py**: (Empty) Database layer placeholder

### Router Layer (`app/routers/`)
- **chat.py**: `/chat` endpoint using `RAGService` for knowledge-based responses
- **phq.py**: `/phq` endpoint for PHQ-8 questionnaire scoring (sums responses)
- **ema.py**: `/ema` endpoint for Ecological Momentary Assessment entries
- **report.py**: `/report` endpoint returning mock metrics (PHQ change, EMA completion)

### ML Services (`ml/services/`)
- **InferenceService**: Orchestrates model loading and prediction
  - Singleton pattern: loads `GoEmotionsModel` (emotion) and `DAICModel` (PHQ-8) on init
  - `run(text)` returns emotion classification + PHQ-8 score/probability/binary
- **RAGService**: Retrieval-Augmented Generation for chat responses
  - `retrieve_context(query)`: Keyword-based chunk retrieval from knowledge base
  - Scores chunks by keyword matches, returns top 3 (max 1200 chars)

### ML Models (`ml/`)
- **base.py**: Abstract `BaseModel` with `load()` and `predict(text)` interface
- **config.py**: `ModelConfig` class with paths, hyperparameters, device settings
- **daic_model.py**: `DAICModel` wrapper implementing `BaseModel`
- **goemotions_model.py**: `GoEmotionsModel` wrapper implementing `BaseModel`

### Model Implementations
- **daic.py**: DAIC-WOZ PHQ-8 depression screening model
  - `DistilBertMultiTaskWithAggregator`: Neural architecture with BiLSTM session aggregator
  - `load_daic()`: Loads checkpoint, tokenizer (singleton pattern)
  - `predict_phq(text)`: Splits into utterances, encodes, aggregates, returns score (0-24), binary, probability
- **goemotions.py**: GoEmotions emotion classification
  - `predict_emotion(text)`: Returns top emotion + sorted probability distribution
  - Uses HuggingFace `AutoModelForSequenceClassification`

## Data Flow
1. Client → FastAPI endpoint (e.g., `/predict`)
2. Router → Service layer (`InferenceService`)
3. Service → Model wrappers (`DAICModel`, `GoEmotionsModel`)
4. Models → Core prediction functions (`predict_phq`, `predict_emotion`)
5. Response → JSON with scores/probabilities

## Model Storage
- `models/daic_multitask_results/`: DAIC checkpoints (`.pt` files)
- `models/emotion/goemotions/`: GoEmotions model files (HuggingFace format)
- `ml/rag/data/knowledge_base.txt`: RAG knowledge base (chunked text)

## Key Classes Summary
- **InferenceService**: Central service managing model lifecycle and inference
- **RAGService**: Simple keyword-based retrieval for chat context
- **DistilBertMultiTaskWithAggregator**: Multi-task neural network (emotion + PHQ regression/binary)
- **ModelConfig**: Centralized configuration (paths, hyperparameters, device)

