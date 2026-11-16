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

/** 하루 일기를 쓰는 기록인지 (켰거나 이미 쓴 날이 있으면) */
export const diaryOn = (t: Trip) => !!t.diary || (t.days ?? []).some((d) => d.note || d.photoIds.length)

export const isStay = (t: Trip) => t.kind === 'stay'

/** 기간(일) */
export const tripLength = (t: Trip) =>
  t.startDate ? Math.round((Date.parse(t.endDate || t.startDate) - Date.parse(t.startDate)) / 86400000) + 1 : 0

/** 살아본 기간 → 단계 (한달살이 30일 이상) */
export const tierFromDays = (days: number): 'm1' | 'm6' | 'y1' | 'y10' | undefined =>
  days >= 3650 ? 'y10' : days >= 365 ? 'y1' : days >= 182 ? 'm6' : days >= 28 ? 'm1' : undefined

/**
 * 기록의 날짜들 (+ 기간 밖에 이미 써 둔 날)
 * upToToday: 살아보기처럼 긴 기록은 오늘까지만 (앞으로 올 날은 숨김)
 */
export function tripDates(t: Trip, upToToday = false): string[] {
  const out: string[] = []
  if (t.startDate) {
    let end = t.endDate && t.endDate >= t.startDate ? t.endDate : t.startDate
    if (upToToday) {
      const today = todayStr()
      if (today < end) end = today < t.startDate ? t.startDate : today
    }
    for (let d = t.startDate, i = 0; d <= end && i < 4000; d = addDays(d, 1), i++) out.push(d)
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

/** 주 단위로 묶기 (시작일 기준 1주차 = Day 1~7) */
export function weeksOf(t: Trip, dates: string[]): { week: number; dates: string[] }[] {
  const map = new Map<number, string[]>()
  for (const d of dates) {
    const w = Math.max(1, Math.floor((dayNumber(t, d) - 1) / 7) + 1)
    if (!map.has(w)) map.set(w, [])
    map.get(w)!.push(d)
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([week, ds]) => ({ week, dates: ds }))
}

export const addMonths = (date: string, n: number) => {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + n)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}
