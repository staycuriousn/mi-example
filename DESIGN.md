---
name: Epson Korea MI Platform
description: 순백 바탕에 딥 블루 잉크로 구조를 그리는 실적 모니터링·사전 센싱 대시보드
colors:
  paper-white: "#ffffff"
  epson-ink: "#00339b"
  ink-deepest: "#001c56"
  ink-mid: "#3d64c8"
  ink-faded: "#8fa6e0"
  ink-wash: "#dce4f7"
  ink-mist: "#f2f5fc"
  ink-black-text: "#1a2233"
  quiet-slate: "#5a6478"
  hairline: "#d9dee8"
  scrim: "rgba(10, 20, 50, 0.28)"
  achieved-green: "#0e7a55"
  achieved-green-bg: "#e6f3ee"
  caution-amber: "#b26a00"
  caution-amber-bg: "#f8efe0"
  shortfall-rose: "#b3264c"
  shortfall-rose-bg: "#f9e9ee"
  chart-prt: "#2e56c2"
  chart-pjt: "#0e8fa5"
  chart-rbt: "#7c5cd1"
  chart-cmp: "#b26a00"
typography:
  display:
    fontFamily: "Pretendard Variable, Pretendard, Dotum, 돋움, AppleGothic, Helvetica, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Pretendard Variable, Pretendard, Dotum, 돋움, AppleGothic, Helvetica, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Pretendard Variable, Pretendard, Dotum, 돋움, AppleGothic, Helvetica, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.5
  body-emphasis:
    fontFamily: "Pretendard Variable, Pretendard, Dotum, 돋움, AppleGothic, Helvetica, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Pretendard Variable, Pretendard, Dotum, 돋움, AppleGothic, Helvetica, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.57
  body-compact:
    fontFamily: "Pretendard Variable, Pretendard, Dotum, 돋움, AppleGothic, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Pretendard Variable, Pretendard, Dotum, 돋움, AppleGothic, Helvetica, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label-small:
    fontFamily: "Pretendard Variable, Pretendard, Dotum, 돋움, AppleGothic, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  micro: "2px"
  tag: "4px"
  control: "6px"
  card: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.epson-ink}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "{colors.ink-deepest}"
  button-ghost:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.epson-ink}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  kpi-card:
    backgroundColor: "{colors.paper-white}"
    rounded: "{rounded.card}"
    padding: "16px"
  tag-stage:
    backgroundColor: "{colors.ink-wash}"
    textColor: "{colors.ink-deepest}"
    rounded: "{rounded.tag}"
    padding: "2px 8px"
---

# Design System: Epson Korea MI Platform

## Overview

**Creative North Star: "흰 종이 위의 딥 블루 잉크 (Deep Blue Ink on White Paper)"**

정밀 인쇄 회사의 대시보드는 잉크의 논리를 따른다. 순백(#FFFFFF) 종이 위에 Epson 딥 블루(#00339B)가
구조선·핵심 숫자·활성 상태를 그리고, 나머지는 여백과 1px 헤어라인이 감당한다. 회색 캔버스 위에 흰
카드를 그림자로 띄우는 범용 BI 툴의 문법(Tableau/PowerBI), 스카이블루 그라데이션과 일러스트의
Salesforce 문법을 명시적으로 거부한다. 사용자 고정 제약: 흰 배경, 주조색 #00339B, Pretendard 폰트
스택 — 이 셋은 binding이다.

모드는 Operate. 매일 여는 업무 도구이므로 표현보다 스캔 속도와 일관성이 우선하고, 브랜드는 2px 잉크
룰, tabular-nums 숫자, 시맨틱 밴드 같은 정밀한 디테일에 산다.

**Key Characteristics:**
- 그림자 없는 흰 캔버스 — 구분은 1px 헤어라인과 여백이 한다
- 섹션 헤더마다 2px 잉크 룰(밑줄) — 잉크가 지면의 구조를 긋는다
- 모든 수치는 tabular-nums, 금액은 억원 단위
- 상태는 색+아이콘/라벨 병행, 색 단독 표현 금지

## Colors

흰 종이 + 잉크 스케일 7단계 + 시맨틱 3색(배경 틴트 동반) + 차트 범주형 4색.

### Primary
- **Epson Ink** (#00339B): 주조색. 헤더 타이틀, KPI 숫자, 주요 버튼, 활성 탭·세그먼트, 섹션 룰,
  테이블 헤더 하단 룰, 파이프라인 활성 셀. 잉크가 곧 구조다.
- **Ink Deepest** (#001C56): 주요 버튼 호버, 드로어 타이틀.
- **Ink Mid** (#3D64C8): 포커스 링, 보조 강조.
- **Ink Faded** (#8FA6E0): 차트 계획선, 셰브론 스트로크, 비활성 강조.
- **Ink Wash** (#DCE4F7): 선택 행 배경, 단계 태그 배경.
- **Ink Mist** (#F2F5FC): 호버 행, 파이프라인 셀 바탕, 스켈레톤 — 회색 대체재.

### Neutral
- **Ink Black Text** (#1A2233): 본문. 순검정 금지 — 잉크 느낌의 블루블랙.
- **Quiet Slate** (#5A6478): 보조 텍스트, 캡션, 축 라벨 (흰 배경 대비 5.9:1).
- **Hairline** (#D9DEE8): 표 괘선, 카드 테두리, 차트 수평 격자.

### Semantic (달성률 밴드)
- **Achieved Green** (#0E7A55 / bg #E6F3EE): 달성 ≥100%, 수주·매출인식 태그.
- **Caution Amber** (#B26A00 / bg #F8EFE0): 70~99%, 마감 임박.
- **Shortfall Rose** (#B3264C / bg #F9E9EE): <70%, 만기 경과, 실주. Canon 레드(#CC0000)와 구별되는 로즈.

### Chart Categorical (사업부 고정 매핑, 순서 불변)
- **PRT 프린터** (#2E56C2) · **PJT 프로젝터** (#0E8FA5) · **RBT 로봇** (#7C5CD1) · **CMP 부품·소재** (#B26A00)
- dataviz 검증 통과: 명도 밴드 L 0.43–0.77, CVD 인접쌍 ΔE ≥ 10.9, 정상시각 ΔE ≥ 17.5, 대비 ≥ 3:1.
- #00339B는 명도 밴드 미달로 차트 계열에서 제외 — UI 잉크 전용.

**The Ink-Only-Structure Rule.** 색이 구조를 만들 때는 잉크 계열만 쓴다. 회색 배경 패널은 존재하지
않는다 — 회색처럼 보이는 모든 면은 Ink Mist(#F2F5FC)다.

**The Never-Color-Alone Rule.** 달성/미달·상태는 항상 색 + ▲▼ 아이콘 또는 텍스트 라벨 병행.

## Typography

**Display/Body Font:** Pretendard Variable (fallback: Pretendard, Dotum, "돋움", AppleGothic, Helvetica, sans-serif) — 사용자 고정.

**Character:** 단일 패밀리, 굵기와 크기 대비로만 위계를 만든다. 숫자가 주인공인 지면이므로 모든 수치에
`font-variant-numeric: tabular-nums`가 걸린다.

### Hierarchy
- **Display** (700, 32px/40px, -0.02em): KPI 카드 금액 전용.
- **Headline** (700, 20px/28px, -0.01em): 페이지 타이틀 (Epson Ink).
- **Title** (600, 17px/25px): 섹션 헤더(2px 잉크 룰 동반), 드로어 타이틀, 파이프라인 금액.
- **Body-Emphasis** (600, 16px): 탭 라벨, KPI 단위("억") 병기.
- **Body** (400, 15px/23px): 본문·히트맵 셀 기본.
- **Body-Compact** (400/600, 14px): 테이블 셀, 버튼, 셀렉트·입력, 상세 패널 본문 — 밀도가 필요한 데이터 UI 단계.
- **Label** (400, 13px/19px): 캡션, 단위·출처, 필터 라벨, 태그, 테이블 헤더 (Quiet Slate).
- **Label-Small** (400, 12px): 차트 축 tick, 히트맵 보조 수치 전용 최소 단계 — 이 아래 크기는 금지.

**The Tabular Number Rule.** 수치 컬럼은 우측 정렬 + tabular-nums. 금액은 억원 소수 1자리(128.5억),
100억 이상은 정수. 원 단위는 상세 화면에서만 콤마 병기.

## Layout

12컬럼 개념의 단일 컨테이너: max-width 1440px, 좌우 패딩 32px(모바일 16px). 간격 스케일
4/8/12/16/24/32/48px — 섹션 사이 32px, 카드 내부 16px, 헤더 위 여백 > 아래 여백. 첫 화면(데스크톱
1440×900)은 헤더(타이틀+탭+필터+액션 버튼) → KPI 4장 한 줄 → 5단계 파이프라인까지.

반응형: 1100px 이하에서 차트 2분할이 1열로, 860px 이하에서 KPI 2×2, 파이프라인 세로 적층(셰브론
숨김), 액션 버튼 전폭 행, 480px 이하에서 차트 패널 헤더 랩핑 + X축 라벨 격월 솎음. 테이블은
컨테이너 내부 가로 스크롤(min-width 960px), 페이지 가로 스크롤 금지.

## Elevation & Depth

**그림자 없는 시스템.** 지면 위 요소는 전부 같은 평면에 있고, 구분은 1px Hairline 테두리와 여백이
한다. 유일한 예외는 지면을 벗어나 떠야 하는 요소 — 드로어(상세 패널)와 팝오버 — 에만 단일 그림자
허용.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 4px 16px rgba(0, 26, 86, 0.12)`): 드로어·팝오버 전용. 잉크 색조의 그림자.
- **Scrim** (`rgba(10, 20, 50, 0.28)`): 드로어 뒤 전면 오버레이 — 잉크 색조의 반투명 막. 순검정 오버레이 금지.

**The Flat-Paper Rule.** 카드·패널·테이블에 그림자를 주지 않는다. 그림자가 필요해 보이면 여백이
부족한 것이다.

## Shapes

직선 위주의 지면에 절제된 라운드: 카드·패널 8px, 버튼·입력·셀렉트 6px, 태그 4px, 범례 스와치·사업부
도트 등 10px 이하 마이크로 요소는 2px. 원형 알약 금지(상태 점 6px 원형만 예외).
파이프라인 단계 사이 연결은 1.5px Ink Faded 스트로크로 그린 "›" 셰브론(9px 회전 사각) — 화살표
삼각형 채움이 아니라 잉크 선이다.

## Components

### Buttons
- **Shape:** 6px radius, 8px 14px padding, 14px/600.
- **Primary:** Epson Ink 채움 + 흰 글자. Hover: Ink Deepest. (Salesforce Export 등 주 동작)
- **Ghost:** 흰 바탕 + Epson Ink 1px 테두리·글자. Hover: Ink Mist 바탕. (엑셀 업로드 등 보조 동작)
- **Focus:** 2px Ink Mid 아웃라인, 오프셋 2px (전역 :focus-visible).

### KPI Card
- 흰 바탕 + 1px Hairline, 8px radius, 16px padding. 위→아래: Label 캡션(지표명) → Display 금액(Epson
  Ink) → 메타 행(건수 · 달성률 = 시맨틱 색 + ▲▼).

### Pipeline Stage Cell
- Ink Mist 바탕 + 1px Hairline, 8px radius. 단계명 Label + 금액 17px/700 잉크 + 건수 병기. 클릭
  가능(버튼) — 활성 시 Epson Ink 채움/흰 글자, aria-pressed. 셀 사이 "›" 잉크 셰브론.

### Table
- 헤더: 13px/600 Quiet Slate, 하단 2px 잉크 룰, 클릭 정렬(화살표 잉크색). 행: 1px Hairline 괘선,
  호버 Ink Mist, 선택 Ink Wash. 줄무늬(zebra) 금지. 수치 우측 정렬.

### Tags (단계·상태)
- 4px radius, 연한 배경 + 진한 글자: 진행 단계 Ink Wash/Ink Deepest, 수주·매출인식
  green-bg/green, 실주 rose-bg/rose.

### Segmented Control (기간·차트 토글)
- 1px Hairline 테두리 6px, 칸 사이 1px 구분선. 활성 칸 Epson Ink 채움/흰 글자.

### Charts
- 수평 격자만(Hairline 1px), 축 라벨 Label 스타일, 범례 차트 상단 좌측(제목 아래). 실적 막대 Epson
  Ink(상단 4px 라운드, max 26px 폭), 계획선 Ink Faded 2.5px + 흰 5px 케이싱(막대 위 가독성). 호버
  툴팁: 흰 카드 + Float 그림자 + 스와치·tabular 값. 히트맵 셀은 시맨틱 bg 틴트 + 진한 글자 + 달성률
  %와 실적/계획 병기.

### Drawer (상세 슬라이드 패널)
- 우측 고정 480px(모바일 92vw), 흰 바탕 + 좌측 1px Hairline + Float 그림자. 헤더에 2px 잉크 룰.
  scrim rgba(10,20,50,.28). 220ms ease-out 슬라이드, Esc·scrim 클릭으로 닫기. 본문은 잉크색 소제목
  그룹(기본 정보 dl 그리드 96px 라벨 컬럼 / Pain Point / Target Spec / 검증 일정 / 관련 사업기회
  링크 / 설치베이스 카드).

### States
- **Loading:** Ink Mist 단색 펄스 스켈레톤(1.2s), 실제 레이아웃 자리 유지. 스피너 금지.
- **Empty:** 1px Hairline 박스 + 제목/보조문 + 해소 방법 안내.
- **Error:** 동일 박스 + 원인(HTTP 상태)·복구 동작(다시 시도 버튼) 명시.

### Motion
- 기본 트랜지션 150ms ease-out (호버·탭·행 선택). 드로어 220ms, scrim 200ms. 차트 최초 렌더만 성장
  애니메이션.

## Do's and Don'ts

### Do:
- **Do** 섹션 헤더마다 2px Epson Ink 룰을 긋는다 — 잉크가 구조를 만든다.
- **Do** 모든 수치에 tabular-nums + 우측 정렬, 금액은 억원 표기.
- **Do** 상태 표현에 색 + 아이콘/라벨을 병행한다.
- **Do** 차트 계열 색은 사업부 고정 매핑(순서 불변)을 쓴다 — 필터로 계열 수가 바뀌어도 색은 따라가지 않는다.

### Don't:
- **Don't** 회색 캔버스(#F5F5F5류) + 흰 카드 + 그림자 조합 — BI 툴 기본형 금지. 카드 그림자 자체가 금지(드로어·팝오버 예외).
- **Don't** 스카이블루 그라데이션, 클라우드/캐릭터 일러스트(Salesforce 룩), 순수 레드 강조(Canon), 밝은 시안 원형 모티프(HP).
- **Don't** 도넛 차트 중심 구성, 3D·그라데이션 차트, 듀얼 Y축, 이모지 아이콘, zebra 테이블.
- **Don't** #00339B를 차트 데이터 계열로 쓰지 않는다(명도 밴드 미달) — UI 잉크 전용, 차트는 #2E56C2.
