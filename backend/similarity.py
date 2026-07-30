"""유사 사업기회 검색 엔진.

기본: 로컬 임베딩 모델(sentence-transformers, intfloat/multilingual-e5-small)로
의미 기반 코사인 유사도를 계산한다. 패키지·모델이 없는 환경에서는 서버를 죽이지
않고 pure-Python TF-IDF 코사인으로 자동 폴백한다(응답 method 필드로 구분).

설치(선택):  pip install sentence-transformers
최초 실행 시 모델(~120MB)이 자동 다운로드된다.
"""
import math
import re

MODEL_NAME = "intfloat/multilingual-e5-small"

# "관련 있음"으로 볼 최소 유사도 — 점수 스케일이 방식마다 다르다
# (e5 코사인은 0.7대에 몰리고, TF-IDF는 어휘가 다르면 0.0x대)
RELATED_FLOOR = {"embedding": 0.80, "tfidf": 0.02}

_model = None
_model_failed = False
_emb_cache = {}  # passage 텍스트 → 임베딩 (서버 프로세스 수명 동안 유지)


def _get_model():
    global _model, _model_failed
    if _model is None and not _model_failed:
        try:
            from sentence_transformers import SentenceTransformer

            _model = SentenceTransformer(MODEL_NAME)
        except Exception:
            _model_failed = True
    return _model


def _rank_embedding(model, query, docs):
    # e5 계열은 query/passage 프리픽스를 붙여야 학습 분포와 일치한다
    missing = [d for d in docs if d not in _emb_cache]
    if missing:
        vecs = model.encode([f"passage: {d}" for d in missing], normalize_embeddings=True)
        for d, v in zip(missing, vecs):
            _emb_cache[d] = v
    q = model.encode([f"query: {query}"], normalize_embeddings=True)[0]
    scores = [(i, float(sum(a * b for a, b in zip(q, _emb_cache[d])))) for i, d in enumerate(docs)]
    return sorted(scores, key=lambda x: -x[1])


def _tokens(text):
    """한국어는 조사·복합어 때문에 단어 토큰만으로 약하다 — 단어 + 음절 2-gram 병용."""
    words = re.findall(r"[가-힣a-z0-9]+", str(text).lower())
    out = list(words)
    for w in words:
        if re.match(r"[가-힣]", w) and len(w) >= 2:
            out.extend(w[i : i + 2] for i in range(len(w) - 1))
    return out


def _rank_tfidf(query, docs):
    doc_tokens = [_tokens(d) for d in docs]
    n = len(docs)
    df = {}
    for toks in doc_tokens:
        for t in set(toks):
            df[t] = df.get(t, 0) + 1
    idf = {t: math.log((n + 1) / (c + 0.5)) for t, c in df.items()}

    def vec(toks):
        tf = {}
        for t in toks:
            tf[t] = tf.get(t, 0) + 1
        v = {t: c * idf.get(t, math.log(n + 1)) for t, c in tf.items()}
        norm = math.sqrt(sum(x * x for x in v.values())) or 1.0
        return {t: x / norm for t, x in v.items()}

    qv = vec(_tokens(query))
    scores = []
    for i, toks in enumerate(doc_tokens):
        dv = vec(toks)
        scores.append((i, sum(qv[t] * dv[t] for t in qv.keys() & dv.keys())))
    return sorted(scores, key=lambda x: -x[1])


def rank(query, docs):
    """docs 각각에 대한 (index, 유사도 0~1) 내림차순 목록과 사용 방식을 반환."""
    if not docs:
        return "tfidf", []
    model = _get_model()
    if model is not None:
        try:
            return "embedding", _rank_embedding(model, query, docs)
        except Exception:
            pass
    return "tfidf", _rank_tfidf(query, docs)
