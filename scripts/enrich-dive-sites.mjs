// AI로 다이빙 포인트가 비어 있는 지역을 채우기 (OpenAI + 지도 검색으로 위치 검증)
// 실행: OPENAI_API_KEY=... node scripts/enrich-dive-sites.mjs
// - 대상: Travelog 추천 스팟 지역 → 다이빙샵은 있는데 포인트가 적은 지역 순
// - AI가 알려준 포인트 이름을 Photon 지도 검색으로 찾아, 그 지역 근처 실제 지명만 저장
// - 결과: public/dive-sites/ai/{칸}.json + index.json의 ai 항목 (OpenStreetMap 갱신과 별도 보관)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const DIR = new URL('../public/dive-sites/', import.meta.url)
const AI_DIR = new URL('ai/', DIR)
const KEY = process.env.OPENAI_API_KEY
const MAX_AREAS = Number(process.env.AI_MAX_AREAS ?? 150)
const DEADLINE = Date.now() + Number(process.env.AI_DEADLINE_MIN ?? 45) * 60 * 1000
const RADIUS_KM = 15
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export const distKm = (aLat, aLon, bLat, bLon) => {
  const R = 6371
  const dLa = ((bLat - aLat) * Math.PI) / 180
  const dLo = ((bLon - aLon) * Math.PI) / 180
  const h = Math.sin(dLa / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLo / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
const tileKey = (lat, lon) => `${Math.floor((lat + 90) / 10)}_${Math.floor((lon + 180) / 10)}`
const cellKey = (lat, lon) => `${Math.round(lat * 10) / 10},${Math.round(lon * 10) / 10}`

/* ---------------- 대상 지역 고르기 ---------------- */
function loadRows(index) {
  const rows = []
  for (const k of Object.keys(index.tiles ?? {})) {
    const f = new URL(`${k}.json`, DIR)
    if (existsSync(f)) rows.push(...JSON.parse(readFileSync(f, 'utf8')))
  }
  return rows
}

/** Travelog 추천 스팟 (src/data/diveSpots.ts 의 [나라, 영어, 한국어, 위도, 경도, ...]) */
function builtinAreas() {
  const src = readFileSync(new URL('../src/data/diveSpots.ts', import.meta.url), 'utf8')
  return [...src.matchAll(/\[\s*'([A-Z]{2})',\s*(?:'([^']*)'|"([^"]*)"),\s*'([^']*)',\s*(-?[\d.]+),\s*(-?[\d.]+)/g)].map((m) => ({
    country: m[1],
    name: m[2] ?? m[3],
    nameKo: m[4],
    lat: Number(m[5]),
    lon: Number(m[6]),
    priority: 2,
  }))
}

/** 다이빙샵이 모여 있는데 포인트가 적은 곳 */
function shopHubs(rows) {
  const cells = new Map()
  for (const r of rows) {
    if (r[6] !== 'h') continue
    const k = cellKey(r[4], r[5])
    const c = cells.get(k) ?? { lat: 0, lon: 0, n: 0, name: r[1] }
    c.lat += r[4]
    c.lon += r[5]
    c.n++
    cells.set(k, c)
  }
  return [...cells.values()]
    .filter((c) => c.n >= 2)
    .map((c) => ({ lat: c.lat / c.n, lon: c.lon / c.n, name: '', shopName: c.name, priority: 1, shops: c.n }))
    .sort((a, b) => b.shops - a.shops)
}

export function pickAreas(rows, aiRows, done, builtin) {
  const sitesNear = (a) => [...rows, ...aiRows].filter((r) => r[6] !== 'h' && distKm(a.lat, a.lon, r[4], r[5]) <= 12).length
  const out = []
  const seen = new Set(Object.keys(done))
  for (const a of [...builtin, ...shopHubs(rows)]) {
    const k = cellKey(a.lat, a.lon)
    if (seen.has(k)) continue
    seen.add(k)
    if (sitesNear(a) >= 5) continue // 이미 충분
    out.push(a)
  }
  return out
}

/* ---------------- 지도 검색 (Photon) ---------------- */
async function photon(params) {
  const res = await fetch(`https://photon.komoot.io/${params}`, { headers: { 'User-Agent': 'Travelog dive-site enrichment (monthly)' } })
  if (!res.ok) throw new Error('photon ' + res.status)
  return (await res.json()).features ?? []
}

async function placeLabel(a) {
  if (a.name) return `${a.name}${a.country ? ' (' + a.country + ')' : ''}`
  try {
    const f = (await photon(`reverse?lat=${a.lat}&lon=${a.lon}`))[0]?.properties ?? {}
    return [f.city || f.town || f.village || f.locality || f.district, f.state, f.country].filter(Boolean).join(', ') || `${a.lat.toFixed(3)}, ${a.lon.toFixed(3)}`
  } catch {
    return `${a.lat.toFixed(3)}, ${a.lon.toFixed(3)}`
  }
}

/** AI가 준 이름들 중 그 지역 근처(15km)에서 실제로 찾아지는 지명의 위치 */
export async function locate(site, area) {
  const tries = [site.local, site.landmark, site.en].filter(Boolean)
  for (const q of tries) {
    await sleep(1100) // Photon 이용 예절
    let feats = []
    try {
      feats = await photon(`api/?${new URLSearchParams({ q, lat: String(area.lat), lon: String(area.lon), limit: '5' })}`)
    } catch {
      continue
    }
    for (const f of feats) {
      const [lon, lat] = f.geometry.coordinates
      const d = distKm(area.lat, area.lon, lat, lon)
      // 너무 넓은 지명(도시·섬 전체 등)은 제외
      const v = f.properties.osm_value
      if (d <= RADIUS_KM && !['city', 'town', 'county', 'state', 'country', 'island', 'archipelago'].includes(v)) return { lat, lon, matched: f.properties.name }
    }
  }
  return null
}

/* ---------------- OpenAI ---------------- */
let modelPromise
/** 계정에서 쓸 수 있는 가벼운 모델 자동 선택 (OPENAI_MODEL 로 지정 가능) */
export function pickModel(available) {
  const prefs = [/^gpt-5(\.\d+)?-mini$/, /^gpt-4\.1-mini$/, /^gpt-4o-mini$/, /mini/]
  for (const p of prefs) {
    const m = available.filter((id) => p.test(id)).sort().reverse()[0]
    if (m) return m
  }
  return available.find((id) => id.startsWith('gpt-')) ?? 'gpt-4o-mini'
}
async function model() {
  if (process.env.OPENAI_MODEL) return process.env.OPENAI_MODEL
  modelPromise ??= fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${KEY}` } })
    .then((r) => (r.ok ? r.json() : { data: [] }))
    .then((j) => pickModel((j.data ?? []).map((m) => m.id)))
  return modelPromise
}

async function askAI(label, area) {
  const prompt = `List well-known recreational scuba diving sites within about ${RADIUS_KM} km of ${label} (lat ${area.lat.toFixed(3)}, lon ${area.lon.toFixed(3)}).
Only include real, commonly known dive sites that local dive shops actually visit. If you are not sure, return fewer (or none). Maximum 12.
For each site give: "local" (name in the local language/script as used locally), "en" (English name), "ko" (Korean name if one is commonly used, else ""), "landmark" (a nearby named place on a map, e.g. a cave, rock, bay, beach or harbour, in the local language), "type" (reef/wall/wreck/cave/muck/drift/pinnacle) and "depth" (typical max depth in metres as a number, or null).
Answer as JSON: {"sites":[...]}`
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: await model(),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a careful scuba diving guide. You never invent dive sites.' },
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status} ${(await res.text()).slice(0, 200)}`)
  const json = await res.json()
  const text = json.choices?.[0]?.message?.content ?? '{}'
  return { sites: JSON.parse(text).sites ?? [], usage: json.usage }
}

/* ---------------- 실행 ---------------- */
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!KEY) {
    console.log('OPENAI_API_KEY 가 없어서 AI 채우기를 건너뜀')
    process.exit(0)
  }
  const indexUrl = new URL('index.json', DIR)
  if (!existsSync(indexUrl)) {
    console.log('다이빙 포인트 데이터(index.json)가 아직 없음')
    process.exit(0)
  }
  const index = JSON.parse(readFileSync(indexUrl, 'utf8'))
  const ai = index.ai ?? { tiles: {}, done: {} }
  const aiRows = []
  for (const k of Object.keys(ai.tiles ?? {})) {
    const f = new URL(`${k}.json`, AI_DIR)
    if (existsSync(f)) aiRows.push(...JSON.parse(readFileSync(f, 'utf8')))
  }
  const rows = loadRows(index)
  const areas = pickAreas(rows, aiRows, ai.done ?? {}, builtinAreas()).slice(0, MAX_AREAS)
  console.log(`대상 지역 ${areas.length}곳, 모델 ${await model()}`)
  let added = 0
  let tokens = 0
  for (const [i, area] of areas.entries()) {
    if (Date.now() > DEADLINE) {
      console.log(`마감 시간: ${i}곳까지 하고 종료 (나머지는 다음 달)`)
      break
    }
    const label = await placeLabel(area)
    let sites = []
    try {
      const r = await askAI(label, area)
      sites = r.sites
      tokens += r.usage?.total_tokens ?? 0
    } catch (e) {
      console.log(`AI 실패 ${label}: ${e.message}`)
      if (/40[13]/.test(e.message)) break // 키 문제면 중단
      continue
    }
    let ok = 0
    for (const s of sites.slice(0, 12)) {
      const pos = await locate(s, area)
      if (!pos) continue
      const dup = [...rows, ...aiRows].some((r) => r[6] !== 'h' && (distKm(r[4], r[5], pos.lat, pos.lon) < 0.3 || (r[1] && s.en && r[1].toLowerCase() === s.en.toLowerCase())))
      if (dup) continue
      const id = `ai${Math.round(pos.lat * 1e4)}_${Math.round(pos.lon * 1e4)}`
      // [id, 영어 이름, 한국어 이름, 현지어 이름, 위도, 경도, 'a'(AI 추천), 최대 수심]
      const row = [id, s.en || s.local || pos.matched, s.ko || '', s.local && s.local !== s.en ? s.local : '', Math.round(pos.lat * 1e5) / 1e5, Math.round(pos.lon * 1e5) / 1e5, 'a', s.depth ? String(s.depth) : '']
      while (row.length && row[row.length - 1] === '') row.pop()
      aiRows.push(row)
      ok++
    }
    added += ok
    ai.done[cellKey(area.lat, area.lon)] = new Date().toISOString().slice(0, 10)
    console.log(`${i + 1}/${areas.length} ${label}: AI ${sites.length}곳 → 위치 확인 ${ok}곳`)
  }
  // 칸별로 저장
  const tiles = {}
  for (const r of aiRows) (tiles[tileKey(r[4], r[5])] ??= []).push(r)
  mkdirSync(AI_DIR, { recursive: true })
  for (const [k, list] of Object.entries(tiles)) writeFileSync(new URL(`${k}.json`, AI_DIR), JSON.stringify(list))
  index.ai = { updated: new Date().toISOString().slice(0, 10), count: aiRows.length, tiles: Object.fromEntries(Object.entries(tiles).map(([k, v]) => [k, v.length])), done: ai.done }
  writeFileSync(indexUrl, JSON.stringify(index))
  console.log(`완료: 이번에 ${added}곳 추가, AI 추천 전체 ${aiRows.length}곳, 사용 토큰 ${tokens}`)
}
