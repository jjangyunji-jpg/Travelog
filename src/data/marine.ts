/** 다이빙에서 쓰는 사전: 해양 생물, 스팟 종류, 컨디션, 감정 */

export const MARINE: [key: string, emoji: string, ko: string, en: string][] = [
  ['turtle', '🐢', '거북이', 'Sea turtle'],
  ['manta', '🛸', '만타가오리', 'Manta ray'],
  ['eagleRay', '🪁', '이글레이', 'Eagle ray'],
  ['stingray', '🪁', '가오리', 'Stingray'],
  ['whaleShark', '🦈', '고래상어', 'Whale shark'],
  ['reefShark', '🦈', '리프상어', 'Reef shark'],
  ['hammerhead', '🦈', '귀상어(해머헤드)', 'Hammerhead'],
  ['thresher', '🦈', '환도상어', 'Thresher shark'],
  ['tigerShark', '🦈', '뱀상어', 'Tiger shark'],
  ['greatWhite', '🦈', '백상아리', 'Great white'],
  ['dolphin', '🐬', '돌고래', 'Dolphin'],
  ['whale', '🐋', '고래', 'Whale'],
  ['sealion', '🦭', '바다사자·물개', 'Sea lion / Seal'],
  ['octopus', '🐙', '문어', 'Octopus'],
  ['cuttlefish', '🦑', '갑오징어', 'Cuttlefish'],
  ['squid', '🦑', '오징어', 'Squid'],
  ['nudibranch', '🐌', '갯민숭달팽이(누디)', 'Nudibranch'],
  ['seahorse', '🐴', '해마', 'Seahorse'],
  ['pygmySeahorse', '🐴', '피그미해마', 'Pygmy seahorse'],
  ['frogfish', '🐸', '씬벵이(프로그피시)', 'Frogfish'],
  ['moray', '🐍', '곰치', 'Moray eel'],
  ['clownfish', '🐠', '흰동가리(니모)', 'Clownfish'],
  ['barracuda', '🐟', '바라쿠다', 'Barracuda'],
  ['jackfish', '🐟', '잭피시 떼', 'Jackfish school'],
  ['sardines', '🐟', '정어리 떼', 'Sardine run'],
  ['batfish', '🐟', '제비활치(배트피시)', 'Batfish'],
  ['napoleon', '🐟', '나폴레옹피시', 'Napoleon wrasse'],
  ['bumphead', '🐟', '혹등비늘돔', 'Bumphead parrotfish'],
  ['lionfish', '🐟', '쏠배감펭', 'Lionfish'],
  ['scorpionfish', '🐟', '쑤기미·스콜피온피시', 'Scorpionfish'],
  ['mandarinfish', '🐠', '만다린피시', 'Mandarinfish'],
  ['ghostPipefish', '🐟', '고스트파이프피시', 'Ghost pipefish'],
  ['molaMola', '🐟', '개복치', 'Mola mola'],
  ['pufferfish', '🐡', '복어', 'Pufferfish'],
  ['crab', '🦀', '게', 'Crab'],
  ['lobster', '🦞', '랍스터', 'Lobster'],
  ['shrimp', '🦐', '새우', 'Shrimp'],
  ['jellyfish', '🎐', '해파리', 'Jellyfish'],
  ['softCoral', '🌸', '연산호', 'Soft coral'],
  ['wreck', '⚓', '난파선', 'Wreck'],
]
export const MARINE_BY_KEY = Object.fromEntries(MARINE.map((m) => [m[0], m]))

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
