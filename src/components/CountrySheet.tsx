import { COUNTRY_BY_CODE, flagEmoji } from '../data/countries'
import { useI18n } from '../i18n'
import { LIVED_TIERS, type LivedTier, type Status, type Trip } from '../store'
import Sheet from './Sheet'
import TripCard from './TripCard'

interface Props {
  code: string
  status?: Status
  trips: Trip[]
  diveCount: number
  visits?: number
  isHome?: boolean
  spotCount: number
  onDive: () => void
  onStatus: (s: Status | null, tier?: LivedTier) => void
  livedTier?: LivedTier
  onAddTrip: () => void
  onOpenTrip: (t: Trip) => void
  onClose: () => void
}

export default function CountrySheet({ code, status, livedTier, trips, visits, isHome, diveCount, spotCount, onDive, onStatus, onAddTrip, onOpenTrip, onClose }: Props) {
  const { t, cName, contName, pick, tierName } = useI18n()
  const c = COUNTRY_BY_CODE[code]
  return (
    <Sheet
      onClose={onClose}
      title={
        <div className="country-title">
          <span className="big-flag">{flagEmoji(code)}</span>
          <div>
            <div className="name">
              {cName(c)}
              {isHome && <span className="visit-count home">🏠 {pick('출생 국가', 'Home')}</span>}
              {!isHome && status === 'lived' && <span className="visit-count lived">{t.lived} · {tierName(livedTier)}</span>}
              {!isHome && status === 'visited' && visits ? <span className="visit-count">{pick(`${visits}번 방문`, `${visits}× visited`)}</span> : null}
            </div>
            <div className="muted small">{c && contName(c.continent)}</div>
          </div>
        </div>
      }
    >
      <div className="status-toggle">
        <button className={status === 'visited' ? 'on visited' : ''} onClick={() => onStatus(status === 'visited' ? null : 'visited')}>
          ✓ {t.visited}
        </button>
        <button className={status === 'lived' ? 'on lived' : ''} onClick={() => onStatus(status === 'lived' ? null : 'lived')}>
          ◆ {t.lived}
        </button>
        <button className={status === 'wish' ? 'on wish' : ''} onClick={() => onStatus(status === 'wish' ? null : 'wish')}>
          ♡ {t.wish}
        </button>
      </div>
      {status === 'lived' && (
        <div className="tier-pick">
          <span className="field-label">{pick('얼마나 살았나요?', 'How long?')}</span>
          <div className="seg">
            {LIVED_TIERS.map((tier) => (
              <button key={tier} className={(livedTier ?? 'm1') === tier ? 'on lived' : ''} onClick={() => onStatus('lived', tier)}>
                {tierName(tier)}
              </button>
            ))}
          </div>
        </div>
      )}
      {(diveCount > 0 || spotCount > 0) && (
        <button className="dive-link" onClick={onDive}>
          <span>🤿</span>
          <span className="dive-link-text">
            <b>{t.viewDives}</b>
            <small className="muted">
              {diveCount} {t.times} · {t.spotsIn} {spotCount}
            </small>
          </span>
          <span className="muted">›</span>
        </button>
      )}
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
