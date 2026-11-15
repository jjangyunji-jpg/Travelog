import { useCallback, useEffect, useState } from 'react'
import { del, get, set } from 'idb-keyval'
import type { DiveSpot } from './data/diveSpots'

export type Status = 'visited' | 'wish'

export interface Trip {
  id: string
  country: string
  title: string
  city: string
  startDate: string
  endDate: string
  note: string
  photoIds: string[]
  createdAt: number
  updatedAt?: number
}

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
  mood: number
  conditions: string[]
  note: string
  photoIds: string[]
  createdAt: number
  updatedAt?: number
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
  if (d.statuses[code] === 'visited') return d
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

  const setStatus = useCallback((code: string, status: Status | null) => {
    setData((d) => {
      const now = Date.now()
      const statuses = { ...d.statuses }
      const deleted = { ...d.deleted }
      if (status) {
        statuses[code] = status
        delete deleted['status:' + code]
      } else {
        delete statuses[code]
        deleted['status:' + code] = now
      }
      return { ...d, statuses, deleted, statusTs: { ...d.statusTs, [code]: now } }
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

  const deleteDive = useCallback((id: string) => {
    setData((d) => {
      d.dives.find((x) => x.id === id)?.photoIds.forEach((p) => del(photoKey(p)))
      return { ...d, dives: d.dives.filter((x) => x.id !== id), deleted: { ...d.deleted, ['dive:' + id]: Date.now() } }
    })
  }, [])

  const setDiveOffset = useCallback(
    (n: number) => setData((d) => ({ ...d, diveOffset: Math.max(0, n || 0), diveOffsetTs: Date.now() })),
    [],
  )

  const replaceAll = useCallback((next: AppData) => setData(normalize(next)), [])

  return { data, setData, setStatus, saveTrip, deleteTrip, saveDive, deleteDive, setDiveOffset, replaceAll }
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
  for (const t of [...data.trips, ...data.dives])
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
