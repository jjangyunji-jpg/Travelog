// 전 세계 다이빙 포인트·다이빙샵을 OpenStreetMap에서 받아 앱의 데이터 파일로 저장
// 실행: node scripts/build-dive-sites.mjs
// 결과: public/dive-sites/index.json + 위도·경도 10도 칸별 파일 (앱은 필요한 지역 칸만 받음)
import { mkdirSync, writeFileSync } from 'node:fs'

const OUT = new URL('../public/dive-sites/', import.meta.url)
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
const QUERY = `[out:json][timeout:900][maxsize:1073741824];(
nwr["sport"="scuba_diving"];
nwr["leisure"="dive_site"];
nwr["sport"="free_diving"];
nwr["amenity"="dive_centre"];
nwr["shop"="scuba_diving"];
);out tags center;`

async function fetchAll() {
  for (let round = 0; round < 3; round++) {
    for (const url of ENDPOINTS) {
      try {
        console.log('요청:', url)
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), 15 * 60 * 1000)
        const res = await fetch(url, {
          method: 'POST',
          body: new URLSearchParams({ data: QUERY }),
          headers: { 'User-Agent': 'Travelog dive-site dataset builder' },
          signal: ctrl.signal,
        })
        clearTimeout(t)
        if (!res.ok) throw new Error('HTTP ' + res.status)
        const json = await res.json()
        if (!json.elements?.length) throw new Error('결과 없음 ' + (json.remark ?? ''))
        return json.elements
      } catch (e) {
        console.log('실패:', url, e.message)
      }
    }
    await new Promise((r) => setTimeout(r, 30000 * (round + 1)))
  }
  throw new Error('모든 Overpass 서버 실패')
}

/** Overpass 결과 → 10도 칸별 묶음 */
export function build(elements) {
  const tiles = {}
  let count = 0
  for (const e of elements) {
    const lat = e.lat ?? e.center?.lat
    const lon = e.lon ?? e.center?.lon
    if (lat == null || lon == null) continue
    const t = e.tags ?? {}
    const shop = !!(t.shop || t.amenity || t.office || t.tourism || t.club)
    const en = t['name:en'] || t.name || ''
    const ko = t['name:ko'] || ''
    const local = t.name && t.name !== en ? t.name : ''
    if (shop && !en && !ko) continue // 이름 없는 샵은 제외
    const depth = t['scuba_diving:maxdepth'] || t.maxdepth || ''
    // [id, 영어·대표 이름, 한국어 이름, 현지어 이름, 위도, 경도, 종류(s 포인트 / h 샵), 최대 수심]
    const row = [e.type[0] + e.id, en, ko, local, Math.round(lat * 1e5) / 1e5, Math.round(lon * 1e5) / 1e5, shop ? 'h' : 's', depth]
    while (row.length && row[row.length - 1] === '') row.pop()
    const key = `${Math.floor((lat + 90) / 10)}_${Math.floor((lon + 180) / 10)}`
    ;(tiles[key] ??= []).push(row)
    count++
  }
  return { tiles, count }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const elements = await fetchAll()
  const { tiles, count } = build(elements)
  mkdirSync(OUT, { recursive: true })
  for (const [key, rows] of Object.entries(tiles)) writeFileSync(new URL(`${key}.json`, OUT), JSON.stringify(rows))
  // 앱은 index에 있는 칸만 받음
  const index = {
    updated: new Date().toISOString().slice(0, 10),
    count,
    tiles: Object.fromEntries(Object.entries(tiles).map(([k, v]) => [k, v.length])),
    source: '© OpenStreetMap contributors (ODbL)',
  }
  writeFileSync(new URL('index.json', OUT), JSON.stringify(index))
  console.log(`완료: ${count}곳, 칸 ${Object.keys(tiles).length}개`)
}
