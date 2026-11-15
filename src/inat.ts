import type { CustomSpecies } from './store'

/** 바다 생물 분류 (iNaturalist taxon id) */
const MARINE_TAXA = [
  47273, // 상어·가오리
  47178, // 조기어류
  47113, // 누디브랜치
  47459, // 두족류
  39657, // 바다거북
  152871, // 고래·돌고래
  372843, 41736, // 물범·바다사자
  47186, // 십각류
  49796, // 갯가재
  48332, // 해파리
  492346, // 바다뱀
  46306, // 듀공
  50592, // 대왕조개
  47533, // 산호·말미잘
]
/** 물 밖에 사는 게 (소라게·육지게·바위게·달랑게) 제외 */
const EXCLUDE = [51731, 51074, 47190, 51932]
const OK = new Set(['cc0', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa', 'cc-by-nd', 'cc-by-nc-nd'])

export interface InatTaxon {
  id: number
  name: string
  preferred_common_name?: string
  english_common_name?: string
  default_photo?: { url: string; license_code: string | null; attribution: string } | null
}

export function toCustom(t: InatTaxon): CustomSpecies {
  const p = t.default_photo && OK.has(t.default_photo.license_code ?? '') ? t.default_photo : null
  const en = t.english_common_name || t.preferred_common_name || t.name
  return {
    key: 'inat:' + t.id,
    ko: t.preferred_common_name || en,
    en,
    sci: t.name,
    photo: p ? p.url.replace(/\/square\.(\w+)/, '/{s}.$1') : undefined,
    attr: p?.attribution,
  }
}

/* 응답을 기기에 저장해 두고, 오프라인이면 저장된 결과를 사용 */
const STORE_PREFIX = 'travelog:inat:'
function stored(url: string): unknown[] | null {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + url)
    return raw ? (JSON.parse(raw).results as unknown[]) : null
  } catch {
    return null
  }
}
function store(url: string, results: unknown[]) {
  try {
    localStorage.setItem(STORE_PREFIX + url, JSON.stringify({ at: Date.now(), results }))
  } catch {
    // 저장 공간이 부족하면 오래된 것부터 정리
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORE_PREFIX))
    keys.slice(0, Math.ceil(keys.length / 2)).forEach((k) => localStorage.removeItem(k))
  }
}

const cache = new Map<string, Promise<unknown[]>>()
function cached<T>(url: string): Promise<T[]> {
  if (!cache.has(url)) {
    const p = fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('inat ' + r.status))))
      .then((j) => {
        store(url, j.results)
        return j.results as unknown[]
      })
      .catch((e) => {
        cache.delete(url)
        const saved = stored(url)
        if (saved) return saved
        throw e
      })
    cache.set(url, p)
  }
  return cache.get(url)! as Promise<T[]>
}

/** 사진을 미리 받아 두기 (서비스워커가 기기에 저장) */
export async function prefetchImages(urls: string[], onProgress?: (done: number) => void) {
  let done = 0
  const queue = [...urls]
  const worker = async () => {
    while (queue.length) {
      const u = queue.shift()!
      await fetch(u, { mode: 'no-cors' }).catch(() => {})
      onProgress?.(++done)
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
}

/** 스팟 근처(반경 km)에서 연구 등급으로 관찰된 바다 생물, 관찰 수 많은 순 */
export function nearbySpecies(lat: number, lon: number, lang: string, radius = 12) {
  const q = new URLSearchParams({
    lat: lat.toFixed(4),
    lng: lon.toFixed(4),
    radius: String(radius),
    taxon_id: MARINE_TAXA.join(','),
    without_taxon_id: EXCLUDE.join(','),
    quality_grade: 'research',
    per_page: '60',
    locale: lang,
  })
  return cached<{ count: number; taxon: InatTaxon }>(`https://api.inaturalist.org/v1/observations/species_counts?${q}`)
}

/** 다이빙 전에: 스팟 근처 생물 목록과 사진을 미리 저장 (배 위 오프라인 대비) */
export async function prefetchSpot(lat: number, lon: number, lang: string) {
  const list = await nearbySpecies(lat, lon, lang)
  const urls = list
    .slice(0, 36)
    .map((x) => toCustom(x.taxon).photo)
    .filter((u): u is string => !!u)
    .map((u) => u.replace('{s}', 'small'))
  await prefetchImages(urls)
  return list.length
}

/** 이름(한/영/학명)으로 생물 검색 */
export function searchSpecies(query: string, lang: string) {
  const q = new URLSearchParams({ q: query, per_page: '24', is_active: 'true', locale: lang, taxon_id: MARINE_TAXA.join(',') })
  return cached<InatTaxon>(`https://api.inaturalist.org/v1/taxa?${q}`)
}
