"""Epson Korea MI Platform — FastAPI backend.

설계 단계: Salesforce 실연동 없이 data/sample/*.json을 시드로 하는
인메모리 스토어를 서빙한다. 엑셀 업로드는 스토어에 반영되고(서버 재시작 시
시드로 초기화), Export는 현재 스토어를 Salesforce Data Loader 포맷으로 변환한다.

실행:  uvicorn backend.main:app --reload --port 8000  (저장소 루트에서)
"""
import io
import json
import re
from datetime import date, datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent.parent
SAMPLE_DIR = ROOT / "data" / "sample"
DIST_DIR = ROOT / "frontend" / "dist"

app = FastAPI(title="Epson Korea MI Platform API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["*"],
)


def _load(name: str):
    path = SAMPLE_DIR / f"{name}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"sample data not found: {name}")
    with path.open(encoding="utf-8") as f:
        return json.load(f)


# ── 인메모리 스토어 (시드: data/sample) ─────────────────────────
STORE = {
    "opportunities": _load("opportunities"),
    "accounts": _load("accounts"),
    "sales_plan": _load("sales_plan"),
    "sensing_events": _load("sensing_events"),
}

BUS = {"PRT", "PJT", "RBT", "CMP"}
CHANNELS = {"직판", "총판"}
STAGE_PROB = {s["stage"]: s["probability"] for s in STORE["opportunities"]["stageDefinition"]}


@app.get("/api/opportunities")
def opportunities():
    return STORE["opportunities"]


@app.get("/api/accounts")
def accounts():
    return STORE["accounts"]


@app.get("/api/sales-plan")
def sales_plan():
    return STORE["sales_plan"]


@app.get("/api/sensing-events")
def sensing_events():
    return STORE["sensing_events"]


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ── 승격·상태 변경 저장 ────────────────────────────────────────
@app.post("/api/opportunities")
def create_opportunity(opp: dict):
    opps = STORE["opportunities"]["opportunities"]
    oid = opp.get("opportunityId")
    if not oid or not opp.get("name") or not opp.get("amount"):
        raise HTTPException(status_code=422, detail="opportunityId, name, amount는 필수입니다")
    existing = next((o for o in opps if o["opportunityId"] == oid), None)
    if existing:
        existing.update(opp)
    else:
        opps.append(opp)
    return {"opportunityId": oid, "updated": bool(existing)}


@app.patch("/api/sensing-events/{event_id}")
def update_event(event_id: str, patch: dict):
    allowed = {"status", "promotedOpportunityId", "assignedOwner"}
    ev = next((e for e in STORE["sensing_events"]["events"] if e["eventId"] == event_id), None)
    if not ev:
        raise HTTPException(status_code=404, detail=f"event not found: {event_id}")
    ev.update({k: v for k, v in patch.items() if k in allowed})
    return ev


# ── 엑셀 업로드 (실무 양식 → 스토어 반영) ──────────────────────
# 컬럼명은 excel/sales_pipeline_template.xlsx '사업기회' 시트 헤더와 1:1
OPP_COLS = {
    "사업기회ID": "opportunityId",
    "사업기회명": "name",
    "고객사명": "accountName",
    "사업부": "businessUnit",
    "채널": "channel",
    "파트너사": "partnerAccount",
    "고객유형": "customerSegment",
    "제품군": "productFamily",
    "대표 모델": "productModel",
    "예상 수량": "quantity",
    "예상 금액(원)": "amount",
    "단계": "stage",
    "확도(%)": "probability",
    "예상 수주일": "closeDate",
    "고객 Pain Point": "painPoint",
    "요구 조건(Target Spec)": "targetSpec",
    "Demo·PoC 목표": "demoTargetDate",
    "검증(QUAL) 목표": "qualTargetDate",
    "경쟁사": "competitor",
    "관련 사업기회": "relatedOpportunity",
    "유입 경로": "leadSource",
    "담당 영업": "owner",
    "비고": "description",
}
PLAN_COLS = {"연도": "year", "월": "month", "사업부": "businessUnit", "채널": "channel", "목표 금액(원)": "targetAmount"}
REQUIRED = ["name", "businessUnit", "channel", "stage", "amount", "closeDate"]
DATE_FIELDS = ["closeDate", "demoTargetDate", "qualTargetDate"]


def _to_date(v):
    if v in (None, ""):
        return None
    if isinstance(v, (datetime, date)):
        return v.strftime("%Y-%m-%d")
    s = str(v).strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
        return s
    raise ValueError(f"날짜 형식 오류(YYYY-MM-DD): {v}")


def _next_opp_id(opps):
    mx = 0
    for o in opps:
        m = re.search(r"(\d+)$", o["opportunityId"])
        if m:
            mx = max(mx, int(m.group(1)))
    return f"OPP-2026-{mx + 1:04d}"


def _header_map(ws, col_def):
    headers = [c.value for c in ws[1]]
    return {idx: col_def[h] for idx, h in enumerate(headers) if h in col_def}



# ── 현업 자유양식 엑셀 매핑 (컬럼 유사어·단위·단계 용어·날짜 표기 해석) ──
FIELD_HEADER_SYNONYMS = {
    "name": ["건명", "사업명", "안건", "내용", "프로젝트", "사업기회명"],
    "accountName": ["업체명", "업체", "거래처", "거래처명", "고객사", "고객사명", "고객명", "기관명"],
    "productModel": ["품목/모델", "품목", "모델", "제품", "제품명", "장비"],
    "quantity": ["수량", "대수", "예상 수량"],
    "amount": ["예상금액", "금액", "예상 금액", "수주예상액", "규모", "예상금액(백만원)", "금액(백만)", "예상 금액(원)"],
    "stage": ["진행상태", "상태", "진행", "단계", "진행단계", "진척"],
    "closeDate": ["수주예정", "수주예정일", "납기", "예정일", "수주시기", "예상 수주일"],
    "owner": ["담당", "담당자", "영업담당", "담당 영업"],
    "description": ["비고", "메모", "특이사항", "코멘트"],
}

STAGE_SYNONYMS = [
    (["리드", "발굴", "신규", "타겟"], "리드 발굴"),
    (["상담", "니즈", "미팅", "접촉"], "니즈 파악·상담"),
    (["견적", "제안", "입찰준비"], "제안·견적"),
    (["데모", "demo", "poc", "테스트", "실증", "시연"], "Demo·PoC/테스트"),
    (["협상", "계약대기", "계약검토", "품의"], "협상·계약검토"),
    (["수주", "계약완료", "계약 완료", "낙찰"], "계약 완료(수주)"),
    (["납품완료", "검수", "매출", "완료"], "매출 인식"),
    (["실주", "취소", "드랍", "lost"], "실주(Lost)"),
]

BU_KEYWORDS = [
    # 명시적 프린터 키워드를 먼저 확인 (모델명 부분 문자열 오탐 방지: WF-C879R의 'c8' 등)
    (["복합기", "프린터", "잉크젯", "라벨", "영수증", "mps", "wf-", "tm-", "am-", "cw-"], "PRT"),
    (["프로젝터", "eb-", "빔"], "PJT"),
    (["로봇", "scara", "6축", "gx8", "gx4", "c8xl", "c12xl"], "RBT"),
    (["분말", "헤드", "코어", "precisioncore", "atmix"], "CMP"),
]


def _map_stage(raw):
    s = str(raw).strip().lower()
    for keys, stage in STAGE_SYNONYMS:
        if any(k in s for k in keys):
            return stage
    return None


def _guess_bu(text):
    s = str(text).lower()
    for keys, bu in BU_KEYWORDS:
        if any(k in s for k in keys):
            return bu
    return "PRT"


def _parse_field_amount(v, header=""):
    """'0.9억' / '45,000,000' / 270(백만원 표기·소액 숫자) 등 현업 금액 표기를 원 단위로."""
    if v in (None, ""):
        raise ValueError("금액 누락")
    if isinstance(v, (int, float)):
        n = float(v)
        if "억" in header:
            return int(n * 1e8), None
        if "백만" in header or n < 100000:
            return int(n * 1e6), "금액을 백만원 단위로 해석"
        return int(n), None
    s = str(v).replace(",", "").replace(" ", "").replace("원", "")
    if s.endswith("억"):
        return int(float(s[:-1]) * 1e8), f"'{v}' → 억 단위 해석"
    if s.endswith("백만"):
        return int(float(s[:-2]) * 1e6), f"'{v}' → 백만원 단위 해석"
    if s.endswith("천만"):
        return int(float(s[:-2]) * 1e7), f"'{v}' → 천만원 단위 해석"
    n = float(s)
    if n < 100000:
        return int(n * 1e6), "금액을 백만원 단위로 해석"
    return int(n), None


def _parse_field_date(v):
    """'2026.10.31' / '12/15' / '11월말' / date 셀 등 → YYYY-MM-DD."""
    import calendar
    if v in (None, ""):
        return None, None
    if isinstance(v, (datetime, date)):
        return v.strftime("%Y-%m-%d"), None
    s = str(v).strip().replace(".", "-").replace("/", "-")
    m = re.fullmatch(r"(\d{4})-(\d{1,2})-(\d{1,2})", s)
    if m:
        y, mo, d = map(int, m.groups())
        return f"{y:04d}-{mo:02d}-{d:02d}", None
    m = re.fullmatch(r"(\d{1,2})-(\d{1,2})", s)
    if m:
        mo, d = map(int, m.groups())
        return f"2026-{mo:02d}-{d:02d}", f"'{v}' → 2026년으로 해석"
    m = re.fullmatch(r"(\d{1,2})월\s*(말|초|중순)?", str(v).strip())
    if m:
        mo = int(m.group(1))
        part = m.group(2) or "말"
        d = {"초": 5, "중순": 15}.get(part, calendar.monthrange(2026, mo)[1])
        return f"2026-{mo:02d}-{d:02d}", f"'{v}' → 2026-{mo:02d}-{d:02d}로 해석"
    raise ValueError(f"날짜 해석 불가: {v}")


def _find_field_sheet(wb):
    """유사 컬럼명이 3개 이상 잡히는 헤더 행을 가진 시트를 찾는다 (제목행 허용, 1~5행 탐색)."""
    for ws in wb.worksheets:
        for hr in range(1, min(6, ws.max_row + 1)):
            headers = [str(c.value).strip() if c.value is not None else "" for c in ws[hr]]
            colmap = {}
            for idx, h in enumerate(headers):
                for key, names in FIELD_HEADER_SYNONYMS.items():
                    if h in names and key not in colmap:
                        colmap[idx] = key
            if len(colmap) >= 3 and "name" in colmap.values():
                return ws, hr, colmap
    return None, None, None


STAGING = {}         # batchId → 미리보기(미반영) 배치
UPLOAD_HISTORY = []  # 반영된 배치 (롤백용 undo 스냅샷 포함)


def _parse_workbook(wb, filename):
    """엑셀을 파싱·검증만 하고 변경 예정 내역(미리보기)을 만든다. 스토어는 건드리지 않는다."""
    import uuid

    preview = {
        "batchId": uuid.uuid4().hex[:12],
        "filename": filename,
        "opportunities": {"inserts": [], "updates": []},
        "plan": {"changes": []},
        "errors": [],
    }
    opps = STORE["opportunities"]["opportunities"]
    acc_by_name = {a["accountName"]: a["accountId"] for a in STORE["accounts"]["accounts"]}
    staged_new = 0

    if "사업기회" in wb.sheetnames:
        ws = wb["사업기회"]
        hmap = _header_map(ws, OPP_COLS)
        if "name" not in hmap.values():
            preview["errors"].append({"sheet": "사업기회", "row": 1, "message": "헤더가 양식과 다릅니다 (입력가이드 시트 참조)"})
        else:
            for r, row in enumerate(ws.iter_rows(min_row=2), start=2):
                vals = {hmap[i]: c.value for i, c in enumerate(row) if i in hmap}
                if not any(v not in (None, "") for v in vals.values()):
                    continue  # 빈 행
                try:
                    missing = [k for k in REQUIRED if vals.get(k) in (None, "")]
                    if missing:
                        raise ValueError(f"필수값 누락: {', '.join(missing)}")
                    if vals["businessUnit"] not in BUS:
                        raise ValueError(f"사업부 코드 오류: {vals['businessUnit']} (PRT/PJT/RBT/CMP)")
                    if vals["channel"] not in CHANNELS:
                        raise ValueError(f"채널 오류: {vals['channel']} (직판/총판)")
                    if vals["stage"] not in STAGE_PROB and vals["stage"] != "실주(Lost)":
                        raise ValueError(f"단계 오류: {vals['stage']}")
                    amount = float(str(vals["amount"]).replace(",", ""))
                    for f_ in DATE_FIELDS:
                        vals[f_] = _to_date(vals.get(f_))
                    name = str(vals.get("accountName") or "").strip()
                    rec = {
                        **{v: None for v in OPP_COLS.values()},
                        **{k: (str(v).strip() if isinstance(v, str) else v) for k, v in vals.items()},
                        "amount": int(amount),
                        "quantity": int(vals["quantity"]) if vals.get("quantity") not in (None, "") else None,
                        "probability": int(vals["probability"]) if vals.get("probability") not in (None, "") else STAGE_PROB.get(vals["stage"], 0),
                        "accountId": acc_by_name.get(name),
                        "sensingEventId": None,
                    }
                    rec.pop("accountName", None)
                    oid = str(vals.get("opportunityId") or "").strip()
                    existing = next((o for o in opps if o["opportunityId"] == oid), None) if oid else None
                    if existing:
                        after = {**existing, **{k: v for k, v in rec.items() if k != "opportunityId"}}
                        preview["opportunities"]["updates"].append({"before": dict(existing), "after": after})
                    else:
                        if not oid:
                            # 미리보기 단계에서 확정 채번: 기존 최대 번호 + 이 배치 내 신규 순번
                            staged_new += 1
                            base = int(_next_opp_id(opps).rsplit("-", 1)[1])
                            oid = f"OPP-2026-{base + staged_new - 1:04d}"
                        rec["opportunityId"] = oid
                        preview["opportunities"]["inserts"].append(rec)
                except (ValueError, TypeError) as e:
                    preview["errors"].append({"sheet": "사업기회", "row": r, "message": str(e)})

    if "판매계획" in wb.sheetnames:
        ws = wb["판매계획"]
        hmap = _header_map(ws, PLAN_COLS)
        plan_rows = STORE["sales_plan"]["monthlyPlan"]
        for r, row in enumerate(ws.iter_rows(min_row=2), start=2):
            vals = {hmap[i]: c.value for i, c in enumerate(row) if i in hmap}
            if not any(v not in (None, "") for v in vals.values()):
                continue
            try:
                y, m = int(vals["year"]), int(vals["month"])
                bu, ch = vals["businessUnit"], vals["channel"]
                amt = int(float(str(vals["targetAmount"]).replace(",", "")))
                if bu not in BUS or ch not in CHANNELS or not 1 <= m <= 12:
                    raise ValueError(f"코드값 오류: {bu}/{ch}/{m}월")
                target = next(
                    (p for p in plan_rows if p["year"] == y and p["month"] == m and p["businessUnit"] == bu and p["channel"] == ch),
                    None,
                )
                before = target["targetAmount"] if target else None
                if before == amt:
                    continue  # 변경 없음
                preview["plan"]["changes"].append(
                    {"year": y, "month": m, "businessUnit": bu, "channel": ch, "before": before, "after": amt}
                )
            except (ValueError, TypeError, KeyError) as e:
                preview["errors"].append({"sheet": "판매계획", "row": r, "message": str(e)})

    if "사업기회" not in wb.sheetnames and "판매계획" not in wb.sheetnames:
        # 표준 양식이 아니면 현업 자유양식으로 해석 시도
        ws, hr, colmap = _find_field_sheet(wb)
        if ws is None:
            raise HTTPException(
                status_code=422,
                detail="해석 가능한 시트를 찾지 못했습니다. 표준 양식(사업기회/판매계획 시트) 또는 업체명·건명·금액·진행상태 컬럼이 있는 영업관리 엑셀을 올려주세요.",
            )
        accounts_list = STORE["accounts"]["accounts"]

        def _match_account(raw):
            """정확일치 → 괄호 제거 일치 → 포함 관계 순으로 계정을 찾는다."""
            n = raw.strip()
            strip_paren = lambda s: re.sub(r"\(.*?\)", "", s).strip()
            for a in accounts_list:
                if a["accountName"] == n:
                    return a
            for a in accounts_list:
                if strip_paren(a["accountName"]) == strip_paren(n):
                    return a
            for a in accounts_list:
                if n and (n in a["accountName"] or strip_paren(a["accountName"]) in n):
                    return a
            return None

        staged_new = 0
        for r, row in enumerate(ws.iter_rows(min_row=hr + 1), start=hr + 1):
            vals = {colmap[i]: c.value for i, c in enumerate(row) if i in colmap}
            if not any(v not in (None, "") for v in vals.values()):
                continue
            try:
                name = str(vals.get("name") or "").strip()
                acct = str(vals.get("accountName") or "").strip()
                if not name or not acct:
                    raise ValueError("건명·업체명은 필수입니다")
                notes = []
                header_txt = " ".join(str(c.value) for c in ws[hr] if c.value)
                amount, note = _parse_field_amount(vals.get("amount"), header_txt)
                if note:
                    notes.append(note)
                stage_raw = vals.get("stage")
                stage = _map_stage(stage_raw) if stage_raw not in (None, "") else None
                if stage is None:
                    raise ValueError(f"진행상태 해석 불가: {stage_raw} (예: 견적, 상담중, 데모 예정, 수주)")
                if str(stage_raw).strip() != stage:
                    notes.append(f"단계 '{stage_raw}' → {stage}")
                close, note = _parse_field_date(vals.get("closeDate"))
                if note:
                    notes.append(note)
                if close is None:
                    close = "2026-12-31"
                    notes.append("수주예정 미기재 → 2026-12-31로 가정")
                model = str(vals.get("productModel") or "").strip()
                account = _match_account(acct)
                bu = _guess_bu(f"{model} {name}")
                notes.append(f"사업부 {bu} 추정 (품목 기반)")
                desc_txt = str(vals.get("description") or "")
                partner = None
                if "총판" in desc_txt or "총판" in name:
                    channel = "총판"
                    pm = re.search(r"총판\s*\(([^)]+)\)", desc_txt)
                    if pm:
                        partner = pm.group(1).strip()
                    notes.append(f"비고의 '총판' 언급 → 채널 총판{f' (파트너 {partner})' if partner else ''}")
                elif account:
                    channel = account["channel"]
                    notes.append(f"기존 계정 매칭({account['accountId']}) → 채널 {channel}")
                else:
                    channel = "직판"
                    notes.append("신규 업체 → 채널 직판 가정")
                qty = vals.get("quantity")
                rec = {
                    **{v: None for v in OPP_COLS.values()},
                    "name": f"{acct} {name}" if acct not in name else name,
                    "businessUnit": bu,
                    "channel": channel,
                    "partnerAccount": partner,
                    "customerSegment": account.get("customerSegment") if account else "B2B기업",
                    "productModel": model or None,
                    "productFamily": None,
                    "quantity": int(qty) if qty not in (None, "") else None,
                    "amount": amount,
                    "stage": stage,
                    "probability": STAGE_PROB.get(stage, 0),
                    "closeDate": close,
                    "owner": str(vals.get("owner") or "").strip() or None,
                    "description": str(vals.get("description") or "").strip() or None,
                    "leadSource": "엑셀 업로드",
                    "accountId": account["accountId"] if account else None,
                    "sensingEventId": None,
                }
                rec.pop("accountName", None)
                existing = next(
                    (o for o in STORE["opportunities"]["opportunities"] if o["name"] == rec["name"]), None
                )
                if existing:
                    after = {**existing, **{k: v for k, v in rec.items() if v is not None and k != "opportunityId"}}
                    preview["opportunities"]["updates"].append({"before": dict(existing), "after": after, "mapNotes": notes})
                else:
                    staged_new += 1
                    base = int(_next_opp_id(STORE["opportunities"]["opportunities"]).rsplit("-", 1)[1])
                    rec["opportunityId"] = f"OPP-2026-{base + staged_new - 1:04d}"
                    rec["mapNotes"] = notes
                    preview["opportunities"]["inserts"].append(rec)
            except (ValueError, TypeError) as e:
                preview["errors"].append({"sheet": ws.title, "row": r, "message": str(e)})
        preview["fieldMode"] = True
    return preview


@app.post("/api/upload-excel")
async def upload_excel(file: UploadFile):
    """1단계: 파싱·검증 후 미리보기 반환. [반영]을 눌러야 실제 적용된다."""
    from openpyxl import load_workbook

    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=422, detail="xlsx 파일만 업로드할 수 있습니다")
    try:
        wb = load_workbook(io.BytesIO(await file.read()), data_only=True)
    except Exception:
        raise HTTPException(status_code=422, detail="엑셀 파일을 열 수 없습니다 (양식: sales_pipeline_template.xlsx)")
    preview = _parse_workbook(wb, file.filename)
    STAGING[preview["batchId"]] = preview
    return preview


EDITABLE_FIELDS = {
    "name", "businessUnit", "channel", "partnerAccount", "stage", "probability",
    "amount", "closeDate", "owner", "quantity", "productModel", "description",
}


def _apply_edits(batch, edits):
    """미리보기 화면에서 사용자가 직접 수정한 값을 스테이징 배치에 덮어쓴다."""
    def merge(target, patch):
        for k, v in patch.items():
            if k not in EDITABLE_FIELDS:
                continue
            if k == "businessUnit" and v not in BUS:
                raise HTTPException(status_code=422, detail=f"사업부 코드 오류: {v}")
            if k == "channel" and v not in CHANNELS:
                raise HTTPException(status_code=422, detail=f"채널 오류: {v}")
            if k == "stage" and v not in STAGE_PROB and v != "실주(Lost)":
                raise HTTPException(status_code=422, detail=f"단계 오류: {v}")
            target[k] = v
        if "stage" in patch and "probability" not in patch:
            target["probability"] = STAGE_PROB.get(patch["stage"], 0)

    for e in edits.get("inserts", []):
        rec = next((r for r in batch["opportunities"]["inserts"] if r["opportunityId"] == e.get("opportunityId")), None)
        if rec:
            merge(rec, e)
    for e in edits.get("updates", []):
        u = next((u for u in batch["opportunities"]["updates"] if u["after"]["opportunityId"] == e.get("opportunityId")), None)
        if u:
            merge(u["after"], e)
    dropped = set(edits.get("dropIds", []))
    if dropped:
        batch["opportunities"]["inserts"] = [r for r in batch["opportunities"]["inserts"] if r["opportunityId"] not in dropped]
        batch["opportunities"]["updates"] = [u for u in batch["opportunities"]["updates"] if u["after"]["opportunityId"] not in dropped]


@app.post("/api/upload-apply/{batch_id}")
def upload_apply(batch_id: str, edits: dict | None = None):
    """2단계: 스테이징된 배치를 (사용자 수정분 반영 후) 스토어에 적용하고 히스토리에 기록한다."""
    batch = STAGING.pop(batch_id, None)
    if not batch:
        raise HTTPException(status_code=404, detail="배치를 찾을 수 없습니다 (이미 반영됐거나 만료)")
    if edits:
        _apply_edits(batch, edits)
    opps = STORE["opportunities"]["opportunities"]
    plan_rows = STORE["sales_plan"]["monthlyPlan"]

    for rec in batch["opportunities"]["inserts"]:
        rec = {k: v for k, v in rec.items() if k != "mapNotes"}
        if not any(o["opportunityId"] == rec["opportunityId"] for o in opps):
            opps.append(rec)
    for u in batch["opportunities"]["updates"]:
        target = next((o for o in opps if o["opportunityId"] == u["after"]["opportunityId"]), None)
        if target:
            target.clear()
            target.update(u["after"])
    for c in batch["plan"]["changes"]:
        target = next(
            (p for p in plan_rows if p["year"] == c["year"] and p["month"] == c["month"]
             and p["businessUnit"] == c["businessUnit"] and p["channel"] == c["channel"]),
            None,
        )
        if target:
            target["targetAmount"] = c["after"]
        else:
            plan_rows.append({"year": c["year"], "month": c["month"], "businessUnit": c["businessUnit"],
                              "channel": c["channel"], "targetAmount": c["after"]})

    entry = {
        "batchId": batch["batchId"],
        "filename": batch["filename"],
        "appliedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "counts": {
            "inserted": len(batch["opportunities"]["inserts"]),
            "updated": len(batch["opportunities"]["updates"]),
            "plan": len(batch["plan"]["changes"]),
        },
        "undo": {
            "insertedIds": [r["opportunityId"] for r in batch["opportunities"]["inserts"]],
            "updateSnapshots": [u["before"] for u in batch["opportunities"]["updates"]],
            "planChanges": batch["plan"]["changes"],
        },
    }
    UPLOAD_HISTORY.append(entry)
    return {"batchId": entry["batchId"], "counts": entry["counts"], "appliedAt": entry["appliedAt"]}


@app.get("/api/upload-history")
def upload_history():
    return [{k: e[k] for k in ("batchId", "filename", "appliedAt", "counts")} for e in reversed(UPLOAD_HISTORY)]


@app.delete("/api/upload-history/{batch_id}")
def upload_rollback(batch_id: str):
    """반영 제거(롤백): 신규 건 삭제, 갱신 건 이전 상태 복원, 계획 이전 금액 복원."""
    entry = next((e for e in UPLOAD_HISTORY if e["batchId"] == batch_id), None)
    if not entry:
        raise HTTPException(status_code=404, detail="히스토리에 없는 배치입니다")
    opps = STORE["opportunities"]["opportunities"]
    plan_rows = STORE["sales_plan"]["monthlyPlan"]
    undo = entry["undo"]

    STORE["opportunities"]["opportunities"] = [
        o for o in opps if o["opportunityId"] not in set(undo["insertedIds"])
    ]
    opps = STORE["opportunities"]["opportunities"]
    for snap in undo["updateSnapshots"]:
        target = next((o for o in opps if o["opportunityId"] == snap["opportunityId"]), None)
        if target:
            target.clear()
            target.update(snap)
    for c in undo["planChanges"]:
        target = next(
            (p for p in plan_rows if p["year"] == c["year"] and p["month"] == c["month"]
             and p["businessUnit"] == c["businessUnit"] and p["channel"] == c["channel"]),
            None,
        )
        if target:
            if c["before"] is None:
                plan_rows.remove(target)
            else:
                target["targetAmount"] = c["before"]

    UPLOAD_HISTORY.remove(entry)
    return {"removed": batch_id, "counts": entry["counts"]}


# ── Salesforce Data Loader 포맷 Export ────────────────────────
SF_COLS = [
    ("Name", "name"), ("AccountId", "accountId"), ("BusinessUnit__c", "businessUnit"),
    ("Channel__c", "channel"), ("PartnerAccount__c", "partnerAccount"),
    ("CustomerSegment__c", "customerSegment"), ("ProductFamily__c", "productFamily"),
    ("ProductModel__c", "productModel"), ("Quantity__c", "quantity"), ("Amount", "amount"),
    ("StageName", "stage"), ("Probability", "probability"), ("CloseDate", "closeDate"),
    ("PainPoint__c", "painPoint"), ("TargetSpec__c", "targetSpec"),
    ("DemoTargetDate__c", "demoTargetDate"), ("QualTargetDate__c", "qualTargetDate"),
    ("Competitor__c", "competitor"), ("LeadSource", "leadSource"),
    ("SensingEventId__c", "sensingEventId"), ("Description", "description"),
]


@app.get("/api/export-salesforce")
def export_salesforce(bu: str = "ALL", channel: str = "ALL", owner: str = "ALL"):
    from openpyxl import Workbook

    rows = [
        o for o in STORE["opportunities"]["opportunities"]
        if (bu == "ALL" or o.get("businessUnit") == bu)
        and (channel == "ALL" or o.get("channel") == channel)
        and (owner == "ALL" or o.get("owner") == owner)
    ]
    wb = Workbook()
    ws = wb.active
    ws.title = "Opportunity_Import"
    ws.append([c for c, _ in SF_COLS])
    for o in rows:
        ws.append([o.get(k) if o.get(k) is not None else "" for _, k in SF_COLS])
    ws2 = wb.create_sheet("참고")
    ws2.append(["항목", "내용"])
    ws2.append(["생성 기준", f"필터 사업부={bu}, 채널={channel}, 담당={owner} · {len(rows)}건"])
    ws2.append(["용도", "Salesforce Data Loader / Import Wizard용. 필드 매핑 규칙은 excel/salesforce_import_sample.xlsx '매핑표' 시트 참조"])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    filename = f"salesforce_import_{bu}_{channel}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# 프론트엔드 빌드가 있으면 루트에서 정적 서빙 (SPA fallback 포함)
if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")
