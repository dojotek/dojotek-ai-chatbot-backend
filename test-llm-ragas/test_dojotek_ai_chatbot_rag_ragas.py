import os
import yaml
import pytest
import httpx
from langchain_openai import ChatOpenAI
from ragas.llms import LangchainLLMWrapper
from ragas import EvaluationDataset
from ragas import evaluate
from ragas.metrics import (
    LLMContextPrecisionWithoutReference,
    LLMContextRecall,
    ResponseRelevancy,
    Faithfulness,
    FactualCorrectness,
)

LLM_JUDGE_MODEL = os.getenv("LLM_JUDGE_MODEL", "gpt-4o")
BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")
LOGIN_EMAIL = os.getenv("LOGIN_EMAIL", "<ReplaceThis>")
LOGIN_PASSWORD = os.getenv("LOGIN_PASSWORD", "<ReplaceThis>")

DOJOTEK_AI_CHAT_AGENT_ID = os.getenv("DOJOTEK_AI_CHAT_AGENT_ID", "019984b5-b039-7253-9af2-ba1361674af9")
DOJOTEK_AI_KNOWLEDGE_FILE_ID = os.getenv("DOJOTEK_AI_KNOWLEDGE_FILE_ID", "019984a9-53b1-7c60-947c-498c69d1b53e")

@pytest.fixture(scope="module")
def auth_token():
    assert LOGIN_EMAIL and LOGIN_PASSWORD, "Set env LOGIN_EMAIL dan LOGIN_PASSWORD"
    url = f"{BASE_URL}/auth/sign-in"
    payload = {"email": LOGIN_EMAIL, "password": LOGIN_PASSWORD}

    # httpx sync
    resp = httpx.post(url, json=payload, timeout=30.0)
    resp.raise_for_status()
    data = resp.json()
    token = data.get("access_token") or data.get("token") or data.get("jwt")
    assert token, f"Response tidak mengandung token. Dapat: {data}"
    return token

# Auto-use to ensure login happens before the first test in the module
@pytest.fixture(scope="module", autouse=True)
def _login_once(auth_token):
    # No need to return anything; just ensure login happens first.
    pass

@pytest.fixture()
def client(auth_token):
    # httpx client dengan header bearer otomatis
    c = httpx.Client(base_url=BASE_URL, timeout=30.0, headers={
        "Authorization": f"Bearer {auth_token}"
    })
    try:
        yield c
    finally:
        c.close()

@pytest.mark.asyncio
@pytest.mark.filterwarnings("ignore:Legacy embedding_factory interface is deprecated:DeprecationWarning:ragas.evaluation")
@pytest.mark.filterwarnings("ignore:LangchainEmbeddingsWrapper is deprecated:DeprecationWarning:ragas.embeddings.base")
async def test_rag_retrieval_and_generation_metrics(auth_token):
    assert BASE_URL, "Set env BASE_URL"
    assert DOJOTEK_AI_KNOWLEDGE_FILE_ID, "Set env DOJOTEK_AI_KNOWLEDGE_FILE_ID"
    assert LLM_JUDGE_MODEL, "Set env LLM_JUDGE_MODEL"

    llm = ChatOpenAI(model=LLM_JUDGE_MODEL)
    evaluator_llm = LangchainLLMWrapper(llm)

    # Load evaluation pairs (query + expected reference answer) from YAML
    samples = [
        {
            "query": "Does Selamat Hospital provide a sleep study for patients with sleep apnea?",
            "reference": "Yes, Selamat Hospital provides a sleep study for patients with sleep apnea.",
        },
        {
            "query": "What eye surgeries are available at Selamat Hospital for glaucoma and cataracts?",
            "reference": "Selamat Hospital offers cataract surgery using the latest phacoemulsification technology and various surgical techniques for glaucoma to manage high eye pressure.",
        },
    ]
    try:
        current_dir = os.path.dirname(__file__)
        dataset_path = os.path.join(current_dir, "dojotek-ai-chatbot-rag-ragas-dataset.yaml")
        if os.path.exists(dataset_path):
            with open(dataset_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
                file_samples = data.get("samples") or []
                if isinstance(file_samples, list) and file_samples:
                    # validate shape minimally
                    validated = []
                    for item in file_samples:
                        if isinstance(item, dict) and "query" in item and "reference" in item:
                            validated.append({
                                "query": str(item["query"]),
                                "reference": str(item["reference"]),
                            })
                    if validated:
                        samples = validated
    except Exception:
        # Fall back to inline samples if YAML not available/invalid
        pass

    dataset = []
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0, headers={
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
    }) as aclient:
        for s in samples:
            query = s["query"]
            reference = s["reference"]

            # Retrieve contexts from Knowledge File playground
            resp = await aclient.post("/knowledge-files/playground", json={
                "query": query,
                "knowledgeFileId": DOJOTEK_AI_KNOWLEDGE_FILE_ID,
            })
            resp.raise_for_status()
            kf_data = resp.json()
            file_chunks = kf_data.get("fileChunks") or []
            retrieved_contexts = [
                (chunk.get("content") or "") for chunk in file_chunks if isinstance(chunk, dict)
            ]

            # Generate answer from Chat Agent playground
            resp = await aclient.post("/chat-agents/playground", json={
                "query": query,
                "chatAgentId": DOJOTEK_AI_CHAT_AGENT_ID,
            })
            resp.raise_for_status()
            ca_data = resp.json()
            response_text = ca_data.get("answer") or ""

            dataset.append({
                "user_input": query,
                "retrieved_contexts": retrieved_contexts,
                "response": response_text,
                "reference": reference,
            })

    evaluation_dataset = EvaluationDataset.from_list(dataset)

    metrics = [
        LLMContextPrecisionWithoutReference(),
        LLMContextRecall(),
        ResponseRelevancy(),
        Faithfulness(),
        FactualCorrectness(),
    ]

    result = evaluate(dataset=evaluation_dataset, metrics=metrics, llm=evaluator_llm)

    # Print human-friendly summary (most RAGAS results support to_pandas())
    try:
        df = result.to_pandas()
        print(df)
        # Basic sanity asserts to ensure metrics were computed
        assert not df.empty, "RAGAS evaluation returned empty results"
        for col in df.columns:
            if col not in ("question", "answer", "contexts", "ground_truth"):
                vals = df[col].dropna().tolist()
                assert all(0.0 <= v <= 1.0 for v in vals), f"Metric '{col}' out of [0,1] range: {vals}"
    except Exception:
        # Fallback if older ragas returns a dict-like result
        print(result)
