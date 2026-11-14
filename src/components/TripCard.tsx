import { COUNTRY_BY_CODE, flagEmoji } from '../data/countries'
import { useI18n } from '../i18n'
import { usePhotoUrl, type Trip } from '../store'

export function formatRange(t: Trip, lang: string) {
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  if (!t.startDate) return ''
  if (!t.endDate || t.endDate === t.startDate) return fmt(t.startDate)
  return `${fmt(t.startDate)} – ${fmt(t.endDate)}`
}

export function Thumb({ id, className }: { id: string; className?: string }) {
  const url = usePhotoUrl(id)
  return url ? <img src={url} className={className ?? 'thumb'} alt="" /> : <div className={(className ?? 'thumb') + ' ph'} />
}

export default function TripCard({ trip, onClick, showCountry = true }: { trip: Trip; onClick: () => void; showCountry?: boolean }) {
  const { lang, cName } = useI18n()
  const c = COUNTRY_BY_CODE[trip.country]
  return (
    <button className="trip-card" onClick={onClick}>
      {trip.photoIds[0] ? <Thumb id={trip.photoIds[0]} className="trip-cover" /> : <div className="trip-cover flag">{flagEmoji(trip.country)}</div>}
      <div className="trip-info">
        {showCountry && (
          <div className="trip-country">
            {flagEmoji(trip.country)} {cName(c)}
            {trip.city && ` · ${trip.city}`}
          </div>
        )}
        <div className="trip-title">{trip.title || trip.city || cName(c)}</div>
        <div className="trip-date">{formatRange(trip, lang)}</div>
        {trip.note && <div className="trip-note">{trip.note}</div>}
      </div>
    </button>
  )
}
