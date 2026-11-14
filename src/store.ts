import { useCallback, useEffect, useState } from 'react'
import { del, get, set } from 'idb-keyval'

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
}

export interface AppData {
  statuses: Record<string, Status>
  trips: Trip[]
}

const KEY = 'travelog:data:v1'
const EMPTY: AppData = { statuses: {}, trips: [] }

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...EMPTY, ...JSON.parse(raw) }
  } catch {
    /* 저장소를 쓸 수 없는 환경 */
  }
  return EMPTY
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
      const statuses = { ...d.statuses }
      if (status) statuses[code] = status
      else delete statuses[code]
      return { ...d, statuses }
    })
  }, [])

  const saveTrip = useCallback((trip: Trip) => {
    setData((d) => {
      const exists = d.trips.some((t) => t.id === trip.id)
      const trips = exists ? d.trips.map((t) => (t.id === trip.id ? trip : t)) : [...d.trips, trip]
      // 기록을 남긴 나라는 자동으로 '방문함'
      return { trips, statuses: { ...d.statuses, [trip.country]: 'visited' } }
    })
  }, [])

  const deleteTrip = useCallback((id: string) => {
    setData((d) => {
      const trip = d.trips.find((t) => t.id === id)
      trip?.photoIds.forEach((p) => del(photoKey(p)))
      return { ...d, trips: d.trips.filter((t) => t.id !== id) }
    })
  }, [])

  const replaceAll = useCallback((next: AppData) => setData({ ...EMPTY, ...next }), [])

  return { data, setStatus, saveTrip, deleteTrip, replaceAll }
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
  for (const t of data.trips)
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
