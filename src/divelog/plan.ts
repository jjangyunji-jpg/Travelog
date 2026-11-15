/**
 * 다이빙 계획 (참고용)
 * - 예상 수심 그래프: 하강 18m/분 → 바닥 → 상승 9m/분 → 5m 안전정지 3분 → 수면
 * - 무감압 한계(NDL): 레크리에이션 다이빙 표(공기, 첫 다이빙)의 널리 알려진 값. 나이트록스는 등가공기수심(EAD)으로 환산
 * 실제 다이빙은 반드시 다이빙 컴퓨터와 교육받은 기준을 따라야 함
 */

const NDL_AIR: [depth: number, minutes: number][] = [
  [10, 219], [12, 147], [14, 98], [16, 72], [18, 56], [20, 45], [22, 37], [25, 29], [30, 20], [35, 14], [40, 9], [42, 8],
]

export const o2Fraction = (gas: string) => (gas.startsWith('ean') ? Number(gas.slice(3)) / 100 : 0.21)

/** 해당 수심·기체의 무감압 한계 (표에서 같거나 더 깊은 칸 사용 = 보수적) */
export function ndlMinutes(depth: number, gas: string): number | undefined {
  const fn2 = 1 - o2Fraction(gas)
  const ead = gas === 'air' ? depth : (depth + 10) * (fn2 / 0.79) - 10
  const row = NDL_AIR.find(([d]) => d >= ead - 0.01)
  return row ? row[1] : undefined
}

/** 산소분압 1.4 기준 최대 운용 수심 */
export const modMeters = (gas: string, ppo2 = 1.4) => Math.floor((ppo2 / o2Fraction(gas) - 1) * 10 * 10) / 10

export interface PlanResult {
  points: [number, number][]
  descentMin: number
  bottomMin: number
  ascentMin: number
  ndl?: number
  overNdl: boolean
  mod?: number
  overMod: boolean
  tooShort: boolean
}

export function planDive(depth: number, totalMin: number, gas: string): PlanResult {
  const STOP_DEPTH = 5
  const STOP_MIN = 3
  const descentMin = depth / 18
  const ascentMin = Math.max(0, depth - STOP_DEPTH) / 9 + STOP_MIN + STOP_DEPTH / 9
  const bottomMin = totalMin - descentMin - ascentMin
  const tooShort = bottomMin < 1
  const b = Math.max(1, bottomMin)
  const t = (m: number) => Math.round(m * 60)
  const t1 = descentMin
  const t2 = t1 + b
  const t3 = t2 + Math.max(0, depth - STOP_DEPTH) / 9
  const t4 = t3 + STOP_MIN
  const t5 = t4 + STOP_DEPTH / 9
  const points: [number, number][] =
    depth > STOP_DEPTH
      ? [[0, 0], [t(t1), depth], [t(t2), depth], [t(t3), STOP_DEPTH], [t(t4), STOP_DEPTH], [t(t5), 0]]
      : [[0, 0], [t(t1), depth], [t(t2), depth], [t(t2 + depth / 9), 0]]
  const ndl = ndlMinutes(depth, gas)
  const mod = gas === 'air' ? undefined : modMeters(gas)
  return {
    points,
    descentMin,
    bottomMin: b,
    ascentMin,
    ndl,
    // 바닥에 도착하기까지 + 바닥 시간을 무감압 한계와 비교
    overNdl: ndl == null || descentMin + b > ndl,
    mod,
    overMod: mod != null && depth > mod,
    tooShort,
  }
}
