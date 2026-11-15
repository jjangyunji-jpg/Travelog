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

/** 한 서버에 요청 (20초 넘으면 포기하고 다음 서버로) */
async function ask(url: string, query: string, usePost: boolean): Promise<{ elements?: El[]; remark?: string }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000)
  try {
    const res = usePost
      ? await fetch(url, { method: 'POST', body: new URLSearchParams({ data: query }), signal: ctrl.signal })
      : await fetch(`${url}?data=${encodeURIComponent(query)}`, { signal: ctrl.signal })
    const text = await res.text()
    if (!res.ok) throw new Error(`HTTP ${res.status}${text ? ' ' + text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) : ''}`)
    try {
      return JSON.parse(text)
    } catch {
      throw new Error('JSON 아님: ' + text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120))
    }
  } catch (e) {
    const err = e as Error
    throw new Error(err.name === 'AbortError' ? '시간 초과(20초)' : err.message || String(e))
  } finally {
    clearTimeout(timer)
  }
}

export async function findDiveSites(lat: number, lon: number, radiusKm: number, lang: string): Promise<{ sites: OsmDiveSite[]; cached: boolean }> {
  const key = `${KEY}${lat.toFixed(3)},${lon.toFixed(3)},${radiusKm}`
  const r = Math.round(radiusKm * 1000)
  const a = `(around:${r},${lat.toFixed(5)},${lon.toFixed(5)})`
  // Overpass QL 표준 순서: out [상세도] [위치] [개수]
  const query = `[out:json][timeout:25];(nwr${a}["sport"="scuba_diving"];nwr${a}["leisure"="dive_site"];nwr${a}["sport"="free_diving"];);out tags center 150;`
  const errors: string[] = []
  for (const url of ENDPOINTS) {
    // 서버마다 POST, 안 되면 GET 한 번 더
    for (const usePost of [true, false]) {
      try {
        const json = await ask(url, query, usePost)
        if (json.remark && !json.elements?.length) throw new Error('서버 메시지: ' + json.remark.slice(0, 120))
        const sites = parse(json.elements ?? [], lang)
        try {
          localStorage.setItem(key, JSON.stringify(sites))
        } catch {
          /* 무시 */
        }
        return { sites, cached: false }
      } catch (e) {
        errors.push(`${new URL(url).hostname} ${usePost ? 'POST' : 'GET'}: ${(e as Error).message}`)
      }
    }
  }
  // 인터넷이 안 되면 예전에 찾아 둔 결과
  try {
    const saved = localStorage.getItem(key)
    if (saved) return { sites: JSON.parse(saved), cached: true }
  } catch {
    /* 무시 */
  }
  throw new Error(errors.join('\n'))
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
