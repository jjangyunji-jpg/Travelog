import { useI18n } from '../i18n'

/** 다이빙 컴퓨터 수심 그래프 (아래로 갈수록 깊음) */
export default function ProfileChart({ profile }: { profile: [number, number][] }) {
  const { pick } = useI18n()
  const W = 320
  const H = 130
  const pad = { l: 30, r: 8, t: 8, b: 20 }
  const maxT = Math.max(...profile.map((p) => p[0]), 60)
  const maxD = Math.max(...profile.map((p) => p[1]), 5)
  const niceD = Math.ceil(maxD / 5) * 5
  const x = (t: number) => pad.l + (t / maxT) * (W - pad.l - pad.r)
  const y = (d: number) => pad.t + (d / niceD) * (H - pad.t - pad.b)
  const line = profile.map(([t, d], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(d).toFixed(1)}`).join('')
  const area = `${line}L${x(profile[profile.length - 1][0]).toFixed(1)},${y(0)}L${x(profile[0][0]).toFixed(1)},${y(0)}Z`
  const deepest = profile.reduce((a, b) => (b[1] > a[1] ? b : a))
  const depthTicks = [0, niceD / 2, niceD]
  const minTicks = Array.from({ length: 5 }, (_, i) => Math.round(((maxT / 60) * i) / 4))
  return (
    <figure className="profile">
      <figcaption className="small muted">📈 {pick('수심 그래프', 'Depth profile')}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={pick('수심 그래프', 'Depth profile')}>
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
        <path d={area} fill="url(#pf)" />
        <path d={line} fill="none" stroke="var(--dive)" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx={x(deepest[0])} cy={y(deepest[1])} r="3" fill="var(--dive)" />
        <text x={Math.min(x(deepest[0]) + 5, W - 40)} y={y(deepest[1]) - 4} className="pf-label strong">{deepest[1]}m</text>
      </svg>
    </figure>
  )
}
