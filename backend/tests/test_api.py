import os

os.environ["DATABASE_PATH"] = "/tmp/campus-qa-test.db"
os.environ["UPLOAD_DIR"] = "/tmp/campus-qa-test-uploads"
os.environ["DATA_DIR"] = "/tmp/campus-qa-test-data"
os.environ["KNOWLEDGE_BASE_DIR"] = "/tmp/campus-qa-test-kb"
os.environ["APP_SECRET"] = "test-secret"
os.environ["DASHSCOPE_API_KEY"] = "test-fake-key"
os.environ["DASHSCOPE_BASE_URL"] = "https://test.dashscope.example.com"
os.environ["LLM_BASE_URL"] = "https://test.dashscope.example.com/compatible-mode/v1"

from unittest.mock import MagicMock, patch

import json

import numpy as np

# 在导入 app 前 patch openai.OpenAI，让 RAG 引擎使用 fake 客户端
cache: dict[str, np.ndarray] = {}


def _fake_encode(texts: list[str]) -> np.ndarray:
    """基于字符哈希生成伪嵌入，让语义相近（共享汉字）的文本相似度更高。"""
    dim = 1024
    vecs = []
    for text in texts:
        if text not in cache:
            v = np.zeros(dim, dtype=np.float32)
            for i, ch in enumerate(text):
                v[hash(ch) % dim] += 1.0
                if i + 1 < len(text):
                    v[hash(text[i : i + 2]) % dim] += 1.5
            norm = np.linalg.norm(v)
            if norm > 0:
                v = v / norm
            cache[text] = v
        vecs.append(cache[text])
    return np.stack(vecs)


def _fake_openai_client(*args, **kwargs):
    """模拟 OpenAI 兼容客户端，用于 LlamaIndex OpenAIEmbedding / OpenAI LLM。"""
    client = MagicMock()

    def _fake_embeddings_create(input, model, **kwargs):
        if isinstance(input, str):
            input = [input]
        embeddings = []
        for text in input:
            vec = _fake_encode([text])[0].tolist()
            embeddings.append(MagicMock(embedding=vec))
        return MagicMock(data=embeddings)

    def _fake_chat_completions_create(*args, **kwargs):
        messages = kwargs.get("messages", [])
        stream = kwargs.get("stream", False)
        content = "宿舍门禁时间为晚上十一点。晚归需向辅导员报备。"
        for msg in messages:
            if msg.get("role") == "user":
                user_text = str(msg.get("content", ""))
                if "校训" in user_text or "河海大学" in user_text:
                    content = (
                        "河海大学的校训是：艰苦朴素、实事求是、严格要求、勇于探索。"
                    )
                break
        if stream:

            def _gen():
                for ch in content:
                    delta = MagicMock(content=ch, role="assistant")
                    yield MagicMock(choices=[MagicMock(delta=delta)])

            return _gen()
        return MagicMock(choices=[MagicMock(message=MagicMock(content=content))])

    client.embeddings.create = _fake_embeddings_create
    client.chat.completions.create = _fake_chat_completions_create
    return client


_openai_patch = patch("openai.OpenAI", _fake_openai_client)
_openai_patch.start()

from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402
from app.rag_engine_v2 import HHURAGEngine  # noqa: E402


def setup_function() -> None:
    if settings.database_path.exists():
        settings.database_path.unlink()
    storage_dir = settings.data_dir / "llama_index_storage"
    if storage_dir.exists():
        import shutil

        shutil.rmtree(storage_dir)
    HHURAGEngine._instance = None
    cache.clear()


def teardown_module(module) -> None:
    _openai_patch.stop()


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _decode_sse_answer(text: str) -> str:
    """从 SSE 响应体中拼接出 AI 回答文本。"""
    parts = []
    for line in text.splitlines():
        if line.startswith("data: ") and '"text"' in line:
            try:
                parts.append(json.loads(line[len("data: ") :]).get("text", ""))
            except json.JSONDecodeError:
                continue
    return "".join(parts)


def _decode_sse_meta(text: str) -> dict:
    for line in text.splitlines():
        if line.startswith("data: ") and '"sources"' in line:
            return json.loads(line[len("data: ") :])
    return {}


def test_full_rag_flow() -> None:
    with TestClient(app) as client:
        login = client.post(
            "/api/auth/login",
            json={"email": "admin@campus.example", "password": "admin123"},
        )
        assert login.status_code == 200
        admin_token = login.json()["token"]

        upload = client.post(
            "/api/documents",
            headers=auth_header(admin_token),
            data={"title": "宿舍管理规定"},
            files={
                "file": (
                    "dorm.md",
                    "宿舍门禁时间为晚上十一点。晚归需向辅导员报备。",
                    "text/markdown",
                )
            },
        )
        assert upload.status_code == 201
        assert upload.json()["status"] == "READY"
        assert upload.json()["chunk_count"] > 0

        reprocessed = client.post(
            f"/api/documents/{upload.json()['id']}/reprocess",
            headers=auth_header(admin_token),
        )
        assert reprocessed.status_code == 200
        assert reprocessed.json()["status"] == "READY"

        first_guest = client.post("/api/auth/guest")
        second_guest = client.post("/api/auth/guest")
        assert first_guest.status_code == 200
        assert second_guest.status_code == 200
        assert first_guest.json()["user"]["id"] != second_guest.json()["user"]["id"]
        assert (
            first_guest.json()["user"]["email"] != second_guest.json()["user"]["email"]
        )

        register = client.post(
            "/api/auth/register",
            json={
                "name": "测试学生",
                "email": "student@example.com",
                "password": "123456",
            },
        )
        assert register.status_code == 201
        student_token = register.json()["token"]

        forbidden = client.get("/api/documents", headers=auth_header(student_token))
        assert forbidden.status_code == 403

        chat = client.post(
            "/api/chat/stream",
            headers=auth_header(student_token),
            json={"question": "宿舍几点关门？"},
        )
        assert chat.status_code == 200
        answer = _decode_sse_answer(chat.text)
        assert "宿舍门禁时间" in answer
        meta = _decode_sse_meta(chat.text)
        assert isinstance(meta.get("conversation_id"), int)

        history = client.get("/api/conversations", headers=auth_header(student_token))
        assert history.status_code == 200
        assert len(history.json()) == 1

        conversation_id = history.json()[0]["id"]
        assert meta["conversation_id"] == conversation_id
        detail = client.get(
            f"/api/conversations/{conversation_id}",
            headers=auth_header(student_token),
        )
        assert len(detail.json()["messages"]) == 2

        deleted = client.delete(
            f"/api/conversations/{conversation_id}",
            headers=auth_header(student_token),
        )
        assert deleted.status_code == 204
