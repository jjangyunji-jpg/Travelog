import { BUILTIN_SPOTS, type DiveSpot } from './data/diveSpots'
import type { AppData, Dive } from './store'

export function allSpots(data: AppData): DiveSpot[] {
  return [...BUILTIN_SPOTS, ...data.customSpots]
}

export function spotMap(data: AppData): Record<string, DiveSpot> {
  return Object.fromEntries(allSpots(data).map((s) => [s.id, s]))
}

/** 날짜·시간 순으로 정렬해 로그 번호를 매김 */
export function diveNumbers(data: AppData): Record<string, number> {
  const sorted = [...data.dives].sort(
    (a, b) => (a.date + a.time).localeCompare(b.date + b.time) || a.createdAt - b.createdAt,
  )
  return Object.fromEntries(sorted.map((d, i) => [d.id, data.diveOffset + i + 1]))
}

export function diveStats(data: AppData) {
  const dives = data.dives
  const totalMin = dives.reduce((s, d) => s + (d.bottomTime ?? 0), 0)
  const maxDepth = dives.reduce((m, d) => Math.max(m, d.maxDepth ?? 0), 0)
  const countries = new Set(dives.map((d) => d.country)).size
  const spots = new Set(dives.map((d) => d.spotId)).size
  const species = new Set(dives.flatMap((d) => d.marineLife)).size
  return { count: dives.length + data.diveOffset, logged: dives.length, totalMin, maxDepth, countries, spots, species }
}

export const fmtMinutes = (m: number, lang: string) => {
  const h = Math.floor(m / 60)
  const mm = Math.round(m % 60)
  if (lang === 'ko') return h ? `${h}시간 ${mm}분` : `${mm}분`
  return h ? `${h}h ${mm}m` : `${mm}m`
}

export const sortDivesDesc = (dives: Dive[]) =>
  [...dives].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time) || b.createdAt - a.createdAt)
