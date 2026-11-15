import { geoContains, geoDistance } from 'd3-geo'
import { MAP_FEATURES } from '../data/map'
import { BUILTIN_SPOTS, type DiveSpot } from '../data/diveSpots'
import type { Dive } from '../store'
import type { ImportedDive } from './parse'

const KM = (a: [number, number], b: [number, number]) => geoDistance(a, b) * 6371

/** 좌표가 속한 나라 (바다 위면 가장 가까운 알려진 스팟의 나라) */
export function countryAt(lat: number, lon: number): string | undefined {
  const p: [number, number] = [lon, lat]
  const inside = MAP_FEATURES.find((f) => geoContains(f, p))
  if (inside) return inside.code
  let best: { c: string; d: number } | undefined
  for (const s of BUILTIN_SPOTS) {
    const d = KM(p, [s.lon, s.lat])
    if (!best || d < best.d) best = { c: s.country, d }
  }
  return best && best.d < 400 ? best.c : undefined
}

/** 좌표 2km 이내 또는 이름이 같은 스팟 */
export function matchSpot(d: ImportedDive, spots: DiveSpot[], country?: string): DiveSpot | undefined {
  if (d.lat != null && d.lon != null) {
    let best: { s: DiveSpot; km: number } | undefined
    for (const s of spots) {
      if (!isFinite(s.lat) || !isFinite(s.lon)) continue
      const km = KM([d.lon, d.lat], [s.lon, s.lat])
      if (km < 2 && (!best || km < best.km)) best = { s, km }
    }
    if (best) return best.s
  }
  const name = d.siteName?.trim().toLowerCase()
  if (!name) return undefined
  return spots.find(
    (s) => (!country || s.country === country) && [s.nameEn, s.nameKo].some((n) => n.toLowerCase() === name || (name.length > 3 && n.toLowerCase().includes(name))),
  )
}

/** 이미 기록된 다이빙인지 (같은 날 입수 시각 10분 이내, 또는 시각 없으면 수심이 거의 같음) */
export function findDuplicate(d: ImportedDive, dives: Dive[]): Dive | undefined {
  const mins = (t: string) => (t ? +t.slice(0, 2) * 60 + +t.slice(3, 5) : NaN)
  return dives.find((x) => {
    if (x.date !== d.date) return false
    const a = mins(x.time)
    const b = mins(d.time)
    if (isFinite(a) && isFinite(b)) return Math.abs(a - b) <= 10
    return x.maxDepth != null && d.maxDepth != null && Math.abs(x.maxDepth - d.maxDepth) < 0.3
  })
}
