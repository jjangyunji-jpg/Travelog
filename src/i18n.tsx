import { createContext, useContext } from 'react'
import type { Continent, Country } from './data/countries'
import type { DiveSpot } from './data/diveSpots'

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
    dive: '다이빙', travel: '여행', logbook: '로그북', addDive: '다이빙 기록', editDive: '다이빙 기록 수정',
    noDives: '아직 다이빙 기록이 없어요.', noDivesHint: '지도에서 🤿 다이빙 모드로 바꾸고 나라를 눌러 스팟을 찾아보세요.',
    spot: '다이빙 스팟', selectSpot: '스팟 선택', newSpot: '＋ 새 스팟 직접 추가', spotName: '스팟 이름', spotNamePh: '예: 문섬 새끼섬',
    location: '위치', pickOnMap: '🗺️ 지도에서 고르기', useGps: '📍 현재 위치', lat: '위도', lon: '경도',
    date: '날짜', time: '입수 시간', numbers: '다이빙 수치', maxDepth: '최대 수심', avgDepth: '평균 수심',
    bottomTime: '다이빙 시간', waterTemp: '수온', visibility: '시야', startBar: '시작 압력', endBar: '종료 압력',
    weight: '웨이트', gas: '기체', suit: '슈트', entry: '입수', boat: '보트', shore: '비치', current: '조류',
    curNone: '없음', curWeak: '약함', curMedium: '보통', curStrong: '강함', gear: '장비·환경', people: '함께한 사람',
    buddy: '버디', shop: '다이빙샵·가이드', marineLife: '본 생물', addCustom: '직접 입력 후 Enter',
    mood: '오늘 다이빙은 어땠나요?', condition: '몸 상태', diveNote: '다이빙 일기', diveNotePh: '물속에서 본 것, 느낀 것을 남겨 보세요…',
    totalDives: '총 다이빙', totalTime: '총 수중 시간', deepest: '최대 수심', diveCountries: '다이빙한 나라', species: '본 생물',
    spotsIn: '다이빙 스팟', mySpots: '내가 간 스팟', otherSpots: '추천 스팟', divesHere: '이 스팟 다이빙 기록',
    diveHere: '＋ 여기서 다이빙 기록', showAllSpots: '추천 스팟 표시', diveOffset: '이 앱 이전 다이빙 횟수',
    diveOffsetHint: '로그 번호가 이 숫자 다음부터 시작돼요.', times: '회', approx: '스팟 위치는 대략적인 좌표예요.',
    pickHint: '지도를 눌러 스팟 위치를 고르세요', confirm: '확인', diveTapHint: '나라를 누르면 다이빙 스팟이 보여요',
    noSpots: '등록된 스팟이 없어요. 직접 추가해 보세요.', viewDives: '🤿 다이빙 보기', recentDives: '최근 다이빙',

    sync: '기기 간 동기화', syncDesc: '휴대폰·노트북·아이패드에서 같은 기록을 보려면 Google Drive에 연결하세요. 데이터는 내 Drive의 앱 전용 숨김 폴더에 저장돼요.',
    syncConnect: 'Google Drive 연결', syncNow: '지금 동기화', syncOff: '연결 해제', syncing: '동기화 중…',
    synced: '동기화됨', syncError: '동기화 실패', syncLogin: '다시 로그인 필요 (눌러서 연결)', lastSync: '마지막 동기화',
    clientId: 'Google Client ID', clientIdHint: 'Google Cloud에서 만든 OAuth 클라이언트 ID를 붙여넣으세요.', never: '아직 안 함',
    seeAll: '전체 보기', airUsed: '사용 공기', unknownSpot: '알 수 없는 스팟', nitrox: '나이트록스',
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
    dive: 'Dive', travel: 'Travel', logbook: 'Logbook', addDive: 'Log a dive', editDive: 'Edit dive',
    noDives: 'No dives logged yet.', noDivesHint: 'Switch the map to 🤿 Dive mode and tap a country to explore dive sites.',
    spot: 'Dive site', selectSpot: 'Select a site', newSpot: '＋ Add a new site', spotName: 'Site name', spotNamePh: 'e.g. Secret Reef',
    location: 'Location', pickOnMap: '🗺️ Pick on map', useGps: '📍 Current location', lat: 'Lat', lon: 'Lon',
    date: 'Date', time: 'Time in', numbers: 'Dive data', maxDepth: 'Max depth', avgDepth: 'Avg depth',
    bottomTime: 'Bottom time', waterTemp: 'Water temp', visibility: 'Visibility', startBar: 'Start pressure', endBar: 'End pressure',
    weight: 'Weight', gas: 'Gas', suit: 'Suit', entry: 'Entry', boat: 'Boat', shore: 'Shore', current: 'Current',
    curNone: 'None', curWeak: 'Weak', curMedium: 'Medium', curStrong: 'Strong', gear: 'Gear & conditions', people: 'People',
    buddy: 'Buddy', shop: 'Dive shop / Guide', marineLife: 'Marine life', addCustom: 'Type and press Enter',
    mood: 'How was this dive?', condition: 'How you felt', diveNote: 'Dive diary', diveNotePh: 'What you saw and felt underwater…',
    totalDives: 'Total dives', totalTime: 'Time underwater', deepest: 'Deepest', diveCountries: 'Countries', species: 'Species',
    spotsIn: 'Dive sites', mySpots: 'My sites', otherSpots: 'Popular sites', divesHere: 'My dives here',
    diveHere: '＋ Log a dive here', showAllSpots: 'Show popular sites', diveOffset: 'Dives before this app',
    diveOffsetHint: 'Log numbers will continue from this number.', times: 'dives', approx: 'Site locations are approximate.',
    pickHint: 'Tap the map to set the site location', confirm: 'Done', diveTapHint: 'Tap a country to see dive sites',
    noSpots: 'No sites listed yet. Add your own.', viewDives: '🤿 View dives', recentDives: 'Recent dives',

    sync: 'Sync across devices', syncDesc: 'Connect Google Drive to use the same logbook on your phone, laptop and iPad. Data is stored in a hidden app folder in your own Drive.',
    syncConnect: 'Connect Google Drive', syncNow: 'Sync now', syncOff: 'Disconnect', syncing: 'Syncing…',
    synced: 'Synced', syncError: 'Sync failed', syncLogin: 'Sign in again (tap to connect)', lastSync: 'Last synced',
    clientId: 'Google Client ID', clientIdHint: 'Paste the OAuth client ID you created in Google Cloud.', never: 'Never',
    seeAll: 'See all', airUsed: 'Air used', unknownSpot: 'Unknown site', nitrox: 'Nitrox',
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
    spotName: (s: DiveSpot | undefined) => (s ? (lang === 'ko' ? s.nameKo : s.nameEn) : ''),
    pick: <T,>(ko: T, en: T) => (lang === 'ko' ? ko : en),
  }
}
