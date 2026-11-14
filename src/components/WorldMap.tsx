import { memo, useMemo, useRef, useState } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { MAP_FEATURES } from '../data/map'
import type { Status } from '../store'

export const MAP_W = 960
export const MAP_H = 500

const projection = geoNaturalEarth1().fitExtent(
  [
    [4, 4],
    [MAP_W - 4, MAP_H - 4],
  ],
  { type: 'FeatureCollection', features: MAP_FEATURES },
)
const pathGen = geoPath(projection)

/** 나라 코드별 SVG 경로 (한 번만 계산) */
export const COUNTRY_PATHS: { code: string; d: string }[] = MAP_FEATURES.map((f) => ({
  code: f.code,
  d: pathGen(f) ?? '',
}))

export const fillFor = (s: Status | undefined) =>
  s === 'visited' ? 'var(--visited)' : s === 'wish' ? 'var(--wish)' : 'var(--land)'

interface Props {
  statuses: Record<string, Status>
  selected?: string
  onSelect: (code: string) => void
}

const Paths = memo(function Paths({ statuses, selected }: { statuses: Record<string, Status>; selected?: string }) {
  return (
    <>
      {COUNTRY_PATHS.map((p, i) => (
        <path
          key={i}
          d={p.d}
          data-code={p.code}
          fill={fillFor(statuses[p.code])}
          className={p.code === selected ? 'country selected' : 'country'}
        />
      ))}
    </>
  )
})

export default function WorldMap({ statuses, selected, onSelect }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setView] = useState({ k: 1, x: 0, y: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef({ moved: 0, pinchDist: 0 })

  const clamp = (v: { k: number; x: number; y: number }) => {
    const k = Math.min(12, Math.max(1, v.k))
    const x = Math.min(0, Math.max(MAP_W - MAP_W * k, v.x))
    const y = Math.min(0, Math.max(MAP_H - MAP_H * k, v.y))
    return { k, x, y }
  }

  /** 화면 좌표 → SVG viewBox 좌표 */
  const toSvg = (cx: number, cy: number) => {
    const r = svgRef.current!.getBoundingClientRect()
    const s = Math.max(MAP_W / r.width, MAP_H / r.height)
    return { x: (cx - r.left - (r.width - MAP_W / s) / 2) * s, y: (cy - r.top - (r.height - MAP_H / s) / 2) * s, s }
  }

  const zoomAt = (px: number, py: number, factor: number) =>
    setView((v) => {
      const k = Math.min(12, Math.max(1, v.k * factor))
      const f = k / v.k
      return clamp({ k, x: px - (px - v.x) * f, y: py - (py - v.y) * f })
    })

  const onWheel = (e: React.WheelEvent) => {
    const p = toSvg(e.clientX, e.clientY)
    zoomAt(p.x, p.y, e.deltaY < 0 ? 1.25 : 0.8)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) gesture.current.moved = 0
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      gesture.current.pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const cur = { x: e.clientX, y: e.clientY }
    if (pointers.current.size === 1) {
      const { s } = toSvg(0, 0)
      const dx = (cur.x - prev.x) * s
      const dy = (cur.y - prev.y) * s
      gesture.current.moved += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y)
      if (gesture.current.moved > 6) {
        svgRef.current?.setPointerCapture(e.pointerId)
        setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy }))
      }
    } else if (pointers.current.size === 2) {
      pointers.current.set(e.pointerId, cur)
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const mid = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2)
      if (gesture.current.pinchDist) zoomAt(mid.x, mid.y, dist / gesture.current.pinchDist)
      gesture.current.pinchDist = dist
      gesture.current.moved = 999
      return
    }
    pointers.current.set(e.pointerId, cur)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const wasTap = pointers.current.size === 1 && gesture.current.moved <= 6
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) gesture.current.pinchDist = 0
    if (wasTap) {
      const el = document.elementFromPoint(e.clientX, e.clientY) as SVGElement | null
      const code = el?.getAttribute('data-code')
      if (code) onSelect(code)
    }
  }

  const transform = useMemo(() => `translate(${view.x} ${view.y}) scale(${view.k})`, [view])

  return (
    <div className="map-wrap">
      <svg
        ref={svgRef}
        className="world-map"
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ ['--k' as string]: view.k }}
      >
        <g transform={transform}>
          <Paths statuses={statuses} selected={selected} />
        </g>
      </svg>
      <div className="zoom-controls">
        <button aria-label="zoom in" onClick={() => zoomAt(MAP_W / 2, MAP_H / 2, 1.5)}>＋</button>
        <button aria-label="zoom out" onClick={() => zoomAt(MAP_W / 2, MAP_H / 2, 1 / 1.5)}>－</button>
        <button aria-label="reset" onClick={() => setView({ k: 1, x: 0, y: 0 })}>⟲</button>
      </div>
    </div>
  )
}
