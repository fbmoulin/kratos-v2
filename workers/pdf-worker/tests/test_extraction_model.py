import pytest
from pydantic import ValidationError

from src.models.extraction import ExtractionResult, TableData


def test_valid_extraction_result():
    result = ExtractionResult(
        text="Trata-se de acao de cobranca...",
        tables=[TableData(headers=["Valor", "Data"], rows=[["1000", "2026-01-01"]])],
        images=[],
        metadata={"pages": 3, "method": "hybrid"},
    )
    assert result.text.startswith("Trata-se")
    assert len(result.tables) == 1
    assert result.metadata["pages"] == 3


def test_extraction_result_requires_text():
    with pytest.raises(ValidationError):
        ExtractionResult(text="", tables=[], images=[], metadata={})


def test_extraction_result_defaults():
    result = ExtractionResult(text="Some content")
    assert result.tables == []
    assert result.images == []
    assert result.metadata == {}


def test_extraction_to_dict():
    result = ExtractionResult(text="content", metadata={"pages": 1})
    d = result.model_dump()
    assert d["text"] == "content"
    assert isinstance(d["metadata"], dict)
