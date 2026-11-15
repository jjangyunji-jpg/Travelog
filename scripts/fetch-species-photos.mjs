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
const OK = new Set(['cc0', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa', 'cc-by-nd', 'cc-by-nc-nd'])

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
  let photo = taxon.default_photo && OK.has(taxon.default_photo.license_code) ? taxon.default_photo : null
  if (!photo) {
    const full = await get(`https://api.inaturalist.org/v1/taxa/${taxon.id}`)
    photo = (full.results[0].taxon_photos ?? []).map((p) => p.photo).find((p) => OK.has(p.license_code)) ?? null
    await sleep(1000)
  }
  if (!photo) {
    console.log('NO CC PHOTO', key, sci)
    continue
  }
  out[key] = {
    t: taxon.id,
    u: photo.url.replace(/\/square\.(\w+)/, '/{s}.$1'),
    a: photo.attribution,
  }
  console.log('ok', key, taxon.name, photo.license_code)
  await sleep(1100)
}
writeFileSync(new URL('../src/data/speciesPhotos.json', import.meta.url), JSON.stringify(out, null, 0))
console.log(Object.keys(out).length, 'photos')
