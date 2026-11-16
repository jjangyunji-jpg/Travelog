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
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
const KEY = 'travelog:osm:v2:'

const distKm = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const R = 6371
  const dLa = ((bLat - aLat) * Math.PI) / 180
  const dLo = ((bLon - aLon) * Math.PI) / 180
  const h = Math.sin(dLa / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLo / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** 한 서버에 요청 (20초 넘으면 포기하고 다음 서버로) */
async function ask(url: string, query: string, usePost: boolean): Promise<{ elements?: El[]; remark?: string }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  // (가벼운 질의라 보통 1~2초)
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
    throw new Error(err.name === 'AbortError' ? '시간 초과(15초)' : err.message || String(e))
  } finally {
    clearTimeout(timer)
  }
}

export async function findDiveSites(lat: number, lon: number, radiusKm: number, lang: string): Promise<{ sites: OsmDiveSite[]; cached: boolean }> {
  const key = `${KEY}${lat.toFixed(3)},${lon.toFixed(3)},${radiusKm}`
  // 태그로 먼저 고르고(색인 사용) 사각형 범위로 자름 → 대도시에서도 빠름
  // (예전 방식 '반경 안의 모든 데이터 → 태그로 거르기'는 가오슝 같은 곳에서 시간 초과)
  const dLat = radiusKm / 111
  const dLon = radiusKm / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))
  const bb = `(${(lat - dLat).toFixed(4)},${(lon - dLon).toFixed(4)},${(lat + dLat).toFixed(4)},${(lon + dLon).toFixed(4)})`
  // 정확한 태그 값만 사용 (정규식은 서버가 전 세계 sport 값을 다 훑어서 느림)
  const query = `[out:json][timeout:12];(nwr["sport"="scuba_diving"]${bb};nwr["leisure"="dive_site"]${bb};nwr["sport"="free_diving"]${bb};);out tags center 150;`
  const errors: string[] = []
  // 1) 우리 Vercel 서버를 거쳐서 (휴대폰 LTE에서 Overpass가 거절하는 문제 회피, 하루 캐시)
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 58000)
    const res = await fetch(`/api/dive-sites?lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}&r=${radiusKm}`, { signal: ctrl.signal })
    clearTimeout(timer)
    const type = res.headers.get('content-type') ?? ''
    if (!type.includes('json')) throw new Error('서버 기능 없음')
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'HTTP ' + res.status)
    const sites = parse(json.elements ?? [], lang).filter((x) => distKm(lat, lon, x.lat, x.lon) <= radiusKm)
    try {
      localStorage.setItem(key, JSON.stringify(sites))
    } catch {
      /* 무시 */
    }
    return { sites, cached: false }
  } catch (e) {
    const err = e as Error
    errors.push(`Travelog 서버: ${err.name === 'AbortError' ? '시간 초과' : err.message}`)
  }
  // 2) 휴대폰에서 직접
  for (const url of ENDPOINTS) {
    // 서버마다 POST, 안 되면 GET 한 번 더
    for (const usePost of [true, false]) {
      try {
        const json = await ask(url, query, usePost)
        if (json.remark && !json.elements?.length) throw new Error('서버 메시지: ' + json.remark.slice(0, 120))
        const sites = parse(json.elements ?? [], lang).filter((x) => distKm(lat, lon, x.lat, x.lon) <= radiusKm)
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

/**
 * 주변 다이빙샵·센터 (Photon 지도 검색: 빠르고 안정적, OpenStreetMap 데이터)
 * Photon은 다이빙 '포인트'는 다루지 않아서 샵만 여기서 가져옴
 */
export async function findDiveShops(lat: number, lon: number, radiusKm: number): Promise<OsmDiveSite[]> {
  const key = `${KEY}shops:${lat.toFixed(3)},${lon.toFixed(3)},${radiusKm}`
  try {
    const tags = ['amenity:dive_centre', 'shop:scuba_diving']
    const lists = await Promise.all(
      tags.map(async (tag) => {
        const q = new URLSearchParams({ lat: String(lat), lon: String(lon), radius: String(Math.min(radiusKm, 50)), limit: '50', osm_tag: tag })
        const res = await fetch(`https://photon.komoot.io/reverse?${q}`)
        if (!res.ok) throw new Error('photon ' + res.status)
        const json = await res.json()
        return (json.features ?? []) as { properties: { osm_type: string; osm_id: number; name?: string }; geometry: { coordinates: [number, number] } }[]
      }),
    )
    const seen = new Set<string>()
    const out: OsmDiveSite[] = []
    for (const f of lists.flat()) {
      const id = `osm-${f.properties.osm_type.toLowerCase()}${f.properties.osm_id}`
      if (seen.has(id)) continue
      seen.add(id)
      const [flon, flat] = f.geometry.coordinates
      if (distKm(lat, lon, flat, flon) > radiusKm) continue
      out.push({ id, name: f.properties.name || 'Dive shop', lat: flat, lon: flon, kind: 'shop' })
    }
    try {
      localStorage.setItem(key, JSON.stringify(out))
    } catch {
      /* 무시 */
    }
    return out
  } catch (e) {
    const saved = localStorage.getItem(key)
    if (saved) return JSON.parse(saved)
    throw e
  }
}

/* ---------------- 내 데이터 파일 (public/dive-sites) ---------------- */
interface DatasetIndex {
  updated: string
  count: number
  tiles: Record<string, number>
  /** 받은 구역 [남, 서, 북, 동] (없으면 전 세계) */
  chunks?: [number, number, number, number][]
}
type Row = [string, string, string?, string?, number?, number?, string?, string?]

let indexPromise: Promise<DatasetIndex | null> | null = null
function loadIndex(): Promise<DatasetIndex | null> {
  indexPromise ??= fetch('/dive-sites/index.json')
    .then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? r.json() : null))
    .catch(() => null)
  return indexPromise
}
const tileCache = new Map<string, Promise<Row[]>>()
function loadTile(key: string): Promise<Row[]> {
  if (!tileCache.has(key)) {
    const p = fetch(`/dive-sites/${key}.json`).then((r) => (r.ok ? r.json() : []))
    p.catch(() => tileCache.delete(key))
    tileCache.set(key, p)
  }
  return tileCache.get(key)!
}

/**
 * 앱에 내장된 전 세계 다이빙 포인트·샵 데이터에서 찾기 (빠르고 서버가 붐벼도 됨)
 * 데이터 파일이 아직 없으면 null → 실시간 조회로
 */
export async function findInDataset(lat: number, lon: number, radiusKm: number, lang: string): Promise<{ sites: OsmDiveSite[]; updated: string } | null> {
  const index = await loadIndex()
  if (!index) return null
  // 데이터를 못 받은 구역이면 실시간 조회로
  if (index.chunks && !index.chunks.some(([s, w, n, e]) => lat >= s && lat < n && lon >= w && lon < e)) return null
  const dLat = radiusKm / 111
  const dLon = radiusKm / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))
  const keys = new Set<string>()
  for (const la of [lat - dLat, lat + dLat])
    for (const lo of [lon - dLon, lon + dLon]) {
      const wrapped = ((((lo + 180) % 360) + 360) % 360) - 180
      keys.add(`${Math.floor((Math.max(-89.99, Math.min(89.99, la)) + 90) / 10)}_${Math.floor((wrapped + 180) / 10)}`)
    }
  const rows = (await Promise.all([...keys].filter((k) => index.tiles[k]).map(loadTile))).flat()
  const sites: OsmDiveSite[] = []
  for (const [id, en, ko, local, la, lo, kind, depth] of rows) {
    if (la == null || lo == null || distKm(lat, lon, la, lo) > radiusKm) continue
    const shop = kind === 'h'
    const name = (lang === 'ko' ? ko || en : en || ko) || local || (shop ? (lang === 'ko' ? '이름 없는 다이빙샵' : 'Unnamed dive shop') : lang === 'ko' ? '이름 없는 포인트' : 'Unnamed site')
    sites.push({ id: 'osm-' + id, name, lat: la, lon: lo, kind: shop ? 'shop' : 'site', depth: depth || undefined, local: local && local !== name ? local : undefined })
  }
  return { sites, updated: index.updated }
}
