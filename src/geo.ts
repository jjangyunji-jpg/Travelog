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
