import { useI18n } from '../i18n'
import type { Trip } from '../store'
import TripCard from './TripCard'

export default function JournalView({ trips, onOpen, onAdd }: { trips: Trip[]; onOpen: (t: Trip) => void; onAdd: () => void }) {
  const { t, lang } = useI18n()
  const sorted = [...trips].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '') || b.createdAt - a.createdAt)
  const groups: Record<string, Trip[]> = {}
  for (const tr of sorted) (groups[tr.startDate?.slice(0, 4) || '—'] ??= []).push(tr)
  return (
    <div className="page">
      <div className="section-head">
        <h2>{t.journal}</h2>
        <button className="btn primary small" onClick={onAdd}>＋ {t.addTrip}</button>
      </div>
      {trips.length === 0 && (
        <div className="empty">
          <div className="empty-emoji">✈️</div>
          <p>{t.noTrips}</p>
          <p className="muted">{t.noTripsHint}</p>
        </div>
      )}
      {Object.entries(groups).map(([year, list]) => (
        <section key={year}>
          <h3 className="year">{year}{lang === 'ko' && year !== '—' ? '년' : ''} <span className="muted">{list.length}</span></h3>
          <div className="trip-list">
            {list.map((tr) => <TripCard key={tr.id} trip={tr} onClick={() => onOpen(tr)} />)}
          </div>
        </section>
      ))}
    </div>
  )
}
