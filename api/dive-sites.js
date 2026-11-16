/**
 * Vercel 서버 기능: 휴대폰 대신 OpenStreetMap(Overpass)에 다이빙 포인트를 물어봄
 * - 통신사 LTE처럼 많은 사람이 같은 IP를 쓰는 환경에서 Overpass가 거절하는 문제를 피함
 * - 서버는 더 오래(최대 50초) 기다릴 수 있고, 결과를 하루 동안 CDN에 캐시
 * GET /api/dive-sites?lat=22.63&lon=120.30&r=15
 */
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

export function buildQuery(lat, lon, radiusKm) {
  const dLat = radiusKm / 111
  const dLon = radiusKm / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))
  const bb = `(${(lat - dLat).toFixed(4)},${(lon - dLon).toFixed(4)},${(lat + dLat).toFixed(4)},${(lon + dLon).toFixed(4)})`
  return `[out:json][timeout:40];(nwr["sport"="scuba_diving"]${bb};nwr["leisure"="dive_site"]${bb};nwr["sport"="free_diving"]${bb};);out tags center 200;`
}

async function ask(url, query, ms) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: new URLSearchParams({ data: query }),
      headers: { 'User-Agent': 'Travelog dive log (personal app)' },
      signal: ctrl.signal,
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return JSON.parse(text)
  } finally {
    clearTimeout(timer)
  }
}

export default async function handler(req, res) {
  const q = req.query ?? Object.fromEntries(new URL(req.url, 'http://x').searchParams)
  const lat = Number(q.lat)
  const lon = Number(q.lon)
  const r = Math.min(50, Math.max(1, Number(q.r) || 15))
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    res.status(400).json({ error: 'lat, lon 필요' })
    return
  }
  const query = buildQuery(Math.round(lat * 1000) / 1000, Math.round(lon * 1000) / 1000, r)
  const errors = []
  const started = Date.now()
  for (const url of ENDPOINTS) {
    const left = 52000 - (Date.now() - started)
    if (left < 3000) break
    try {
      const json = await ask(url, query, Math.min(left, 45000))
      // 같은 지역은 하루 동안 CDN이 바로 응답, 이후 일주일은 오래된 결과를 주면서 새로 고침
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.status(200).json({ elements: json.elements ?? [], via: new URL(url).hostname })
      return
    } catch (e) {
      errors.push(`${new URL(url).hostname}: ${e.name === 'AbortError' ? '시간 초과' : e.message}`)
    }
  }
  res.setHeader('Cache-Control', 'no-store')
  res.status(502).json({ error: errors.join('\n') || '시간 초과' })
}
