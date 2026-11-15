import { useI18n } from '../i18n'

export interface Series {
  points: [number, number][]
  kind: 'actual' | 'plan' | 'past'
}

/** 다이버 실루엣 (오른쪽을 향해 수영) */
function Diver({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className="pf-diver" aria-hidden="true">
      <circle cx="16" cy="-12" r="1.4" className="pf-bubble" />
      <circle cx="19" cy="-17" r="1.1" className="pf-bubble" />
      <circle cx="17" cy="-21" r="0.8" className="pf-bubble" />
      <rect x="-9" y="-6.5" width="13" height="4.2" rx="2.1" />
      <path d="M-10 -1.2 Q0 -4.4 9 -1.6 Q10.5 0.6 9 2 Q0 3.6 -10 1.6 Z" />
      <circle cx="11.8" cy="-0.6" r="3" />
      <rect x="12.6" y="-2.3" width="2.6" height="2" rx="0.8" className="pf-mask" />
      <path d="M5 1.6 L10.5 5" strokeWidth="1.8" strokeLinecap="round" className="pf-limb" />
      <path d="M-10 0 L-17 -1.4 M-10 1 L-17 2.4" strokeWidth="2" strokeLinecap="round" className="pf-limb" />
      <path d="M-16.5 -1.6 L-24 -4.6 L-23 -0.2 Z M-16.5 2.6 L-24 1.6 L-22 5.6 Z" />
    </g>
  )
}

/** 수심 그래프 (아래로 갈수록 깊음). 실제 / 계획(점선) / 지난 다이빙(흐리게)을 겹쳐 그림 */
export default function ProfileChart({ series, title }: { series: Series[]; title?: string }) {
  const { pick } = useI18n()
  const shown = series.filter((s) => s.points.length > 1)
  if (!shown.length) return null
  const W = 320
  const H = 140
  const pad = { l: 30, r: 10, t: 22, b: 20 }
  const all = shown.flatMap((s) => s.points)
  const maxT = Math.max(...all.map((p) => p[0]), 60)
  const maxD = Math.max(...all.map((p) => p[1]), 5)
  const niceD = Math.ceil(maxD / 5) * 5
  const x = (t: number) => pad.l + (t / maxT) * (W - pad.l - pad.r)
  const y = (d: number) => pad.t + (d / niceD) * (H - pad.t - pad.b)
  const pathOf = (pts: [number, number][]) => pts.map(([t, d], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(d).toFixed(1)}`).join('')
  const main = shown.find((s) => s.kind === 'actual') ?? shown.find((s) => s.kind === 'plan')!
  const deepest = main.points.reduce((a, b) => (b[1] > a[1] ? b : a))
  // 다이버는 가장 깊은 구간의 가운데에
  const deepRun = main.points.filter((p) => p[1] >= deepest[1] - 0.3)
  const diverT = (deepRun[0][0] + deepRun[deepRun.length - 1][0]) / 2
  const depthTicks = [0, niceD / 2, niceD]
  const minTicks = Array.from({ length: 5 }, (_, i) => Math.round(((maxT / 60) * i) / 4))
  const mainArea = `${pathOf(main.points)}L${x(main.points[main.points.length - 1][0]).toFixed(1)},${y(0)}L${x(main.points[0][0]).toFixed(1)},${y(0)}Z`
  const hasPlan = shown.some((s) => s.kind === 'plan') && main.kind === 'actual'
  const hasPast = shown.some((s) => s.kind === 'past')

  return (
    <figure className="profile">
      <figcaption className="small muted">
        📈 {title ?? pick('수심 그래프', 'Depth profile')}
        {hasPlan && <span className="pf-legend plan">{pick('계획', 'Plan')}</span>}
        {hasPast && <span className="pf-legend past">{pick('지난 다이빙', 'Past dives')}</span>}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title ?? pick('수심 그래프', 'Depth profile')}>
        <defs>
          <linearGradient id="pf" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--dive)" stopOpacity="0.08" />
            <stop offset="1" stopColor="var(--dive)" stopOpacity="0.45" />
          </linearGradient>
        </defs>
        {depthTicks.map((d) => (
          <g key={d}>
            <line x1={pad.l} x2={W - pad.r} y1={y(d)} y2={y(d)} className="pf-grid" />
            <text x={pad.l - 4} y={y(d) + 3} textAnchor="end" className="pf-label">{d}m</text>
          </g>
        ))}
        {minTicks.map((m, i) => (
          <text key={i} x={x(m * 60)} y={H - 5} textAnchor="middle" className="pf-label">{m}′</text>
        ))}
        {shown.filter((s) => s.kind === 'past').map((s, i) => (
          <path key={'p' + i} d={pathOf(s.points)} className="pf-past" />
        ))}
        <path d={mainArea} fill="url(#pf)" />
        {shown.filter((s) => s.kind === 'plan' && s !== main).map((s, i) => (
          <path key={'pl' + i} d={pathOf(s.points)} className="pf-plan" />
        ))}
        <path d={pathOf(main.points)} className="pf-line" />
        {(() => {
          // 다이버 전체(오리발 끝 ~ 머리)가 그래프의 물 영역 안에 들어오는 위치 찾기
          const S = 0.9
          const pts = main.points.map(([t, d]) => [x(t), y(d)] as [number, number])
          const depthYAt = (px: number) => {
            const i = pts.findIndex((p) => p[0] >= px)
            if (i <= 0) return pts[0][1]
            const a = pts[i - 1]
            const b = pts[i]
            return a[1] + ((b[1] - a[1]) * (px - a[0])) / Math.max(0.01, b[0] - a[0])
          }
          // 높이 yy에서 물 영역의 왼쪽·오른쪽 경계 (하강선·상승선)
          const span = (yy: number) => {
            const l = pts.find((p) => p[1] >= yy)?.[0] ?? pad.l
            const r = [...pts].reverse().find((p) => p[1] >= yy)?.[0] ?? W - pad.r
            return [l, r]
          }
          const fits = (dx: number, dy: number) => {
            const top = dy - 7 * S
            const bottom = dy + 6 * S
            const [l1, r1] = span(top)
            const [l2, r2] = span(bottom)
            return dx - 25 * S > Math.max(l1, l2, pad.l) + 2 && dx + 16 * S < Math.min(r1, r2, W - pad.r) - 2 && bottom < depthYAt(dx - 25 * S) && bottom < depthYAt(dx + 16 * S)
          }
          let best: [number, number] | undefined
          const start = Math.max(pad.l + 26 * S, x(diverT))
          for (let dx = start; dx < W - pad.r - 18 * S && !best; dx += 2) {
            // 바닥선보다 조금 위, 필요하면 더 위로
            for (let lift = 8; lift <= 30 && !best; lift += 3) {
              const dy = Math.max(pad.t + 22 * S, depthYAt(dx) - lift)
              if (fits(dx, dy)) best = [dx, dy]
            }
          }
          const [dx, dy] = best ?? [Math.min(W - pad.r - 18 * S, Math.max(pad.l + 26 * S, x(diverT))), Math.max(pad.t + 22 * S, depthYAt(x(diverT)) - 8)]
          return <Diver x={dx} y={dy} s={S} />
        })()}
        {/* 최대 수심 글자: 시간 눈금과 겹치면 선 위로 */}
        <text
          x={Math.min(x(deepest[0]) + 4, W - 40)}
          y={y(deepest[1]) + 12 > H - pad.b + 2 ? y(deepest[1]) - 5 : y(deepest[1]) + 12}
          className="pf-label strong"
        >
          {deepest[1]}m
        </text>
      </svg>
    </figure>
  )
}
