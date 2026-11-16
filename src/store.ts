import { useCallback, useEffect, useState } from 'react'
import { del, get, set } from 'idb-keyval'
import type { DiveSpot } from './data/diveSpots'

export type Status = 'visited' | 'wish' | 'lived'
/** 살아본 기간: 한달살이 이상 / 6개월 이상 / 1년 이상 / 10년 이상 */
export type LivedTier = 'm1' | 'm6' | 'y1' | 'y10'
export const LIVED_TIERS: LivedTier[] = ['m1', 'm6', 'y1', 'y10']

export interface TripDay {
  date: string
  note: string
  photoIds: string[]
  updatedAt?: number
}

export interface Trip {
  id: string
  country: string
  title: string
  city: string
  startDate: string
  endDate: string
  note: string
  photoIds: string[]
  /** 여행 / 살아보기 */
  kind?: 'trip' | 'stay'
  /** 하루하루 일기 쓰기 (켰을 때만 날짜별 줄) */
  diary?: boolean
  /** 하루하루 일기 */
  days?: TripDay[]
  /** 간 도시 좌표 (지도 '도시 보기'에 점으로 표시) */
  places?: { name: string; lat: number; lon: number }[]
  createdAt: number
  updatedAt?: number
}

export type Abundance = 'few' | 'some' | 'many' | 'swarm'

export interface Dive {
  id: string
  country: string
  spotId: string
  date: string
  time: string
  maxDepth?: number
  avgDepth?: number
  bottomTime?: number
  waterTemp?: number
  visibility?: number
  startBar?: number
  endBar?: number
  weight?: number
  gas: string
  suit: string
  entry: 'boat' | 'shore' | ''
  current: '' | 'none' | 'weak' | 'medium' | 'strong'
  buddy: string
  shop: string
  marineLife: string[]
  /** 다이빙 컴퓨터에서 불러온 수심 그래프 [초, 수심 m] */
  profile?: [number, number][]
  /** 다이빙 전에 세운 계획 */
  plan?: { depth: number; time: number; gas: string; turnBar?: number; briefing?: string[] }
  /** 다이빙 후 디브리프 회고 */
  debrief?: { good?: string; improve?: string; next?: string }
  /** 불러온 다이빙 컴퓨터 모델 */
  computer?: string
  /** 생물별로 본 양 */
  lifeCounts?: Record<string, Abundance>
  mood: number
  conditions: string[]
  note: string
  photoIds: string[]
  createdAt: number
  updatedAt?: number
}

/** iNaturalist에서 찾아 추가한 생물 (도감에 없는 종) */
export interface CustomSpecies {
  key: string
  ko: string
  en: string
  sci: string
  photo?: string
  attr?: string
}

export interface AppData {
  statuses: Record<string, Status>
  trips: Trip[]
  dives: Dive[]
  customSpots: DiveSpot[]
  /** 이 앱 이전에 기록한 다이빙 수 (로그 번호 시작값) */
  diveOffset: number
  /* ---- 기기 간 동기화용 메타데이터 ---- */
  /** 나라 표시를 마지막으로 바꾼 시각 */
  statusTs: Record<string, number>
  /** 삭제 기록 ('trip:id', 'dive:id', 'spot:id', 'status:KR') → 삭제 시각 */
  deleted: Record<string, number>
  diveOffsetTs: number
  customSpecies: Record<string, CustomSpecies>
  /** 살아본 나라의 기간 */
  lived?: Record<string, LivedTier>
  /** 출생 국가 (홈) */
  home?: string
  homeTs?: number
}

const KEY = 'travelog:data:v1'
export const EMPTY: AppData = {
  statuses: {},
  trips: [],
  dives: [],
  customSpots: [],
  diveOffset: 0,
  statusTs: {},
  deleted: {},
  diveOffsetTs: 0,
  customSpecies: {},
}

/** 예전 형식의 데이터도 안전하게 읽기 */
export const normalize = (d: Partial<AppData>): AppData => ({ ...EMPTY, ...d })

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return normalize(JSON.parse(raw))
  } catch {
    /* 저장소를 쓸 수 없는 환경 */
  }
  return EMPTY
}

function markVisited(d: AppData, code: string, now: number): AppData {
  if (d.statuses[code] === 'visited' || d.statuses[code] === 'lived') return d
  const deleted = { ...d.deleted }
  delete deleted['status:' + code]
  return { ...d, statuses: { ...d.statuses, [code]: 'visited' }, statusTs: { ...d.statusTs, [code]: now }, deleted }
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

export function useAppData() {
  const [data, setData] = useState<AppData>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* 무시 */
    }
  }, [data])

  const setStatus = useCallback((code: string, status: Status | null, tier?: LivedTier) => {
    setData((d) => {
      const now = Date.now()
      const statuses = { ...d.statuses }
      const deleted = { ...d.deleted }
      const lived = { ...(d.lived ?? {}) }
      if (status) {
        statuses[code] = status
        delete deleted['status:' + code]
      } else {
        delete statuses[code]
        deleted['status:' + code] = now
      }
      if (status === 'lived') lived[code] = tier ?? lived[code] ?? 'm1'
      return { ...d, statuses, deleted, lived, statusTs: { ...d.statusTs, [code]: now } }
    })
  }, [])

  const saveTrip = useCallback((trip: Trip) => {
    setData((d) => {
      const now = Date.now()
      const stamped = { ...trip, updatedAt: now }
      const exists = d.trips.some((t) => t.id === trip.id)
      const trips = exists ? d.trips.map((t) => (t.id === trip.id ? stamped : t)) : [...d.trips, stamped]
      // 기록을 남긴 나라는 자동으로 '방문함'
      return markVisited({ ...d, trips }, trip.country, now)
    })
  }, [])

  const deleteTrip = useCallback((id: string) => {
    setData((d) => {
      const trip = d.trips.find((t) => t.id === id)
      trip?.photoIds.forEach((p) => del(photoKey(p)))
      trip?.days?.forEach((day) => day.photoIds.forEach((p) => del(photoKey(p))))
      return { ...d, trips: d.trips.filter((t) => t.id !== id), deleted: { ...d.deleted, ['trip:' + id]: Date.now() } }
    })
  }, [])

  const saveDive = useCallback((dive: Dive, newSpot?: DiveSpot) => {
    setData((d) => {
      const now = Date.now()
      const stamped = { ...dive, updatedAt: now }
      const exists = d.dives.some((x) => x.id === dive.id)
      const dives = exists ? d.dives.map((x) => (x.id === dive.id ? stamped : x)) : [...d.dives, stamped]
      const customSpots = newSpot ? [...d.customSpots, { ...newSpot, updatedAt: now }] : d.customSpots
      return markVisited({ ...d, dives, customSpots }, dive.country, now)
    })
  }, [])

  /** 다이빙 컴퓨터에서 여러 개를 한 번에 불러오기 */
  const importDives = useCallback((dives: Dive[], spots: DiveSpot[]) => {
    setData((d) => {
      const now = Date.now()
      const incoming = new Map(dives.map((x) => [x.id, { ...x, updatedAt: now }]))
      let next: AppData = {
        ...d,
        // 같은 id(계획만 세워 둔 기록)는 갱신, 나머지는 추가
        dives: [...d.dives.map((x) => incoming.get(x.id) ?? x), ...[...incoming.values()].filter((x) => !d.dives.some((y) => y.id === x.id))],
        customSpots: [...d.customSpots, ...spots.map((s) => ({ ...s, updatedAt: now }))],
      }
      for (const c of new Set(dives.map((x) => x.country))) next = markVisited(next, c, now)
      return next
    })
  }, [])

  const deleteDive = useCallback((id: string) => {
    setData((d) => {
      d.dives.find((x) => x.id === id)?.photoIds.forEach((p) => del(photoKey(p)))
      return { ...d, dives: d.dives.filter((x) => x.id !== id), deleted: { ...d.deleted, ['dive:' + id]: Date.now() } }
    })
  }, [])

  const addSpecies = useCallback((list: CustomSpecies[]) => {
    setData((d) => {
      const missing = list.filter((x) => !d.customSpecies[x.key])
      if (!missing.length) return d
      return { ...d, customSpecies: { ...d.customSpecies, ...Object.fromEntries(missing.map((x) => [x.key, x])) } }
    })
  }, [])

  const setDiveOffset = useCallback(
    (n: number) => setData((d) => ({ ...d, diveOffset: Math.max(0, n || 0), diveOffsetTs: Date.now() })),
    [],
  )

  /** 다이빙 포인트를 내 스팟으로 저장 (같은 id는 건너뜀) */
  const addCustomSpots = useCallback((spots: DiveSpot[]) => {
    setData((d) => {
      const now = Date.now()
      const fresh = spots.filter((s) => !d.customSpots.some((x) => x.id === s.id))
      if (!fresh.length) return d
      const deleted = { ...d.deleted }
      fresh.forEach((s) => delete deleted['spot:' + s.id])
      return { ...d, deleted, customSpots: [...d.customSpots, ...fresh.map((s) => ({ ...s, custom: true, updatedAt: now }))] }
    })
  }, [])

  const removeCustomSpot = useCallback((id: string) => {
    setData((d) => ({ ...d, customSpots: d.customSpots.filter((s) => s.id !== id), deleted: { ...d.deleted, ['spot:' + id]: Date.now() } }))
  }, [])

  /** 하루 일기 저장 (같은 날짜는 덮어씀, 비면 지움) */
  const saveTripDay = useCallback((tripId: string, day: TripDay) => {
    setData((d) => {
      const now = Date.now()
      return {
        ...d,
        trips: d.trips.map((t) => {
          if (t.id !== tripId) return t
          const rest = (t.days ?? []).filter((x) => x.date !== day.date)
          const empty = !day.note.trim() && !day.photoIds.length
          // 지운 날도 시각을 남겨 다른 기기와 합칠 때 되살아나지 않게
          const days = [...rest, empty ? { ...day, note: '', photoIds: [], updatedAt: now } : { ...day, updatedAt: now }].sort((a, b) => a.date.localeCompare(b.date))
          return { ...t, days, updatedAt: now }
        }),
      }
    })
  }, [])

  /** 여러 여행 기록 일부 수정 (도시 좌표 자동 채우기 등) */
  const patchTrips = useCallback((patches: Record<string, Partial<Trip>>) => {
    setData((d) => {
      const now = Date.now()
      return { ...d, trips: d.trips.map((t) => (patches[t.id] ? { ...t, ...patches[t.id], updatedAt: now } : t)) }
    })
  }, [])

  const setHome = useCallback((code: string) => {
    setData((d) => {
      const now = Date.now()
      const next = { ...d, home: code || undefined, homeTs: now }
      return code ? markVisited(next, code, now) : next
    })
  }, [])

  const replaceAll = useCallback((next: AppData) => setData(normalize(next)), [])

  return { data, setData, setStatus, saveTrip, deleteTrip, saveDive, deleteDive, importDives, setDiveOffset, addSpecies, patchTrips, setHome, saveTripDay, addCustomSpots, removeCustomSpot, replaceAll }
}

/* ---------- 사진 (IndexedDB) ---------- */
const photoKey = (id: string) => `photo:${id}`

export async function savePhoto(file: File): Promise<string> {
  const blob = await compressImage(file, 1600, 0.82)
  const id = uid()
  await set(photoKey(id), blob)
  return id
}

export const getPhoto = (id: string) => get<Blob>(photoKey(id))
export const deletePhoto = (id: string) => del(photoKey(id))
export const putPhoto = (id: string, blob: Blob) => set(photoKey(id), blob)

async function compressImage(file: File, max: number, quality: number): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    return await new Promise((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', quality))
  } catch {
    return file
  }
}

export function usePhotoUrl(id: string | undefined) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!id) return
    let objectUrl: string | undefined
    let alive = true
    getPhoto(id).then((b) => {
      if (b && alive) {
        objectUrl = URL.createObjectURL(b)
        setUrl(objectUrl)
      }
    })
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])
  return url
}

/* ---------- 백업 ---------- */
const blobToDataUrl = (b: Blob) =>
  new Promise<string>((res) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.readAsDataURL(b)
  })

export async function exportBackup(data: AppData) {
  const photos: Record<string, string> = {}
  for (const t of [...data.trips, ...data.dives, ...data.trips.flatMap((x) => x.days ?? [])])
    for (const p of t.photoIds) {
      const b = await getPhoto(p)
      if (b) photos[p] = await blobToDataUrl(b)
    }
  return new Blob([JSON.stringify({ app: 'travelog', version: 1, data, photos })], { type: 'application/json' })
}

export async function importBackup(file: File): Promise<AppData> {
  const json = JSON.parse(await file.text())
  if (json.app !== 'travelog' || !json.data) throw new Error('invalid')
  for (const [id, dataUrl] of Object.entries(json.photos ?? {}) as [string, string][]) {
    await putPhoto(id, await (await fetch(dataUrl)).blob())
  }
  return json.data as AppData
}
