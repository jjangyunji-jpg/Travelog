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
