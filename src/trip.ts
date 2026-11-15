import type { Trip, TripDay } from './store'

const addDays = (date: string, n: number) => {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 여행 기간의 날짜들 (+ 기간 밖에 이미 써 둔 날) */
export function tripDates(t: Trip): string[] {
  const out: string[] = []
  if (t.startDate) {
    const end = t.endDate && t.endDate >= t.startDate ? t.endDate : t.startDate
    for (let d = t.startDate, i = 0; d <= end && i < 120; d = addDays(d, 1), i++) out.push(d)
  }
  for (const day of t.days ?? []) if (!out.includes(day.date)) out.push(day.date)
  return out.sort()
}

/** Day 번호 (시작일 = Day 1) */
export const dayNumber = (t: Trip, date: string) =>
  t.startDate ? Math.round((Date.parse(date) - Date.parse(t.startDate)) / 86400000) + 1 : 0

export const dayOf = (t: Trip, date: string): TripDay | undefined => t.days?.find((d) => d.date === date)

export const isOngoing = (t: Trip, today = todayStr()) =>
  !!t.startDate && t.startDate <= today && today <= (t.endDate || t.startDate)

/** 대표 사진: 여행 사진 → 하루 일기 사진 순서 */
export const coverPhoto = (t: Trip) => t.photoIds[0] ?? t.days?.flatMap((d) => d.photoIds)[0]

export const allPhotoIds = (t: Trip) => [...t.photoIds, ...(t.days ?? []).flatMap((d) => d.photoIds)]

/** 카드에 보여줄 글: 전체 메모 → 가장 최근 하루 일기 */
export const previewNote = (t: Trip) => t.note || [...(t.days ?? [])].sort((a, b) => b.date.localeCompare(a.date)).find((d) => d.note)?.note || ''

export const writtenDays = (t: Trip) => (t.days ?? []).filter((d) => d.note || d.photoIds.length).length
