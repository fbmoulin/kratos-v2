from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class TableData(BaseModel):
    headers: List[str] = Field(default_factory=list)
    rows: List[List[str]] = Field(default_factory=list)
    page: Optional[int] = None


class ImageData(BaseModel):
    page: int
    description: Optional[str] = None


class ExtractionResult(BaseModel):
    text: str = Field(..., min_length=1)
    tables: List[TableData] = Field(default_factory=list)
    images: List[ImageData] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
