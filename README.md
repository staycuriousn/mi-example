# Epson Korea MI 플랫폼 — 설계 산출물

Salesforce 데이터 + 외부 공개 데이터를 연계한 **실적 모니터링 및 사전 센싱** 플랫폼의 설계 단계 산출물입니다.
(실제 Salesforce 연동 전 단계로, 모든 데이터는 가상의 예시입니다.)

## 산출물 구성

| 경로 | 내용 |
|---|---|
| [`docs/MI_PLATFORM_DESIGN.md`](docs/MI_PLATFORM_DESIGN.md) | **설계서** — 데이터 목록·스키마, 영업 단계 정의, 엑셀↔Salesforce 변환, 외부 센싱 이벤트 통합 스키마, AI 스코어 산식, 지표·그래프 정의, UI 레이아웃, Open Questions |
| `data/sample/opportunities.json` | 사업기회 예시 15건 (Salesforce 연계 대상 스키마) |
| `data/sample/accounts.json` | 계정 + 설치베이스 예시 8건 |
| `data/sample/sales_plan.json` | 2026년 판매 계획 (사업부×채널×월, 연 320억) |
| `data/sample/sensing_events.json` | 외부 센싱 이벤트 예시 10건 (B2B/B2G 통합 스키마) |
| `excel/sales_pipeline_template.xlsx` | 실무 관리용 엑셀 템플릿 (사업기회·판매계획·입력가이드) |
| `excel/salesforce_import_sample.xlsx` | Salesforce Data Loader import용 변환 결과 + 매핑표 |

## 핵심 설계 결정

1. **2개 탭 구성** — ① 판매 계획 대비 실적 모니터링(Salesforce 연계) ② 사업기회 요약(외부 데이터 사전 센싱)
2. **조직 축**: 사업부(프린터 PRT / 프로젝터 PJT / 로봇 RBT / 부품·소재 CMP) × 채널(직판/총판)
3. **기간 축**: 연간 목표 + 월별 진척률 (월/분기/연 필터 전환)
4. **엑셀 양방향 지원**: 실무 엑셀 업로드 → 모니터링 자동 반영 / Salesforce import용 export
5. **2단계 승격 구조**: 외부 이벤트는 센싱 레이어에서 수집·AI 스코어링 후, 영업 검토를 거쳐 유효 건만 Salesforce 사업기회로 승격
