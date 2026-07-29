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
        raise HTTPException(status_code=422, detail="'사업기회' 또는 '판매계획' 시트가 필요합니다 (양식: sales_pipeline_template.xlsx)")
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


@app.post("/api/upload-apply/{batch_id}")
def upload_apply(batch_id: str):
    """2단계: 스테이징된 배치를 스토어에 반영하고 히스토리에 기록한다."""
    batch = STAGING.pop(batch_id, None)
    if not batch:
        raise HTTPException(status_code=404, detail="배치를 찾을 수 없습니다 (이미 반영됐거나 만료)")
    opps = STORE["opportunities"]["opportunities"]
    plan_rows = STORE["sales_plan"]["monthlyPlan"]

    for rec in batch["opportunities"]["inserts"]:
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
