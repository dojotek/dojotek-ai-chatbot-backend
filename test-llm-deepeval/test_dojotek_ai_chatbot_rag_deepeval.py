import os
import yaml
import pytest
import httpx

from deepeval.test_case import LLMTestCase
from deepeval.metrics import (
    AnswerRelevancyMetric,
    ContextualPrecisionMetric,
    FaithfulnessMetric,
    ContextualRecallMetric,
    ContextualRelevancyMetric,
)
from deepeval import evaluate


# Environment variables
LLM_JUDGE_MODEL = os.getenv("LLM_JUDGE_MODEL", "gpt-4o")
BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")
LOGIN_EMAIL = os.getenv("LOGIN_EMAIL", "<ReplaceThis>")
LOGIN_PASSWORD = os.getenv("LOGIN_PASSWORD", "<ReplaceThis>")

DOJOTEK_AI_CHAT_AGENT_ID = os.getenv(
    "DOJOTEK_AI_CHAT_AGENT_ID",
    "019984b5-b039-7253-9af2-ba1361674af9",
)
DOJOTEK_AI_KNOWLEDGE_FILE_ID = os.getenv(
    "DOJOTEK_AI_KNOWLEDGE_FILE_ID",
    "019984a9-53b1-7c60-947c-498c69d1b53e",
)


@pytest.fixture(scope="module")
def auth_token():
    assert LOGIN_EMAIL and LOGIN_PASSWORD, "Set env LOGIN_EMAIL dan LOGIN_PASSWORD"
    url = f"{BASE_URL}/auth/sign-in"
    payload = {"email": LOGIN_EMAIL, "password": LOGIN_PASSWORD}

    resp = httpx.post(url, json=payload, timeout=30.0)
    resp.raise_for_status()
    data = resp.json()
    token = data.get("access_token") or data.get("token") or data.get("jwt")
    assert token, f"Response tidak mengandung token. Dapat: {data}"
    return token


@pytest.fixture(scope="module", autouse=True)
def _login_once(auth_token):
    # Ensure login happens first
    pass


def _load_samples_from_yaml(default_samples):
    samples = default_samples
    try:
        current_dir = os.path.dirname(__file__)
        dataset_path = os.path.join(
            current_dir, "dojotek-ai-chatbot-rag-deepeval-dataset.yaml"
        )
        if os.path.exists(dataset_path):
            with open(dataset_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
                file_samples = data.get("samples") or []
                if isinstance(file_samples, list) and file_samples:
                    validated = []
                    for item in file_samples:
                        if isinstance(item, dict) and "query" in item:
                            validated.append(
                                {
                                    "query": str(item["query"]),
                                    # expected/reference is optional for deepeval
                                    "reference": (
                                        str(item.get("reference"))
                                        if item.get("reference") is not None
                                        else None
                                    ),
                                }
                            )
                    if validated:
                        samples = validated
    except Exception:
        # Fallback to inline samples if YAML not available/invalid
        pass
    return samples


@pytest.mark.asyncio
async def test_deepeval_rag_metrics(auth_token):
    assert BASE_URL, "Set env BASE_URL"
    assert DOJOTEK_AI_KNOWLEDGE_FILE_ID, "Set env DOJOTEK_AI_KNOWLEDGE_FILE_ID"
    assert DOJOTEK_AI_CHAT_AGENT_ID, "Set env DOJOTEK_AI_CHAT_AGENT_ID"

    default_samples = []

    samples = _load_samples_from_yaml(default_samples)

    # Prepare metrics with minimal threshold 0.8
    answer_relevancy = AnswerRelevancyMetric(threshold=0.8, model=LLM_JUDGE_MODEL)
    contextual_precision = ContextualPrecisionMetric(threshold=0.8, model=LLM_JUDGE_MODEL)
    faithfulness = FaithfulnessMetric(threshold=0.8, model=LLM_JUDGE_MODEL)
    contextual_recall = ContextualRecallMetric(threshold=0.8, model=LLM_JUDGE_MODEL)
    contextual_relevancy = ContextualRelevancyMetric(threshold=0.8, model=LLM_JUDGE_MODEL)

    test_cases = []

    async with httpx.AsyncClient(
        base_url=BASE_URL,
        timeout=30.0,
        headers={
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json",
        },
    ) as aclient:
        for s in samples:
            query = s["query"]
            expected = s.get("reference")

            # Retrieve contexts from Knowledge File playground
            resp = await aclient.post(
                "/knowledge-files/playground",
                json={
                    "query": query,
                    "knowledgeFileId": DOJOTEK_AI_KNOWLEDGE_FILE_ID,
                },
            )
            resp.raise_for_status()
            kf_data = resp.json()
            file_chunks = kf_data.get("fileChunks") or []
            retrieved_contexts = [
                (chunk.get("content") or "")
                for chunk in file_chunks
                if isinstance(chunk, dict)
            ]

            # Generate answer from Chat Agent playground
            resp = await aclient.post(
                "/chat-agents/playground",
                json={
                    "query": query,
                    "chatAgentId": DOJOTEK_AI_CHAT_AGENT_ID,
                },
            )
            resp.raise_for_status()
            ca_data = resp.json()
            response_text = ca_data.get("answer") or ""

            test_case = LLMTestCase(
                input=query,
                actual_output=response_text,
                retrieval_context=retrieved_contexts,
                expected_output=expected,
            )
            test_cases.append(test_case)

    # Run deepeval with selected metrics
    evaluate(
        test_cases,
        metrics=[
            answer_relevancy,
            contextual_precision,
            faithfulness,
            contextual_recall,
            contextual_relevancy,
        ],
    )


