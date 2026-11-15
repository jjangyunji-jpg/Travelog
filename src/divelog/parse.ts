/**
 * 다이빙 컴퓨터 기록 파일 읽기
 * - UDDF (Universal Dive Data Format, .uddf): 여러 다이빙 소프트웨어의 공통 내보내기 형식
 * - Subsurface (.ssrf / .xml): Subsurface가 대부분의 다이빙 컴퓨터에서 받아 저장하는 형식
 */

export interface ImportedDive {
  date: string
  time: string
  maxDepth?: number
  avgDepth?: number
  bottomTime?: number // 분
  waterTemp?: number
  startBar?: number
  endBar?: number
  weight?: number
  gas: string
  siteName?: string
  lat?: number
  lon?: number
  buddy?: string
  shop?: string
  note?: string
  computer?: string
  /** [초, 수심 m] */
  profile?: [number, number][]
}

const r1 = (n: number) => Math.round(n * 10) / 10
const num = (s: string | null | undefined) => {
  if (s == null) return undefined
  const v = parseFloat(s)
  return isFinite(v) ? v : undefined
}

/** 수심 그래프는 최대 200점으로 줄여 저장 (최대 수심 지점은 꼭 포함) */
export function downsample(points: [number, number][], max = 200): [number, number][] {
  if (points.length <= max) return points.map(([t, d]) => [Math.round(t), r1(d)])
  const step = points.length / max
  const out: [number, number][] = []
  const deepest = points.reduce((a, b) => (b[1] > a[1] ? b : a))
  for (let i = 0; i < max; i++) out.push(points[Math.floor(i * step)])
  out.push(points[points.length - 1])
  if (!out.includes(deepest)) out.push(deepest)
  return out.sort((a, b) => a[0] - b[0]).map(([t, d]) => [Math.round(t), r1(d)])
}

const gasFromO2 = (o2?: number) => {
  if (o2 == null) return 'air'
  const pct = o2 <= 1 ? o2 * 100 : o2
  if (pct < 22.5) return 'air'
  return 'ean' + Math.round(pct)
}

/* ---------------- UDDF ---------------- */
function parseUddf(doc: Document): ImportedDive[] {
  const all = (el: Element | Document, name: string) => Array.from(el.getElementsByTagNameNS('*', name))
  const one = (el: Element | Document, name: string) => all(el, name)[0]
  const text = (el: Element | Document | undefined, name: string) => (el ? one(el, name)?.textContent?.trim() : undefined)
  const toC = (v?: number) => (v == null ? undefined : r1(v > 200 ? v - 273.15 : v))
  const toBar = (v?: number) => (v == null ? undefined : Math.round(v > 1000 ? v / 1e5 : v))

  const sites = new Map<string, { name?: string; lat?: number; lon?: number }>()
  for (const s of all(doc, 'site')) {
    const id = s.getAttribute('id')
    if (!id) continue
    sites.set(id, { name: text(s, 'name'), lat: num(text(s, 'latitude')), lon: num(text(s, 'longitude')) })
  }
  const people = new Map<string, string>()
  for (const tag of ['buddy', 'owner']) {
    for (const b of all(doc, tag)) {
      const id = b.getAttribute('id')
      if (id) people.set(id, [text(b, 'firstname'), text(b, 'lastname')].filter(Boolean).join(' '))
    }
  }
  const mixes = new Map<string, number | undefined>()
  for (const m of all(doc, 'mix')) {
    const id = m.getAttribute('id')
    if (id) mixes.set(id, num(text(m, 'o2')))
  }

  return all(doc, 'dive').map((dive) => {
    const before = one(dive, 'informationbeforedive')
    const after = one(dive, 'informationafterdive')
    const dt = text(before, 'datetime') ?? text(dive, 'datetime') ?? ''
    const [date, timeRaw = ''] = dt.split('T')
    const links = all(before ?? dive, 'link').map((l) => l.getAttribute('ref') ?? '')
    const site = links.map((l) => sites.get(l)).find(Boolean)
    const buddy = links.map((l) => people.get(l)).filter(Boolean).join(', ')

    const samples: [number, number][] = []
    let minTemp: number | undefined
    for (const w of all(dive, 'waypoint')) {
      const t = num(text(w, 'divetime'))
      const d = num(text(w, 'depth'))
      if (t != null && d != null) samples.push([t, d])
      const temp = toC(num(text(w, 'temperature')))
      if (temp != null) minTemp = minTemp == null ? temp : Math.min(minTemp, temp)
    }
    const tank = one(dive, 'tankdata')
    const mixRef = tank ? all(tank, 'link').map((l) => l.getAttribute('ref') ?? '').find((r) => mixes.has(r)) : undefined
    const duration = num(text(after, 'diveduration')) ?? (samples.length ? samples[samples.length - 1][0] : undefined)
    const maxDepth = num(text(after, 'greatestdepth')) ?? (samples.length ? Math.max(...samples.map((s) => s[1])) : undefined)
    const notes = after ? all(after, 'para').map((p) => p.textContent?.trim()).filter(Boolean).join('\n') : ''

    return {
      date,
      time: timeRaw.slice(0, 5),
      maxDepth: maxDepth != null ? r1(maxDepth) : undefined,
      avgDepth: num(text(after, 'averagedepth')) != null ? r1(num(text(after, 'averagedepth'))!) : undefined,
      bottomTime: duration != null ? Math.round(duration / 60) : undefined,
      waterTemp: toC(num(text(after, 'lowesttemperature'))) ?? minTemp,
      startBar: toBar(num(text(tank, 'tankpressurebegin'))),
      endBar: toBar(num(text(tank, 'tankpressureend'))),
      gas: gasFromO2(mixRef ? mixes.get(mixRef) : undefined),
      siteName: site?.name,
      lat: site?.lat,
      lon: site?.lon,
      buddy: buddy || undefined,
      note: notes || undefined,
      profile: samples.length > 1 ? downsample(samples) : undefined,
    }
  })
}

/* ---------------- Subsurface ---------------- */
/** '45:30 min', '1:02:10', '10 s' → 초 */
function toSeconds(s: string | null): number | undefined {
  if (!s) return undefined
  const clean = s.replace(/[a-z ]+$/i, '').trim()
  if (/^\d+(\.\d+)?$/.test(clean)) return s.includes('s') && !s.includes('min') ? +clean : +clean * 60
  const parts = clean.split(':').map(Number)
  if (parts.some((p) => !isFinite(p))) return undefined
  return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + (parts[1] ?? 0)
}

function parseSubsurface(doc: Document): ImportedDive[] {
  const sites = new Map<string, { name?: string; lat?: number; lon?: number }>()
  const gps = (s: string | null) => {
    const [lat, lon] = (s ?? '').trim().split(/\s+/).map(Number)
    return isFinite(lat) && isFinite(lon) && (lat || lon) ? { lat, lon } : {}
  }
  for (const s of Array.from(doc.getElementsByTagName('site'))) {
    sites.set(s.getAttribute('uuid')?.trim() ?? '', { name: s.getAttribute('name') ?? undefined, ...gps(s.getAttribute('gps')) })
  }

  return Array.from(doc.getElementsByTagName('dive')).map((dive) => {
    const child = (name: string) => Array.from(dive.children).find((c) => c.tagName === name)
    const dc = child('divecomputer')
    const scope = dc ?? dive
    const depthEl = scope.getElementsByTagName('depth')[0] ?? dive.getElementsByTagName('depth')[0]
    const tempEl = scope.getElementsByTagName('temperature')[0] ?? child('divetemperature')
    const cyl = dive.getElementsByTagName('cylinder')[0]
    const ws = dive.getElementsByTagName('weightsystem')[0]
    const loc = child('location')
    const site = sites.get(dive.getAttribute('divesiteid')?.trim() ?? '') ?? (loc ? { name: loc.textContent?.trim(), ...gps(loc.getAttribute('gps')) } : undefined)

    const samples: [number, number][] = []
    let minTemp: number | undefined
    for (const sm of Array.from(scope.getElementsByTagName('sample'))) {
      const t = toSeconds(sm.getAttribute('time'))
      const d = num(sm.getAttribute('depth'))
      if (t != null && d != null) samples.push([t, d])
      const temp = num(sm.getAttribute('temp'))
      if (temp != null) minTemp = minTemp == null ? temp : Math.min(minTemp, temp)
    }
    const duration = toSeconds(dive.getAttribute('duration')) ?? (samples.length ? samples[samples.length - 1][0] : undefined)
    const maxDepth = num(depthEl?.getAttribute('max')) ?? (samples.length ? Math.max(...samples.map((s) => s[1])) : undefined)
    const mean = num(depthEl?.getAttribute('mean'))
    const text = (name: string) => child(name)?.textContent?.trim() || undefined

    return {
      date: dive.getAttribute('date') ?? '',
      time: (dive.getAttribute('time') ?? '').slice(0, 5),
      maxDepth: maxDepth != null ? r1(maxDepth) : undefined,
      avgDepth: mean != null ? r1(mean) : undefined,
      bottomTime: duration != null ? Math.round(duration / 60) : undefined,
      waterTemp: num(tempEl?.getAttribute('water')) ?? minTemp,
      startBar: num(cyl?.getAttribute('start')) != null ? Math.round(num(cyl?.getAttribute('start'))!) : undefined,
      endBar: num(cyl?.getAttribute('end')) != null ? Math.round(num(cyl?.getAttribute('end'))!) : undefined,
      weight: num(ws?.getAttribute('weight')),
      gas: gasFromO2(num(cyl?.getAttribute('o2'))),
      siteName: site?.name,
      lat: site?.lat,
      lon: site?.lon,
      buddy: text('buddy'),
      shop: text('divemaster'),
      note: text('notes'),
      computer: dc?.getAttribute('model') ?? undefined,
      profile: samples.length > 1 ? downsample(samples) : undefined,
    }
  })
}

export function parseDiveFile(content: string): ImportedDive[] {
  const doc = new DOMParser().parseFromString(content, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('not-xml')
  const root = doc.documentElement.localName.toLowerCase()
  const dives = root === 'uddf' ? parseUddf(doc) : root === 'divelog' || root === 'dives' ? parseSubsurface(doc) : null
  if (!dives) throw new Error('unknown-format')
  return dives.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date))
}
