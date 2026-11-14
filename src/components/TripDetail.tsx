import { COUNTRY_BY_CODE, flagEmoji } from '../data/countries'
import { useI18n } from '../i18n'
import type { Trip } from '../store'
import Sheet from './Sheet'
import { formatRange, Thumb } from './TripCard'

export default function TripDetail({ trip, onEdit, onClose }: { trip: Trip; onEdit: () => void; onClose: () => void }) {
  const { lang, t, cName } = useI18n()
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
        <div className="form-actions">
          <span className="spacer" />
          <button className="btn primary" onClick={onEdit}>{t.editTrip}</button>
        </div>
      </div>
    </Sheet>
  )
}
