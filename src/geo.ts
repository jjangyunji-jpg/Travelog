/**
 * 도시 이름 → 좌표 (Open-Meteo 지명 검색, 무료·키 없음, 한국어 이름 지원)
 * 결과는 기기에 저장해 같은 검색을 반복하지 않음
 */
export interface Place {
  name: string
  lat: number
  lon: number
}
export interface PlaceResult extends Place {
  admin?: string
  country?: string
  countryCode?: string
}

import { KNOWN_PLACES, normName } from './data/places'
import { BUILTIN_SPOTS } from './data/diveSpots'

const KEY = 'travelog:geo:'

/** 나라가 맞는지 (괌·사이판처럼 해외 영토는 속한 나라도 인정) */
const countryOk = (cc: string | undefined, parent: string | undefined, want?: string) => !want || cc === want || parent === want

/** 1) 앱에 내장된 여행지 사전 (오프라인·즉시) */
export function knownPlaces(q: string, country?: string, limit = 6): PlaceResult[] {
  const n = normName(q)
  if (!n) return []
  const stripped = n.replace(/(섬|도|시|군)$/, '')
  const out: PlaceResult[] = []
  for (const p of KNOWN_PLACES) {
    if (!countryOk(p.country, p.parent, country)) continue
    const names = p.names.map(normName)
    const exact = names.some((x) => x === n || x === stripped)
    const prefix = !exact && n.length >= 2 && names.some((x) => x.startsWith(n))
    if (exact || prefix) out.push({ name: p.names[0], lat: p.lat, lon: p.lon, countryCode: p.country, exact } as PlaceResult & { exact: boolean })
  }
  return (out as (PlaceResult & { exact: boolean })[]).sort((a, b) => Number(b.exact) - Number(a.exact)).slice(0, limit)
}

/** 3) 다이빙 스팟 목록의 이름 (예: '모알보알' → 모알보알 정어리 떼) */
function spotPlaces(q: string, country?: string): PlaceResult[] {
  const n = normName(q)
  if (n.length < 2) return []
  return BUILTIN_SPOTS.filter((s) => (!country || s.country === country) && [s.nameKo, s.nameEn].some((x) => normName(x).includes(n)))
    .slice(0, 3)
    .map((s) => ({ name: q.trim(), lat: s.lat, lon: s.lon, countryCode: s.country }))
}

async function searchOnline(q: string, lang: string, countryCode?: string, count = 6): Promise<PlaceResult[]> {
  const query = q.trim()
  if (query.length < 1) return []
  const params = new URLSearchParams({ name: query, count: String(count), language: lang, format: 'json' })
  if (countryCode) params.set('countryCode', countryCode)
  const url = `https://geocoding-api.open-meteo.com/v1/search?${params}`
  try {
    const hit = localStorage.getItem(KEY + url)
    if (hit) return JSON.parse(hit)
  } catch {
    /* 무시 */
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error('geo ' + res.status)
  const json = await res.json()
  const list: PlaceResult[] = (json.results ?? []).map((r: Record<string, unknown>) => ({
    // '요코하마 시' → '요코하마'
    name: String(r.name).replace(/\s?(시|군|현|구)$/, ''),
    lat: r.latitude as number,
    lon: r.longitude as number,
    admin: r.admin1 as string | undefined,
    country: r.country as string | undefined,
    countryCode: r.country_code as string | undefined,
  }))
  try {
    localStorage.setItem(KEY + url, JSON.stringify(list))
  } catch {
    /* 무시 */
  }
  return list
}

/**
 * 도시 검색: 내장 사전 → 지명 검색(한국어) → 이름 바꿔 다시('○○시', '섬/도' 떼기) → 다이빙 스팟 이름
 * 인터넷 오류는 throw (나중에 다시 시도하도록)
 */
export async function searchPlaces(q: string, lang: string, countryCode?: string, count = 6): Promise<PlaceResult[]> {
  const known = knownPlaces(q, countryCode, count)
  let online: PlaceResult[] = []
  let failed: unknown
  const tries = [q.trim(), q.trim().replace(/(섬|도|시)$/, ''), q.trim() + ' 시'].filter((x, i, a) => x.length >= 1 && a.indexOf(x) === i)
  for (const t of tries) {
    if (known.some((k) => (k as PlaceResult & { exact?: boolean }).exact)) break
    try {
      online = await searchOnline(t, lang, countryCode, count)
    } catch (e) {
      failed = e
      break
    }
    if (online.length) break
  }
  const merged = [...known]
  for (const r of online) if (!merged.some((m) => Math.abs(m.lat - r.lat) < 0.05 && Math.abs(m.lon - r.lon) < 0.05)) merged.push(r)
  if (!merged.length) merged.push(...spotPlaces(q, countryCode))
  if (!merged.length && failed) throw failed
  return merged.slice(0, count)
}

/** "도쿄, 요코하마" 같은 도시 문자열을 나눔 */
export const splitCities = (s: string) =>
  s
    .split(/[,，、·/]|\s{2,}/)
    .map((x) => x.trim())
    .filter(Boolean)

/** 예전 기록의 도시 이름들을 좌표로 (그 나라 안에서 첫 결과) */
export async function geocodeCities(cityText: string, country: string, lang: string): Promise<Place[] & { failed?: boolean }> {
  const out: Place[] & { failed?: boolean } = []
  for (const name of splitCities(cityText)) {
    try {
      const r = (await searchPlaces(name, lang, country, 1))[0]
      if (r) out.push({ name, lat: r.lat, lon: r.lon })
    } catch {
      out.failed = true // 인터넷 문제 → 나중에 다시
    }
  }
  return out
}

/** 단어 끝의 조사 떼기 (겹친 조사도: 파리에서의 → 파리) */
function stripParticles(w: string): string {
  let cur = w
  for (let i = 0; i < 3; i++) {
    const next = cur.replace(/(에서|으로|로|와|과|의|에|은|는|을|를)$/u, '')
    if (next === cur || next.length < 2) break
    cur = next
  }
  return cur
}

/**
 * 제목에서 지명 후보 뽑기: "2024 오키나와 다이빙 여행" → ["오키나와", "오키나"]
 * 원래 단어를 먼저, 조사를 뗀 단어를 다음 후보로 (그 나라 안에서 먼저 찾아지는 것을 사용)
 */
export function placeWordsFromTitle(title: string): string[] {
  const cleaned = title
    .replace(/\d+(년|월|일|박|차)?/g, ' ')
    .replace(/(여행|트립|투어|휴가|출장|가족|친구|배낭|신혼|다이빙|일주일|일주|여름|겨울|봄|가을|두\s?번째|세\s?번째)/g, ' ')
    .replace(/(^|\s)첫(?=\s|$)/g, ' ')
    .replace(/\b(trip|travel|vacation|holiday|tour|diving|dive|first|with|family|in|to|the|my)\b/gi, ' ')
    .replace(/[^\p{L}\s]/gu, ' ')
    .trim()
  const words = cleaned.split(/\s+/).filter((w) => w.length >= 2)
  const out: string[] = []
  for (const w of words) out.push(w, stripParticles(w))
  return [...new Set(out.filter((w) => w.length >= 2))]
}

/** 도시 칸이 비어 있는 기록: 제목에서 그 나라 안의 지명을 찾아봄 */
export async function geocodeFromTitle(title: string, country: string, lang: string): Promise<Place | undefined> {
  for (const w of placeWordsFromTitle(title)) {
    const r = (await searchPlaces(w, lang, country, 1).catch(() => []))[0]
    if (r) return { name: r.name, lat: r.lat, lon: r.lon }
  }
  return undefined
}
