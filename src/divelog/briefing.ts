/** 다이빙 전 브리핑 체크리스트 */
export interface BriefItem {
  key: string
  ko: string
  en: string
}
export interface BriefSection {
  key: string
  icon: string
  ko: string
  en: string
  items: BriefItem[]
}

export const BRIEFING: BriefSection[] = [
  {
    key: 'site', icon: '📍', ko: '스팟 브리핑', en: 'Site briefing',
    items: [
      { key: 'entry', ko: '입수·출수 방법과 위치 (보트 / 비치)', en: 'Entry & exit points (boat / shore)' },
      { key: 'current', ko: '조류 방향·세기, 수면 상태', en: 'Current direction & strength, surface conditions' },
      { key: 'terrain', ko: '지형과 이동 경로 (월·리프·난파선 등)', en: 'Terrain & route (wall, reef, wreck…)' },
      { key: 'temp', ko: '수온 확인, 슈트·웨이트 맞춤', en: 'Water temp, suit & weights' },
      { key: 'life', ko: '볼 수 있는 생물·주의할 생물 (만지지 않기)', en: 'Marine life to look for & avoid (no touching)' },
    ],
  },
  {
    key: 'plan', icon: '📋', ko: '다이빙 계획 공유', en: 'Dive plan',
    items: [
      { key: 'depth', ko: '최대 수심과 다이빙 시간 공유', en: 'Max depth & dive time agreed' },
      { key: 'turn', ko: '상승 시작 압력 공유', en: 'Turn / ascent pressure agreed' },
      { key: 'stop', ko: '안전정지 5m 3분', en: 'Safety stop 5m · 3min' },
      { key: 'computer', ko: '다이빙 컴퓨터 설정 확인 (기체·나이트록스 %)', en: 'Dive computer set (gas / nitrox %)' },
    ],
  },
  {
    key: 'buddy', icon: '🤝', ko: '버디 체크 (BWRAF)', en: 'Buddy check (BWRAF)',
    items: [
      { key: 'b', ko: 'B · BCD: 인플레이터·배기 밸브 작동', en: 'B · BCD: inflator & dump valves work' },
      { key: 'w', ko: 'W · 웨이트: 위치와 빠른 해제 방법', en: 'W · Weights: position & quick release' },
      { key: 'r', ko: 'R · 릴리즈: 버클·스트랩 체결', en: 'R · Releases: buckles & straps fastened' },
      { key: 'a', ko: 'A · 공기: 밸브 완전 개방, 게이지·호흡기·옥토퍼스 확인', en: 'A · Air: valve open, gauge, regulator & octopus' },
      { key: 'f', ko: 'F · 최종 확인: 마스크·핀·컴퓨터·카메라', en: 'F · Final OK: mask, fins, computer, camera' },
    ],
  },
  {
    key: 'safety', icon: '🆘', ko: '수신호·비상 절차', en: 'Signals & emergencies',
    items: [
      { key: 'signals', ko: 'OK·문제·공기 잔압·상승 수신호 확인', en: 'OK, problem, air check & ascend signals' },
      { key: 'lowair', ko: '공기 부족 시 버디 옥토퍼스 사용 방법', en: 'Out-of-air: sharing buddy’s octopus' },
      { key: 'lost', ko: '버디를 놓치면 1분 찾고 → 천천히 상승해서 수면에서 만나기', en: 'Lost buddy: search 1 min, then ascend & meet at surface' },
      { key: 'smb', ko: 'SMB(수면 표시 부이)·호루라기 준비', en: 'SMB & whistle ready' },
    ],
  },
]

export const BRIEF_TOTAL = BRIEFING.reduce((n, s) => n + s.items.length, 0)
