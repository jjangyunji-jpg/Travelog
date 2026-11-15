import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import type { Polygon } from 'geojson'
import { MAP_FEATURES } from '../data/map'
import type { Status } from '../store'

export const MAP_W = 960
export const MAP_H = 500

export const projection = geoNaturalEarth1().fitExtent(
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

type Bounds = [[number, number], [number, number]]

/** 나라의 화면상 영역. 멀리 떨어진 해외 영토(예: 프랑스령 기아나)는 제외 */
const boundsCache: Record<string, Bounds | null> = {}
export function countryBounds(code: string): Bounds | null {
  if (code in boundsCache) return boundsCache[code]
  const polys: Bounds[] = []
  for (const f of MAP_FEATURES) {
    if (f.code !== code) continue
    const g = f.geometry
    const list: Polygon[] =
      g.type === 'Polygon' ? [g] : g.type === 'MultiPolygon' ? g.coordinates.map((c) => ({ type: 'Polygon', coordinates: c })) : []
    for (const p of list) polys.push(pathGen.bounds(p) as Bounds)
  }
  if (!polys.length) return (boundsCache[code] = null)
  const area = (b: Bounds) => (b[1][0] - b[0][0]) * (b[1][1] - b[0][1])
  const main = polys.reduce((a, b) => (area(b) > area(a) ? b : a))
  const mc = [(main[0][0] + main[1][0]) / 2, (main[0][1] + main[1][1]) / 2]
  const reach = Math.max(40, 2.5 * Math.hypot(main[1][0] - main[0][0], main[1][1] - main[0][1]))
  const near = polys.filter((b) => Math.hypot((b[0][0] + b[1][0]) / 2 - mc[0], (b[0][1] + b[1][1]) / 2 - mc[1]) < reach)
  const res: Bounds = [
    [Math.min(...near.map((b) => b[0][0])), Math.min(...near.map((b) => b[0][1]))],
    [Math.max(...near.map((b) => b[1][0])), Math.max(...near.map((b) => b[1][1]))],
  ]
  return (boundsCache[code] = res)
}

export interface MapMarker {
  id: string
  lat: number
  lon: number
  kind: 'mine' | 'other' | 'pick' | 'city'
}

export type MapMode = 'travel' | 'dive'

export type TravelView = 'country' | 'city'

interface Props {
  statuses: Record<string, Status>
  mode?: MapMode
  /** 여행 지도: 나라 보기 / 도시 보기 */
  travelView?: TravelView
  /** 나라별 방문 색 단계 1~4 */
  levels?: Record<string, number>
  /** 출생 국가 */
  home?: string
  diveCountries?: Set<string>
  markers?: MapMarker[]
  selected?: string
  onSelect?: (code: string) => void
  onSelectSpot?: (id: string) => void
  /** 바뀔 때마다 해당 나라로 확대 */
  focus?: { code: string; n: number } | null
  /** 지도에서 위치 고르기 */
  onPick?: (lat: number, lon: number) => void
}

function fillFor(mode: MapMode, view: TravelView, s: Status | undefined, dived: boolean, level?: number, isHome?: boolean) {
  if (isHome && mode === 'travel') return view === 'city' ? 'var(--home-soft)' : 'var(--home)'
  if (mode === 'dive') {
    if (dived) return 'var(--dive-land)'
    return s === 'visited' ? 'var(--visited-soft)' : 'var(--land)'
  }
  if (view === 'city') return s === 'visited' ? 'var(--visited-soft)' : s === 'wish' ? 'var(--wish-soft)' : 'var(--land)'
  return s === 'visited' ? `var(--visit-${level ?? 1})` : s === 'wish' ? 'var(--wish)' : 'var(--land)'
}

const Paths = memo(function Paths({ statuses, selected, mode, view, levels, home, diveCountries }: {
  home?: string
  statuses: Record<string, Status>
  selected?: string
  mode: MapMode
  view: TravelView
  levels?: Record<string, number>
  diveCountries?: Set<string>
}) {
  return (
    <>
      {COUNTRY_PATHS.map((p, i) => (
        <path
          key={i}
          d={p.d}
          data-code={p.code}
          fill={fillFor(mode, view, statuses[p.code], !!diveCountries?.has(p.code), levels?.[p.code], p.code === home)}
          className={p.code === selected ? 'country selected' : 'country'}
        />
      ))}
    </>
  )
})

type View = { k: number; x: number; y: number }

const clamp = (v: View): View => {
  const k = Math.min(40, Math.max(1, v.k))
  const x = Math.min(0, Math.max(MAP_W - MAP_W * k, v.x))
  const y = Math.min(0, Math.max(MAP_H - MAP_H * k, v.y))
  return { k, x, y }
}

export default function WorldMap({ statuses, mode = 'travel', travelView = 'country', levels, home, diveCountries, markers, selected, onSelect, onSelectSpot, focus, onPick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 })
  const viewRef = useRef(view)
  viewRef.current = view
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef({ moved: 0, pinchDist: 0 })
  const anim = useRef<number>(0)
  /** CSS 1px 이 지도 좌표로 몇 단위인지 (핀 크기를 화면 기준으로 맞추기 위함) */
  const [unitPerPx, setUnitPerPx] = useState(2)
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      if (r.width) setUnitPerPx(Math.max(MAP_W / r.width, MAP_H / r.height))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const animateTo = (target: View) => {
    cancelAnimationFrame(anim.current)
    const from = viewRef.current
    const to = clamp(target)
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / 450))
      const e = 1 - Math.pow(1 - t, 3)
      setView({ k: from.k + (to.k - from.k) * e, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e })
      if (t < 1) anim.current = requestAnimationFrame(step)
    }
    anim.current = requestAnimationFrame(step)
  }

  useEffect(() => {
    if (!focus) return
    const b = countryBounds(focus.code)
    if (!b) return
    const bw = Math.max(b[1][0] - b[0][0], 8)
    const bh = Math.max(b[1][1] - b[0][1], 8)
    const k = Math.min(30, 0.75 * Math.min(MAP_W / bw, MAP_H / bh))
    const cx = (b[0][0] + b[1][0]) / 2
    const cy = (b[0][1] + b[1][1]) / 2
    animateTo({ k, x: MAP_W / 2 - k * cx, y: MAP_H / 2 - k * cy })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.code, focus?.n])

  useEffect(() => () => cancelAnimationFrame(anim.current), [])

  /** 화면 좌표 → SVG viewBox 좌표 */
  const toSvg = (cx: number, cy: number) => {
    const r = svgRef.current!.getBoundingClientRect()
    const s = Math.max(MAP_W / r.width, MAP_H / r.height)
    return { x: (cx - r.left - (r.width - MAP_W / s) / 2) * s, y: (cy - r.top - (r.height - MAP_H / s) / 2) * s, s }
  }

  const zoomAt = (px: number, py: number, factor: number) => {
    cancelAnimationFrame(anim.current)
    setView((v) => {
      const k = Math.min(40, Math.max(1, v.k * factor))
      const f = k / v.k
      return clamp({ k, x: px - (px - v.x) * f, y: py - (py - v.y) * f })
    })
  }

  const onWheel = (e: React.WheelEvent) => {
    const p = toSvg(e.clientX, e.clientY)
    zoomAt(p.x, p.y, e.deltaY < 0 ? 1.25 : 0.8)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    cancelAnimationFrame(anim.current)
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
    if (!wasTap) return
    if (onPick) {
      const p = toSvg(e.clientX, e.clientY)
      const v = viewRef.current
      const ll = projection.invert?.([(p.x - v.x) / v.k, (p.y - v.y) / v.k])
      if (ll) onPick(Math.round(ll[1] * 10000) / 10000, Math.round(ll[0] * 10000) / 10000)
      return
    }
    const el = document.elementFromPoint(e.clientX, e.clientY) as SVGElement | null
    const spot = el?.getAttribute('data-spot')
    if (spot && onSelectSpot) return onSelectSpot(spot)
    const code = el?.getAttribute('data-code')
    if (code && onSelect) onSelect(code)
  }

  const projected = useMemo(
    () =>
      (markers ?? [])
        .map((m) => ({ ...m, p: projection([m.lon, m.lat]) }))
        .filter((m): m is MapMarker & { p: [number, number] } => !!m.p)
        // 내 스팟이 위에 그려지도록
        .sort((a, b) => (a.kind === 'other' ? 0 : 1) - (b.kind === 'other' ? 0 : 1)),
    [markers],
  )

  const k = view.k
  const transform = `translate(${view.x} ${view.y}) scale(${k})`
  const px = unitPerPx / k
  const shrink = k < 3 ? 0.6 : 1

  return (
    <div className={`map-wrap mode-${mode}${onPick ? ' picking' : ''}`}>
      <svg
        ref={svgRef}
        className="world-map"
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <g transform={transform}>
          <Paths statuses={statuses} selected={selected} mode={mode} view={travelView} levels={levels} home={home} diveCountries={diveCountries} />
          {projected.map((m) => {
            const [x, y] = m.p
            const r = (m.kind === 'other' ? 4 * shrink : m.kind === 'pick' ? 8 : m.kind === 'city' ? 5.5 * shrink : 7 * shrink) * px
            return (
              <g key={m.kind + m.id} className={`pin ${m.kind}`}>
                {m.kind !== 'pick' && k >= 3 && <circle cx={x} cy={y} r={14 * px} fill="transparent" data-spot={m.id} />}
                <circle cx={x} cy={y} r={r} className="pin-dot" pointerEvents="none" />
              </g>
            )
          })}
        </g>
      </svg>
      <div className="zoom-controls">
        <button aria-label="zoom in" onClick={() => zoomAt(MAP_W / 2, MAP_H / 2, 1.6)}>＋</button>
        <button aria-label="zoom out" onClick={() => zoomAt(MAP_W / 2, MAP_H / 2, 1 / 1.6)}>－</button>
        <button aria-label="reset" onClick={() => animateTo({ k: 1, x: 0, y: 0 })}>⟲</button>
      </div>
    </div>
  )
}
