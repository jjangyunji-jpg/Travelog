import { COUNTRY_BY_CODE, flagEmoji } from '../data/countries'
import { useI18n } from '../i18n'
import type { Status, Trip } from '../store'
import Sheet from './Sheet'
import TripCard from './TripCard'

interface Props {
  code: string
  status?: Status
  trips: Trip[]
  onStatus: (s: Status | null) => void
  onAddTrip: () => void
  onOpenTrip: (t: Trip) => void
  onClose: () => void
}

export default function CountrySheet({ code, status, trips, onStatus, onAddTrip, onOpenTrip, onClose }: Props) {
  const { t, cName, contName } = useI18n()
  const c = COUNTRY_BY_CODE[code]
  return (
    <Sheet
      onClose={onClose}
      title={
        <div className="country-title">
          <span className="big-flag">{flagEmoji(code)}</span>
          <div>
            <div className="name">{cName(c)}</div>
            <div className="muted small">{c && contName(c.continent)}</div>
          </div>
        </div>
      }
    >
      <div className="status-toggle">
        <button className={status === 'visited' ? 'on visited' : ''} onClick={() => onStatus(status === 'visited' ? null : 'visited')}>
          ✓ {t.visited}
        </button>
        <button className={status === 'wish' ? 'on wish' : ''} onClick={() => onStatus(status === 'wish' ? null : 'wish')}>
          ♡ {t.wish}
        </button>
      </div>
      <div className="section-head">
        <h3>{t.trips} <span className="muted">{trips.length}</span></h3>
        <button className="btn primary small" onClick={onAddTrip}>＋ {t.addTrip}</button>
      </div>
      <div className="trip-list">
        {trips.map((tr) => <TripCard key={tr.id} trip={tr} showCountry={false} onClick={() => onOpenTrip(tr)} />)}
      </div>
    </Sheet>
  )
}
