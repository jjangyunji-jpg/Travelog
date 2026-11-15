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

/** 기준점들을 부드럽게 잇기 (단조 3차 보간: 기준점 사이에서 값이 넘치지 않음) */
function spline(keys: [number, number][], stepMin = 0.25): [number, number][] {
  const n = keys.length
  const xs = keys.map((k) => k[0])
  const ys = keys.map((k) => k[1])
  const h = xs.slice(1).map((x, i) => x - xs[i])
  const delta = h.map((hi, i) => (ys[i + 1] - ys[i]) / hi)
  const m = new Array(n).fill(0)
  m[0] = delta[0]
  m[n - 1] = delta[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] * delta[i] <= 0) m[i] = 0
    else {
      const w1 = 2 * h[i] + h[i - 1]
      const w2 = h[i] + 2 * h[i - 1]
      m[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i])
    }
  }
  const out: [number, number][] = []
  for (let i = 0; i < n - 1; i++) {
    const steps = Math.max(2, Math.ceil(h[i] / stepMin))
    for (let j = 0; j < steps; j++) {
      const t = j / steps
      const t2 = t * t
      const t3 = t2 * t
      const y = (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1]
      out.push([xs[i] + t * h[i], y])
    }
  }
  out.push(keys[n - 1])
  return out
}

/**
 * 실제 다이빙처럼 보이는 예상 그래프
 * 천천히 하강 → 가장 깊은 곳을 먼저 → 점점 얕은 곳으로 이동(멀티레벨) → 안전정지 → 출수
 * (그림용. 무감압 한계 계산은 계획 수심에 계속 머문다고 보수적으로 가정)
 */
function naturalCurve(depth: number, totalMin: number, stop: number): [number, number][] {
  const end = totalMin
  const dEnd = Math.max(1.2, depth / 8) // 압력평형하며 천천히 하강
  let keys: [number, number][]
  if (depth > stop + 2) {
    const stopStart = end - stop / 9 - 3
    const B = Math.max(1, stopStart - 1.5 - dEnd)
    keys = [
      [0, 0],
      [dEnd, depth],
      [dEnd + B * 0.28, depth * 0.96],
      [dEnd + B * 0.55, depth * 0.8],
      [dEnd + B * 0.8, Math.max(stop + 3, depth * 0.62)],
      [dEnd + B, Math.max(stop + 2, depth * 0.45)],
      [stopStart, stop],
      [stopStart + 3, stop],
      [end, 0],
    ]
  } else {
    keys = [[0, 0], [dEnd, depth], [end * 0.5, depth * 0.9], [end - 1, depth * 0.7], [end, 0]]
  }
  const pts = spline(keys)
  const stopFrom = depth > stop + 2 ? end - stop / 9 - 3 : end
  return pts.map(([m, d]) => {
    // 바닥 구간에는 유영하며 오르내리는 작은 물결
    const amp = 0.1 + depth * 0.012
    const fade = Math.min(1, (m - dEnd) / 2, (stopFrom - 1.2 - m) / 2)
    // 0~amp 사이의 매끄러운 물결 (위쪽으로만 → 최대 수심은 넘지 않음)
    const wave = m > dEnd && m < stopFrom - 1.2 ? (fade * amp * (2 + 1.2 * Math.sin(m * 1.1) + 0.8 * Math.sin(m * 2.6 + 1))) / 4 : 0
    const v = Math.min(depth, Math.max(0, d - Math.max(0, wave)))
    return [Math.round(m * 60), Math.round(v * 10) / 10] as [number, number]
  })
}

export interface PlanResult {
  points: [number, number][]
  /** 실제 다이빙처럼 그린 부드러운 곡선 (그래프용) */
  curve: [number, number][]
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
  const curve = naturalCurve(depth, Math.max(totalMin, t5), STOP_DEPTH)
  return {
    points,
    curve,
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
