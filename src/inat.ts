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

const cache = new Map<string, Promise<unknown[]>>()
function cached<T>(url: string): Promise<T[]> {
  if (!cache.has(url)) {
    const p = fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('inat ' + r.status))))
      .then((j) => j.results as unknown[])
    p.catch(() => cache.delete(url))
    cache.set(url, p)
  }
  return cache.get(url)! as Promise<T[]>
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

/** 이름(한/영/학명)으로 생물 검색 */
export function searchSpecies(query: string, lang: string) {
  const q = new URLSearchParams({ q: query, per_page: '24', is_active: 'true', locale: lang, taxon_id: MARINE_TAXA.join(',') })
  return cached<InatTaxon>(`https://api.inaturalist.org/v1/taxa?${q}`)
}
