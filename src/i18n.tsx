import { createContext, useContext } from 'react'
import type { Continent, Country } from './data/countries'

export type Lang = 'ko' | 'en'

const dict = {
  ko: {
    map: '지도', journal: '기록', stats: '통계', list: '나라',
    visited: '가 봤어요', wish: '가고 싶어요', none: '표시 안 함',
    countries: '개국', ofWorld: '세계의', share: '공유', shareMap: '내 여행 지도 공유',
    addTrip: '여행 기록 추가', editTrip: '여행 기록 수정', noTrips: '아직 여행 기록이 없어요.',
    noTripsHint: '지도에서 나라를 누르고 여행 기록을 남겨 보세요.',
    title: '제목', titlePh: '예: 첫 유럽 배낭여행', city: '도시', cityPh: '예: 파리, 니스',
    start: '시작일', end: '종료일', note: '여행 일기', notePh: '그날의 기억을 남겨 보세요…',
    photos: '사진', addPhoto: '사진 추가', save: '저장', cancel: '취소', delete: '삭제',
    confirmDelete: '이 기록을 삭제할까요?', search: '나라 검색', all: '전체',
    visitedCountries: '방문한 나라', wishCountries: '가고 싶은 나라', trips: '여행 기록',
    byContinent: '대륙별', settings: '설정', backup: '백업 내보내기', restore: '백업 불러오기',
    restoreDone: '백업을 불러왔어요.', restoreFail: '백업 파일을 읽을 수 없어요.',
    language: 'English', tapHint: '나라를 눌러 표시해 보세요', close: '닫기',
    country: '나라', download: '이미지 저장', myMap: '나의 여행 지도', selectCountry: '나라 선택',
    days: '일', reset: '초기화',
  },
  en: {
    map: 'Map', journal: 'Journal', stats: 'Stats', list: 'Countries',
    visited: 'Been there', wish: 'Want to go', none: 'Clear',
    countries: 'countries', ofWorld: 'of the world', share: 'Share', shareMap: 'Share my travel map',
    addTrip: 'Add a trip', editTrip: 'Edit trip', noTrips: 'No trips yet.',
    noTripsHint: 'Tap a country on the map and log your first trip.',
    title: 'Title', titlePh: 'e.g. First backpacking trip', city: 'Cities', cityPh: 'e.g. Paris, Nice',
    start: 'Start', end: 'End', note: 'Travel diary', notePh: 'Write down what you remember…',
    photos: 'Photos', addPhoto: 'Add photos', save: 'Save', cancel: 'Cancel', delete: 'Delete',
    confirmDelete: 'Delete this trip?', search: 'Search countries', all: 'All',
    visitedCountries: 'Visited', wishCountries: 'Wishlist', trips: 'Trips',
    byContinent: 'By continent', settings: 'Settings', backup: 'Export backup', restore: 'Import backup',
    restoreDone: 'Backup restored.', restoreFail: 'Could not read that backup file.',
    language: '한국어', tapHint: 'Tap a country to mark it', close: 'Close',
    country: 'Country', download: 'Save image', myMap: 'My Travel Map', selectCountry: 'Select a country',
    days: 'days', reset: 'Reset',
  },
} as const

export type Dict = (typeof dict)['ko']

const continentNames: Record<Lang, Record<Continent, string>> = {
  ko: { AS: '아시아', EU: '유럽', NA: '북아메리카', SA: '남아메리카', AF: '아프리카', OC: '오세아니아', AN: '남극' },
  en: { AS: 'Asia', EU: 'Europe', NA: 'North America', SA: 'South America', AF: 'Africa', OC: 'Oceania', AN: 'Antarctica' },
}

export const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'ko', setLang: () => {} })

export function useI18n() {
  const { lang, setLang } = useContext(I18nContext)
  return {
    lang,
    setLang,
    t: dict[lang] as Dict,
    cName: (c: Country | undefined) => (c ? (lang === 'ko' ? c.nameKo : c.nameEn) : ''),
    contName: (c: Continent) => continentNames[lang][c],
  }
}
