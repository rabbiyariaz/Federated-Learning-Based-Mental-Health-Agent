# ml/base.py
from abc import ABC, abstractmethod

class BaseModel(ABC):
    name: str

    @abstractmethod
    def load(self):
        pass

    @abstractmethod
    def predict(self, text: str) -> dict:
        pass
