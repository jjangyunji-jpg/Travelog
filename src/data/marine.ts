/** 다이빙에서 쓰는 사전: 마릿수, 스팟 종류, 컨디션, 감정 (생물 도감은 species.ts) */

/** 본 양 (대략) */
export const ABUNDANCE: [key: 'few' | 'some' | 'many' | 'swarm', ko: string, en: string][] = [
  ['few', '1~5', '1–5'],
  ['some', '5~20', '5–20'],
  ['many', '20~100', '20–100'],
  ['swarm', '100+ 군체', '100+ school'],
]

export const SPOT_TYPES: Record<string, [ko: string, en: string]> = {
  reef: ['리프', 'Reef'],
  wall: ['월', 'Wall'],
  wreck: ['난파선', 'Wreck'],
  drift: ['드리프트', 'Drift'],
  muck: ['먹(마크로)', 'Muck'],
  cave: ['동굴·세노테', 'Cave / Cenote'],
  pinnacle: ['피너클', 'Pinnacle'],
  bigfish: ['대물', 'Big fish'],
}

export const MOODS: [value: number, emoji: string, ko: string, en: string][] = [
  [5, '🤩', '최고', 'Amazing'],
  [4, '😊', '좋음', 'Good'],
  [3, '🙂', '보통', 'Okay'],
  [2, '😕', '아쉬움', 'Meh'],
  [1, '😰', '힘들었음', 'Rough'],
]

export const CONDITIONS: [key: string, ko: string, en: string][] = [
  ['great', '컨디션 최고', 'Felt great'],
  ['relaxed', '편안함', 'Relaxed'],
  ['tired', '피곤함', 'Tired'],
  ['seasick', '뱃멀미', 'Seasick'],
  ['equalize', '이퀄라이징 어려움', 'Trouble equalizing'],
  ['cold', '추웠음', 'Cold'],
  ['airUse', '공기 소모 많음', 'High air use'],
  ['buoyancy', '부력 조절 어려움', 'Buoyancy issues'],
  ['nervous', '긴장함', 'Nervous'],
  ['currentHard', '조류 셌음', 'Strong current'],
]

export const SUITS: [key: string, ko: string, en: string][] = [
  ['rash', '래시가드', 'Rash guard'],
  ['wet3', '웻슈트 3mm', 'Wetsuit 3mm'],
  ['wet5', '웻슈트 5mm', 'Wetsuit 5mm'],
  ['wet7', '웻슈트 7mm', 'Wetsuit 7mm'],
  ['semidry', '반건식', 'Semi-dry'],
  ['dry', '드라이슈트', 'Drysuit'],
]
