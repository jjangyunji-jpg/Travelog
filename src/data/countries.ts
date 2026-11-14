import isoCountries from 'i18n-iso-countries'
import en from 'i18n-iso-countries/langs/en.json'
import ko from 'i18n-iso-countries/langs/ko.json'
import { countries as countryList } from 'countries-list'

isoCountries.registerLocale(en)
isoCountries.registerLocale(ko)

export type Continent = 'AF' | 'AN' | 'AS' | 'EU' | 'NA' | 'OC' | 'SA'

export interface Country {
  code: string
  nameEn: string
  nameKo: string
  continent: Continent
  /** 독립국 여부 (세계 % 계산에 사용) */
  sovereign: boolean
}

/** 독립국이 아닌 해외 영토·특수 지역 (통계의 분모에서 제외) */
const TERRITORIES = new Set(
  ('AI AQ AS AW AX BL BM CK CW EH FK FO GG GL GS GU HK HM IM IO JE KY MF MO MP MS NC NF NU PF PM PN PR SH SX TC TF VG VI WF ' +
    'AC BQ BV CC CX GF GI GP MQ RE SJ TA TK UM YT').split(' '),
)

/** 라이브러리 기본 이름 대신 쓸 한국어 이름 */
const KO_OVERRIDES: Record<string, string> = {
  TW: '대만', CZ: '체코', RU: '러시아', MK: '북마케도니아', SZ: '에스와티니', TC: '터크스 케이커스 제도',
  BQ: '카리브 네덜란드(보네르)', CW: '퀴라소', CG: '콩고 공화국', FM: '미크로네시아 연방', CV: '카보베르데',
}

const EXTRA_NAMES: Record<string, { en: string; ko: string }> = {
  XK: { en: 'Kosovo', ko: '코소보' },
  AC: { en: 'Ascension Island', ko: '어센션섬' },
  TA: { en: 'Tristan da Cunha', ko: '트리스탄다쿠냐' },
}

export const COUNTRIES: Country[] = Object.entries(countryList)
  .map(([code, c]) => ({
    code,
    nameEn: isoCountries.getName(code, 'en') ?? EXTRA_NAMES[code]?.en ?? c.name,
    nameKo: KO_OVERRIDES[code] ?? isoCountries.getName(code, 'ko') ?? EXTRA_NAMES[code]?.ko ?? c.name,
    continent: c.continent as Continent,
    sovereign: !TERRITORIES.has(code),
  }))
  .sort((a, b) => a.nameEn.localeCompare(b.nameEn))

export const COUNTRY_BY_CODE: Record<string, Country> = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]))

export const SOVEREIGN_COUNT = COUNTRIES.filter((c) => c.sovereign).length

export const CONTINENTS: Continent[] = ['AS', 'EU', 'NA', 'SA', 'AF', 'OC', 'AN']

export const flagEmoji = (code: string) =>
  String.fromCodePoint(...[...code.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65))

/** 지도 데이터의 숫자 코드 → 알파2 코드 */
export const numericToAlpha2 = (id: string) => isoCountries.numericToAlpha2(id)
