import { COUNTRY_BY_CODE, flagEmoji } from '../data/countries'
import { useI18n } from '../i18n'
import type { Trip } from '../store'
import { dayNumber, dayOf, todayStr, tripDates } from '../trip'
import { fmtDay } from './DayForm'
import Sheet from './Sheet'
import { formatRange, Thumb } from './TripCard'

export default function TripDetail({ trip, onEdit, onDay, onFindDive, onClose }: {
  trip: Trip
  onEdit: () => void
  onDay: (date: string) => void
  onFindDive: () => void
  onClose: () => void
}) {
  const { lang, t, cName, pick } = useI18n()
  const today = todayStr()
  const dates = tripDates(trip)
  return (
    <Sheet onClose={onClose} title={<>{flagEmoji(trip.country)} {cName(COUNTRY_BY_CODE[trip.country])}</>}>
      <div className="trip-detail">
        <h2>{trip.title || trip.city}</h2>
        <div className="muted">
          {trip.city && <>{trip.city} · </>}
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

        {dates.length > 0 && (
          <section className="days">
            <h4 className="form-section">📔 {pick('하루하루 일기', 'Day by day')}</h4>
            <ol className="day-list">
              {dates.map((d) => {
                const day = dayOf(trip, d)
                const n = dayNumber(trip, d)
                const written = !!(day && (day.note || day.photoIds.length))
                return (
                  <li key={d} className={[written ? 'written' : '', d === today ? 'today' : '', d > today ? 'future' : ''].join(' ')}>
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
                      {!written && <span className="muted small">{d > today ? pick('여행 중에 기록해요', 'Write during the trip') : pick('이 날 일기 쓰기', 'Write this day')}</span>}
                    </button>
                  </li>
                )
              })}
            </ol>
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
