import { CONTINENTS, COUNTRIES, COUNTRY_BY_CODE, SOVEREIGN_COUNT, type Continent } from './data/countries'
import type { AppData } from './store'

export function computeStats(data: AppData) {
  const visited = Object.keys(data.statuses).filter((c) => data.statuses[c] === 'visited')
  const wish = Object.keys(data.statuses).filter((c) => data.statuses[c] === 'wish')
  const visitedSovereign = visited.filter((c) => COUNTRY_BY_CODE[c]?.sovereign).length
  const percent = Math.round((visitedSovereign / SOVEREIGN_COUNT) * 1000) / 10
  const byContinent = CONTINENTS.filter((c) => c !== 'AN').map((cont: Continent) => {
    const total = COUNTRIES.filter((c) => c.continent === cont && c.sovereign).length
    const count = visited.filter((c) => COUNTRY_BY_CODE[c]?.continent === cont && COUNTRY_BY_CODE[c]?.sovereign).length
    return { continent: cont, count, total }
  })
  const continentsVisited = new Set(visited.map((c) => COUNTRY_BY_CODE[c]?.continent).filter(Boolean)).size
  const days = data.trips.reduce((sum, t) => {
    if (!t.startDate) return sum
    const d = (new Date(t.endDate || t.startDate).getTime() - new Date(t.startDate).getTime()) / 86400000 + 1
    return sum + Math.max(1, Math.round(d))
  }, 0)
  return { visited, wish, visitedSovereign, percent, byContinent, continentsVisited, days, total: SOVEREIGN_COUNT }
}

/**
 * 나라별 방문 횟수 = 여행 기록 수 + 여행 기록 기간 밖의 다이빙 여행 수
 * (다이빙 날짜가 7일 넘게 떨어지면 다른 여행으로 봄). 표시만 하고 기록이 없으면 1회
 */
export function visitCounts(data: AppData): Record<string, number> {
  const out: Record<string, number> = {}
  for (const t of data.trips) out[t.country] = (out[t.country] ?? 0) + 1
  const byCountry: Record<string, string[]> = {}
  for (const d of data.dives) {
    if (!d.date) continue
    const covered = data.trips.some((t) => t.country === d.country && t.startDate && d.date >= t.startDate && d.date <= (t.endDate || t.startDate))
    if (!covered) (byCountry[d.country] ??= []).push(d.date)
  }
  for (const [c, dates] of Object.entries(byCountry)) {
    const days = [...new Set(dates)].sort().map((x) => new Date(x + 'T00:00:00').getTime() / 86400000)
    let groups = 0
    let prev = -Infinity
    for (const day of days) {
      if (day - prev > 7) groups++
      prev = day
    }
    out[c] = (out[c] ?? 0) + groups
  }
  for (const [c, s] of Object.entries(data.statuses)) if (s === 'visited' && !out[c]) out[c] = 1
  // 출생 국가는 방문 횟수 색에서 제외 (따로 보라색)
  if (data.home) delete out[data.home]
  return out
}

/** 방문 횟수 → 색 단계 1~4 (1회 / 2회 / 3~4회 / 5회+) */
export const visitLevel = (n: number) => (n >= 5 ? 4 : n >= 3 ? 3 : n >= 2 ? 2 : 1)
