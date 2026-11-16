import { useState } from 'react'
import { COUNTRY_BY_CODE, flagEmoji } from '../data/countries'
import { useI18n } from '../i18n'
import type { Trip } from '../store'
import { dayNumber, dayOf, diaryOn, isStay, todayStr, tripDates, weeksOf } from '../trip'
import { fmtDay } from './DayForm'
import Sheet from './Sheet'
import { formatRange, Thumb } from './TripCard'

function DayRow({ trip, d, today, onDay }: { trip: Trip; d: string; today: string; onDay: (d: string) => void }) {
  const { lang, pick } = useI18n()
  const day = dayOf(trip, d)
  const n = dayNumber(trip, d)
  const written = !!(day && (day.note || day.photoIds.length))
  return (
    <li className={[written ? 'written' : '', d === today ? 'today' : '', d > today ? 'future' : ''].join(' ')}>
      <button className="day-item" onClick={() => onDay(d)}>
        <div className="day-head">
          <b>{n > 0 ? `Day ${n}` : ''}</b>
          <span className="muted">{fmtDay(d, lang)}</span>
          {d === today && <span className="day-badge now">{pick('오늘', 'Today')}</span>}
          <span className="spacer" />
          <span className="day-action">{written ? '✏️' : '＋'}</span>
        </div>
        {day?.note && <p className="day-note">{day.note}</p>}
        {day && day.photoIds.length > 0 && (
          <div className="day-photos">
            {day.photoIds.slice(0, 4).map((p) => <Thumb key={p} id={p} className="day-photo" />)}
            {day.photoIds.length > 4 && <span className="more">+{day.photoIds.length - 4}</span>}
          </div>
        )}
        {!written && <span className="muted small">{d > today ? pick('그날 기록해요', 'Write on the day') : pick('이 날 일기 쓰기', 'Write this day')}</span>}
      </button>
    </li>
  )
}

export default function TripDetail({ trip, onEdit, onDay, onFindDive, onDiary, onClose }: {
  trip: Trip
  onEdit: () => void
  onDay: (date: string) => void
  onFindDive: () => void
  /** 하루 일기 켜기 */
  onDiary: () => void
  onClose: () => void
}) {
  const { lang, t, cName, pick } = useI18n()
  const today = todayStr()
  const stay = isStay(trip)
  const on = diaryOn(trip)
  // 살아보기: 오늘까지만 (앞으로 올 주는 숨김), 주 단위로 접기
  const dates = on ? tripDates(trip, stay) : []
  const weeks = stay ? weeksOf(trip, dates) : []
  const currentWeek = weeks.find((w) => w.dates.includes(today))?.week ?? weeks[weeks.length - 1]?.week
  const [open, setOpen] = useState<Set<number>>(() => new Set(currentWeek ? [currentWeek] : []))
  const toggle = (w: number) =>
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(w)) n.delete(w)
      else n.add(w)
      return n
    })
  const fmtShort = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'numeric', day: 'numeric' })

  return (
    <Sheet onClose={onClose} title={<>{flagEmoji(trip.country)} {cName(COUNTRY_BY_CODE[trip.country])}</>}>
      <div className="trip-detail">
        <h2>{trip.title || trip.city}</h2>
        <div className="muted">
          {stay && <span className="day-badge stay">🏡 {pick('살아보기', 'Living')}</span>} {trip.city && <>{trip.city} · </>}
          {formatRange(trip, lang)}
        </div>
        {trip.photoIds.length > 0 && (
          <div className="detail-photos">
            {trip.photoIds.map((p) => <Thumb key={p} id={p} className="detail-photo" />)}
          </div>
        )}
        {trip.note && <p className="detail-note">{trip.note}</p>}
        {(trip.places?.length ?? 0) > 0 && (
          <button className="find-area-btn" onClick={onFindDive}>
            🤿 {pick(`${trip.places![0].name} 주변 다이빙 포인트 찾기`, `Find dive sites near ${trip.places![0].name}`)}
          </button>
        )}

        {!on && (
          <button className="diary-on" onClick={onDiary}>
            📔 {pick('하루하루 일기 쓰기 켜기', 'Start a daily diary')}
            <small className="muted">{stay ? pick('날짜별 일기·사진, 주 단위로 접어서 보여줘요', 'Daily entries grouped by week') : pick('Day 1, Day 2… 날짜별로 일기·사진', 'Day-by-day entries')}</small>
          </button>
        )}

        {on && dates.length > 0 && (
          <section className="days">
            <h4 className="form-section">📔 {pick('하루하루 일기', 'Day by day')}</h4>
            {stay ? (
              <div className="weeks">
                {[...weeks].reverse().map((w) => {
                  const written = w.dates.filter((d) => {
                    const day = dayOf(trip, d)
                    return day && (day.note || day.photoIds.length)
                  })
                  const photos = w.dates.reduce((n, d) => n + (dayOf(trip, d)?.photoIds.length ?? 0), 0)
                  const isOpen = open.has(w.week)
                  const isNow = w.dates.includes(today)
                  return (
                    <div key={w.week} className={isOpen ? 'week open' : 'week'}>
                      <button className="week-head" onClick={() => toggle(w.week)} aria-expanded={isOpen}>
                        <b>{pick(`${w.week}주차`, `Week ${w.week}`)}</b>
                        <span className="muted small">{fmtShort(w.dates[0])}–{fmtShort(w.dates[w.dates.length - 1])}</span>
                        {isNow && <span className="day-badge now">{pick('이번 주', 'This week')}</span>}
                        <span className="spacer" />
                        <span className="week-sum small">
                          📔 {written.length}{photos > 0 && <> · 📷 {photos}</>}
                        </span>
                        <span className="chev">{isOpen ? '▾' : '▸'}</span>
                      </button>
                      {isOpen && (
                        <ol className="day-list">
                          {w.dates.map((d) => <DayRow key={d} trip={trip} d={d} today={today} onDay={onDay} />)}
                        </ol>
                      )}
                    </div>
                  )
                })}
                {trip.endDate > today && <p className="muted small">{pick('앞으로 올 주는 그 주가 되면 나타나요.', 'Upcoming weeks appear as they arrive.')}</p>}
              </div>
            ) : (
              <ol className="day-list">
                {dates.map((d) => <DayRow key={d} trip={trip} d={d} today={today} onDay={onDay} />)}
              </ol>
            )}
          </section>
        )}

        <div className="form-actions">
          <span className="spacer" />
          <button className="btn ghost" onClick={onEdit}>{t.editTrip}</button>
        </div>
      </div>
    </Sheet>
  )
}
