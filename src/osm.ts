/**
 * OpenStreetMap에서 주변 다이빙 포인트·다이빙샵 찾기 (Overpass API, 무료·키 없음)
 * 결과는 기기에 저장 → 여행 전에 찾아 두면 현지에서 인터넷 없이도 다시 볼 수 있음
 */
export interface OsmDiveSite {
  id: string
  name: string
  lat: number
  lon: number
  kind: 'site' | 'shop'
  depth?: string
  /** 현지어 원래 이름 (표시 이름과 다를 때) */
  local?: string
}

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
const KEY = 'travelog:osm:'

export async function findDiveSites(lat: number, lon: number, radiusKm: number, lang: string): Promise<{ sites: OsmDiveSite[]; cached: boolean }> {
  const key = `${KEY}${lat.toFixed(3)},${lon.toFixed(3)},${radiusKm}`
  const r = Math.round(radiusKm * 1000)
  const q = `[out:json][timeout:25];(nwr(around:${r},${lat},${lon})["sport"="scuba_diving"];nwr(around:${r},${lat},${lon})["leisure"="dive_site"];nwr(around:${r},${lat},${lon})["sport"="free_diving"];);out center tags 150;`
  let lastErr: unknown
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: q }) })
      if (!res.ok) throw new Error('osm ' + res.status)
      const json = await res.json()
      const sites = parse(json.elements ?? [], lang)
      try {
        localStorage.setItem(key, JSON.stringify(sites))
      } catch {
        /* 무시 */
      }
      return { sites, cached: false }
    } catch (e) {
      lastErr = e
    }
  }
  // 인터넷이 안 되면 예전에 찾아 둔 결과
  try {
    const saved = localStorage.getItem(key)
    if (saved) return { sites: JSON.parse(saved), cached: true }
  } catch {
    /* 무시 */
  }
  throw lastErr ?? new Error('osm failed')
}

interface El {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

function parse(elements: El[], lang: string): OsmDiveSite[] {
  const out: OsmDiveSite[] = []
  for (const e of elements) {
    const lat = e.lat ?? e.center?.lat
    const lon = e.lon ?? e.center?.lon
    if (lat == null || lon == null) continue
    const t = e.tags ?? {}
    // 다이빙샵·센터 (shop/amenity/office 등이 있으면) vs 다이빙 포인트
    const shop = !!(t.shop || t.amenity || t.office || t.tourism || t.club)
    // 한국어 → 영어 → 현지어 순서 (현지어만 있으면 그대로)
    const name = (lang === 'ko' ? t['name:ko'] || t['name:en'] : t['name:en']) || t.name || t['name:ko'] || ''
    out.push({
      id: `osm-${e.type[0]}${e.id}`,
      name: name || (shop ? (lang === 'ko' ? '이름 없는 다이빙샵' : 'Unnamed dive shop') : lang === 'ko' ? '이름 없는 포인트' : 'Unnamed site'),
      lat,
      lon,
      kind: shop ? 'shop' : 'site',
      depth: t['scuba_diving:maxdepth'] || t.maxdepth || t.depth || undefined,
      local: t.name && t.name !== name ? t.name : undefined,
    })
  }
  return out
}
