# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

FastAPI(백엔드 API) + React(프론트엔드), localhost에서 실제 구동하는 애플리케이션 (사용자 확정).
설계 단계에서는 Salesforce 실연동 없이 `data/sample/*.json`을 데이터 소스로 사용.

## Users

- **영업 실무자** (Epson Korea): 담당 사업기회 현황 확인, 엑셀 업로드/다운로드, 센싱 이벤트 검토·승격. 일상 업무 도구로 반복 사용.
- **팀장/사업부장**: 사업부·채널별 계획 대비 실적 점검, 파이프라인 리뷰, 승격 승인.
- **경영진**: 전사 KPI 요약과 달성률을 짧은 시간에 파악.

## Product Purpose

Epson Korea 본사의 MI(Market Intelligence) 플랫폼. Salesforce 데이터 기반 **판매 계획 대비 실적 모니터링**(탭1)과 외부 공개 데이터(DART·나라장터·채용공고 등) 기반 **AI 사전 센싱·사업기회 탐색**(탭2)을 한 화면 체계에서 제공한다. 성공 = 실무진이 엑셀 이중관리 부담 없이 현황을 보고, 영업기회를 경쟁사보다 먼저 감지하는 것.

## Positioning

범용 BI 대시보드가 못 하는 것: **외부 이벤트 수집 → AI 스코어링 → 영업 검토 → Salesforce 사업기회 승격**의 2단계 승격 파이프라인이 실적 모니터링과 같은 데이터 체계로 연결되어 있다. 엑셀 업로드가 곧 데이터 반영이고, 같은 데이터가 Salesforce import 포맷으로 되돌아 나온다(양방향).

## Operating Context

- 조직 축: 사업부(PRT 프린터 / PJT 프로젝터 / RBT 로봇 / CMP 부품·소재) × 채널(직판/총판), 담당자 드릴다운.
- 기간 축: 연간 목표 + 월별 진척률, 월/분기/연 필터 전환.
- 실무진은 현재 엑셀로 파이프라인을 관리하며, Salesforce 입력을 부담으로 느낌 — 엑셀 업로드/Export가 핵심 워크플로.
- 상세 설계: `docs/MI_PLATFORM_DESIGN.md`, 예시 데이터: `data/sample/`, 엑셀 양식: `excel/`.

## Capabilities and Constraints

- 탭1: KPI 카드 4종(계획/진행중/계약완료/매출인식), 단계별 파이프라인 바, 월별 계획 vs 실적 콤보, 사업부×채널 히트맵, 사업기회 테이블.
- 탭2: 센싱 이벤트 피드(스코어순), 승격 퍼널, B2G 입찰 타임라인, 경쟁사 낙찰 동향, 검색량 추이.
- 영업 단계 7단계(확도 매핑)와 트리거유형 분류(TRG-01~10)는 가정 스키마 — Epson 실사용 값 확정 전 (Open Questions는 설계서 5장).
- 이번 단계에서는 Salesforce 실연동 없음(JSON 예시 데이터로 구동).
- 한국어 UI, 금액 표기 기본 단위: 억원(상세는 원).

## Brand Commitments

사용자가 명시적으로 고정(binding):

- 브랜드: **Epson** (주 고객: Epson Korea 본사)
- 배경: **흰색(#FFFFFF)**
- 주조색: **#00339B** (Epson 딥 블루)
- 폰트 스택: `Pretendard, Dotum, "돋움", AppleGothic, Helvetica, sans-serif`
- 방향: 경쟁사와 겹치지 않을 것 — *(추론, 미확정)* 경쟁 프린터 제조사(HP·Canon·Brother 등)의 룩 및 범용 BI 툴(Salesforce·Tableau 등)의 기성 대시보드 룩 양쪽 모두와 구별되는 자체 정체성.

## Evidence on Hand

- `data/sample/opportunities.json` — 사업기회 24건 (가상 예시, 합성 데이터로 표기됨)
- `data/sample/accounts.json` — 계정·설치베이스 8건 (가상)
- `data/sample/sales_plan.json` — 2026년 월별 판매 계획, 연 64억 (가상)
- `data/sample/sensing_events.json` — 센싱 이벤트 10건 (가상)
- 실제 고객 데이터·실적·Epson 내부 조직명은 없음 — 화면에 실데이터처럼 보이는 값은 모두 예시로 명시할 것.

## Product Principles

1. **모니터링은 3초, 탐색은 3클릭** — 경영진은 첫 화면에서 달성률을, 실무자는 3클릭 안에 자기 건을 찾는다.
2. **엑셀은 부담이 아니라 인터페이스** — 업로드가 곧 반영, Export가 곧 셀포 입력.
3. **센싱은 노이즈를 거른 뒤에 보여준다** — 스코어·상태 체계를 거친 이벤트만 행동 대상으로 승격.
4. **모든 숫자는 출처를 가진다** — KPI·이벤트 어디서든 원천(셀포/공시/공고) 드릴다운 가능.
5. **가정은 가정이라 말한다** — 확정 전 스키마·예시 데이터는 화면과 문서에서 구분 표기.

## Accessibility & Inclusion

사내 업무 도구 기준: 키보드 탐색 가능, 색상만으로 상태를 구분하지 않음(달성/미달 등은 아이콘·라벨 병행), 본문 대비 WCAG AA 이상. *(추론 — 별도 요구사항 미확정)*
