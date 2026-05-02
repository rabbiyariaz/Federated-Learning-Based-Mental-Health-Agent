"""
Data-driven simulated federated learning HTTP API.

This stack runs virtual FL clients on a single backend process using the local
emotion_dataset JSONL (no distribution of checkpoints). Responses expose only
aggregate metrics and client stats—never raw partitioned text payloads.
"""

from fastapi import APIRouter

from ml.services.federated_goemotions_service import FederatedGoEmotionsService

router = APIRouter(prefix="/api/federated", tags=["federated-learning"])

fl_service = FederatedGoEmotionsService()


@router.get("/metrics")
def get_metrics():
    """Read-only snapshot of current FL simulation state (clients, rounds, global model)."""
    return fl_service.get_metrics()


@router.post("/rounds/simulate")
def simulate_round():
    """Advance the simulation by exactly one federated round (if not already at total rounds)."""
    return fl_service.simulate_round()


@router.get("/clients")
def list_clients():
    """Virtual participant metadata only (no training text leakage)."""
    return {"clients": fl_service.get_metrics()["clients"]}


@router.get("/rounds")
def list_rounds():
    """Historical round aggregates (weighted client-metric federation)."""
    return {"rounds": fl_service.get_metrics()["rounds"]}


@router.post("/reset")
def reset_simulation():
    fl_service.reset()
    return {
        "message": "Federated learning simulation reset successfully.",
        "metrics": fl_service.get_metrics(),
    }
