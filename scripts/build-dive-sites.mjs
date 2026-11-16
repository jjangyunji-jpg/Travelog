// 전 세계 다이빙 포인트·다이빙샵을 OpenStreetMap에서 받아 앱의 데이터 파일로 저장
// 실행: node scripts/build-dive-sites.mjs
// 결과: public/dive-sites/index.json + 위도·경도 10도 칸별 파일 (앱은 필요한 지역 칸만 받음)
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'

const OUT = new URL('../public/dive-sites/', import.meta.url)
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
// 전 세계를 한 번에 요청하면 서버 앞단이 1~2분 만에 끊어서(504), 36개 구역으로 나눠 받음
const query = ([s, w, n, e]) => {
  const bb = `(${s},${w},${n},${e})`
  return `[out:json][timeout:170];(nwr["sport"="scuba_diving"]${bb};nwr["leisure"="dive_site"]${bb};nwr["sport"="free_diving"]${bb};nwr["amenity"="dive_centre"]${bb};nwr["shop"="scuba_diving"]${bb};);out tags center;`
}
export const CHUNKS = []
for (let s = -90; s < 90; s += 30) for (let w = -180; w < 180; w += 60) CHUNKS.push([s, w, s + 30, w + 60])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function ask(url, q) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 180 * 1000)
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: new URLSearchParams({ data: q }),
      headers: { 'User-Agent': 'Travelog dive-site dataset builder (monthly)' },
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const json = await res.json()
    if (json.remark && /error|timed out|runtime/i.test(json.remark)) throw new Error(json.remark.slice(0, 120))
    return json.elements ?? []
  } finally {
    clearTimeout(t)
  }
}

// GitHub Actions 60분 제한 전에 받은 데이터까지 저장하고 끝내기
const DEADLINE = Date.now() + Number(process.env.DIVE_DEADLINE_MIN ?? 48) * 60 * 1000

/** 구역마다 서버를 바꿔 가며 최대 2바퀴 시도. 받은 구역 목록도 돌려줌 */
async function fetchAll() {
  const byId = new Map()
  const done = []
  for (const [i, box] of CHUNKS.entries()) {
    if (Date.now() > DEADLINE) {
      console.log(`마감 시간: ${i}/${CHUNKS.length} 구역까지 저장하고 종료 (나머지는 다음 실행에서)`)
      break
    }
    let ok = false
    for (let round = 0; round < 2 && !ok && Date.now() < DEADLINE; round++) {
      for (const url of ENDPOINTS) {
        try {
          const els = await ask(url, query(box))
          for (const e of els) byId.set(e.type + e.id, e)
          console.log(`구역 ${i + 1}/${CHUNKS.length} ${JSON.stringify(box)}: ${els.length}곳 (${new URL(url).hostname})`)
          ok = true
          break
        } catch (e) {
          console.log(`구역 ${i + 1} 실패 ${new URL(url).hostname}: ${e.message}`)
          await sleep(2000)
        }
      }
      if (!ok) await sleep(10000)
    }
    if (ok) done.push(box)
    await sleep(2000) // 서버 배려
  }
  if (!done.length) throw new Error('모든 구역 실패')
  return { elements: [...byId.values()], done }
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

const inBox = ([s, w, n, e], lat, lon) => lat >= s && lat < n && lon >= w && lon < e

if (import.meta.url === `file://${process.argv[1]}`) {
  // 이번에 받은 구역만 새것으로 바꾸고, 못 받은 구역은 예전 데이터를 유지 (실행할수록 채워짐)
  let prevChunks = []
  const prevRows = []
  const indexUrl = new URL('index.json', OUT)
  if (existsSync(indexUrl)) {
    const prev = JSON.parse(readFileSync(indexUrl, 'utf8'))
    prevChunks = prev.chunks ?? []
    for (const key of Object.keys(prev.tiles ?? {})) {
      const f = new URL(`${key}.json`, OUT)
      if (existsSync(f)) prevRows.push(...JSON.parse(readFileSync(f, 'utf8')))
    }
  }
  // 예전에 못 받은 구역부터 먼저 받기
  const missingFirst = (a, b) => Number(prevChunks.some((c) => c.join() === a.join())) - Number(prevChunks.some((c) => c.join() === b.join()))
  CHUNKS.sort(missingFirst)
  const { elements, done } = await fetchAll()
  const fresh = build(elements)
  const keep = prevRows.filter((r) => !done.some((box) => inBox(box, r[4], r[5])))
  const tiles = {}
  for (const r of keep) (tiles[`${Math.floor((r[4] + 90) / 10)}_${Math.floor((r[5] + 180) / 10)}`] ??= []).push(r)
  for (const [k, rows] of Object.entries(fresh.tiles)) (tiles[k] ??= []).push(...rows)
  const count = Object.values(tiles).reduce((n, rows) => n + rows.length, 0)
  const chunks = [...done, ...prevChunks.filter((c) => !done.some((d) => d.join() === c.join()))]
  mkdirSync(OUT, { recursive: true })
  for (const [key, rows] of Object.entries(tiles)) writeFileSync(new URL(`${key}.json`, OUT), JSON.stringify(rows))
  // 앱은 index에 있는 칸만 받고, 받지 못한 구역(chunks에 없음)은 실시간 조회로
  const index = {
    updated: new Date().toISOString().slice(0, 10),
    count,
    tiles: Object.fromEntries(Object.entries(tiles).map(([k, v]) => [k, v.length])),
    chunks,
    source: '© OpenStreetMap contributors (ODbL)',
  }
  writeFileSync(indexUrl, JSON.stringify(index))
  // 목록에 없는 옛날 칸 파일 정리
  for (const f of readdirSync(OUT)) if (/^\d+_\d+\.json$/.test(f) && !tiles[f.replace('.json', '')]) unlinkSync(new URL(f, OUT))
  console.log(`완료: ${count}곳, 칸 ${Object.keys(tiles).length}개, 이번에 받은 구역 ${done.length}, 전체 받은 구역 ${chunks.length}/${CHUNKS.length}`)
}
