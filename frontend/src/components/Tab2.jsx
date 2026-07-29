export default function Tab2() {
  return (
    <div className="placeholder" role="status">
      <h2>사업기회 요약 — 2차 구현 예정</h2>
      <p>
        외부 데이터(DART·나라장터·채용공고·데이터랩·지방재정365) 기반 AI 사전 센싱 화면입니다. 수집된
        이벤트를 스코어순 피드로 검토하고, 유효 건을 Salesforce 사업기회로 승격합니다. 설계는
        docs/MI_PLATFORM_DESIGN.md 3.2·4.2 참조.
      </p>
      <ul>
        <li>센싱 요약 카드</li>
        <li>이벤트 피드 · 승격 폼 패널</li>
        <li>트리거유형·소스 분포</li>
        <li>승격 퍼널</li>
        <li>B2G 입찰 타임라인</li>
        <li>경쟁사 낙찰 동향</li>
        <li>검색량 추이</li>
      </ul>
    </div>
  )
}
