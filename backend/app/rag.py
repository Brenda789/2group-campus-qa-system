from io import BytesIO
from pathlib import Path

from docx import Document as DocxDocument
from pypdf import PdfReader


def extract_text(data: bytes, filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix in {".txt", ".md"}:
        return data.decode("utf-8", errors="ignore")
    if suffix == ".pdf":
        reader = PdfReader(BytesIO(data))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    if suffix == ".docx":
        document = DocxDocument(BytesIO(data))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)
    raise ValueError("仅支持 TXT、Markdown、PDF 和 DOCX 文件")
