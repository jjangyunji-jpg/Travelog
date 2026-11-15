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

const KEY = 'travelog:geo:'

export async function searchPlaces(q: string, lang: string, countryCode?: string, count = 6): Promise<PlaceResult[]> {
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

/** "도쿄, 요코하마" 같은 도시 문자열을 나눔 */
export const splitCities = (s: string) =>
  s
    .split(/[,，、·/]|\s{2,}/)
    .map((x) => x.trim())
    .filter(Boolean)

/** 예전 기록의 도시 이름들을 좌표로 (그 나라 안에서 첫 결과) */
export async function geocodeCities(cityText: string, country: string, lang: string): Promise<Place[]> {
  const out: Place[] = []
  for (const name of splitCities(cityText)) {
    const r = (await searchPlaces(name, lang, country, 1).catch(() => []))[0]
    if (r) out.push({ name, lat: r.lat, lon: r.lon })
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
