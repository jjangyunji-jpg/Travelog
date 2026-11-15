import photos from './data/speciesPhotos.json'
import { SPECIES_BY_KEY, type Group } from './data/species'
import type { CustomSpecies } from './store'

const PHOTOS = photos as Record<string, { t: number; u: string; a: string }>

export type PhotoSize = 'square' | 'small' | 'medium'

export interface SpeciesView {
  key: string
  ko: string
  en: string
  sci: string
  emoji: string
  group?: Group
  photo?: (size: PhotoSize) => string
  attr?: string
  taxonId?: number
}

const sized = (u: string) => (size: PhotoSize) => u.replace('{s}', size)

/** 기록에 저장된 생물 키 → 화면에 보여줄 정보 (도감 / iNaturalist / 예전 직접 입력) */
export function speciesView(key: string, custom: Record<string, CustomSpecies> = {}): SpeciesView {
  const s = SPECIES_BY_KEY[key]
  if (s) {
    const p = PHOTOS[key]
    return { key, ko: s.ko, en: s.en, sci: s.sci, emoji: s.emoji, group: s.group, photo: p && sized(p.u), attr: p?.a, taxonId: p?.t }
  }
  const c = custom[key]
  if (c) return { key, ko: c.ko, en: c.en, sci: c.sci, emoji: '🐟', photo: c.photo ? sized(c.photo) : undefined, attr: c.attr }
  // 예전 버전에서 직접 입력한 이름
  return { key, ko: key, en: key, sci: '', emoji: '🐟' }
}

/** iNaturalist 분류번호 → 도감 키 (근처 관찰 기록을 도감과 연결) */
export const KEY_BY_TAXON: Record<number, string> = Object.fromEntries(Object.entries(PHOTOS).map(([k, p]) => [p.t, k]))
