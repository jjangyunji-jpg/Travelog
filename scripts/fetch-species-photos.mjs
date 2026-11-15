// 도감(src/data/species.ts)의 학명으로 iNaturalist에서 CC 라이선스 사진을 찾아 speciesPhotos.json 생성
// 실행: node scripts/fetch-species-photos.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/data/species.ts', import.meta.url), 'utf8')
const rows = [...src.matchAll(/^\s*\['(\w+)', '[^']*', '[^']*', (?:'[^']*'|"[^"]*"), '([^']*)'/gm)].map((m) => ({ key: m[1], sci: m[2] }))
const onlyArg = process.argv.find((a) => a.startsWith('--only='))
const only = onlyArg ? onlyArg.slice(7).split(',') : []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// 이미 받은 사진은 그대로 두고 빠진 것만 받기 (--all 이면 전부 다시)
let out = {}
try {
  if (!process.argv.includes('--all')) out = JSON.parse(readFileSync(new URL('../src/data/speciesPhotos.json', import.meta.url), 'utf8'))
} catch {
  out = {}
}
// 상업적 이용 가능한 라이선스를 먼저, 없으면 비상업 라이선스
const COMMERCIAL = ['cc0', 'cc-by', 'cc-by-sa']
const NONCOMMERCIAL = ['cc-by-nc', 'cc-by-nc-sa', 'cc-by-nd', 'cc-by-nc-nd']
const rank = (l) => (COMMERCIAL.includes(l) ? 0 : NONCOMMERCIAL.includes(l) ? 1 : 9)

async function get(url) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': 'travelog-species-script' } })
    if (r.ok) return r.json()
    await sleep(2000 * (i + 1))
  }
  throw new Error('failed ' + url)
}

for (const { key, sci } of rows) {
  if (!sci || (out[key] && !only.includes(key))) continue
  if (only.length && !only.includes(key)) continue
  // 학명이 정확히 같은 분류만 사용 (비슷한 이름의 다른 생물 사진이 붙지 않도록)
  const res = await get(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(sci)}&per_page=30&is_active=true`)
  const taxon = res.results.find((t) => t.name === sci)
  if (!taxon) {
    console.log('NOT FOUND (exact)', key, sci, '→', res.results.slice(0, 3).map((t) => t.name).join(', '))
    delete out[key]
    continue
  }
  // 대표 사진 + 등록된 사진들 중 라이선스가 가장 자유로운 것
  const full = await get(`https://api.inaturalist.org/v1/taxa/${taxon.id}`)
  await sleep(1000)
  const candidates = [taxon.default_photo, ...(full.results[0].taxon_photos ?? []).map((p) => p.photo)].filter(Boolean)
  let photo = candidates
    .map((p, i) => ({ p, r: rank(p.license_code), i }))
    .filter((x) => x.r < 9)
    .sort((a, b) => a.r - b.r || a.i - b.i)[0]?.p
  // 대표 사진에 상업 이용 가능한 게 없으면, 관찰 사진 중 상업 이용 가능 + 추천 많은 사진
  if (!photo || !COMMERCIAL.includes(photo.license_code)) {
    const obs = await get(
      `https://api.inaturalist.org/v1/observations?taxon_id=${taxon.id}&photo_license=cc0,cc-by,cc-by-sa&quality_grade=research&order_by=votes&per_page=5&photos=true`,
    )
    await sleep(1000)
    const op = obs.results.flatMap((o) => o.photos ?? []).find((p) => COMMERCIAL.includes(p.license_code))
    if (op) photo = op
  }
  if (!photo) {
    console.log('NO CC PHOTO', key, sci)
    continue
  }
  out[key] = {
    t: taxon.id,
    u: photo.url.replace(/\/square\.(\w+)/, '/{s}.$1'),
    a: photo.attribution,
    l: photo.license_code,
  }
  console.log('ok', key, taxon.name, photo.license_code)
  await sleep(1100)
}
writeFileSync(new URL('../src/data/speciesPhotos.json', import.meta.url), JSON.stringify(out, null, 0))
// 직접 골라 둔 사진 (scripts/photo-overrides.json) 적용
try {
  const overrides = JSON.parse(readFileSync(new URL('./photo-overrides.json', import.meta.url), 'utf8'))
  for (const [key, o] of Object.entries(overrides)) if (out[key]) out[key] = { ...out[key], ...o }
} catch {
  /* 없음 */
}
writeFileSync(new URL('../src/data/speciesPhotos.json', import.meta.url), JSON.stringify(out, null, 0))
const vals = Object.values(out)
console.log(vals.length, 'photos,', vals.filter((v) => COMMERCIAL.includes(v.l)).length, 'commercial-OK')
