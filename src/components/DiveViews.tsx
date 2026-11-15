import { COUNTRY_BY_CODE, flagEmoji } from '../data/countries'
import type { DiveSpot } from '../data/diveSpots'
import { ABUNDANCE, CONDITIONS, MOODS, SPOT_TYPES, SUITS } from '../data/marine'
import { SPECIES_BY_KEY } from '../data/species'
import { speciesView } from '../speciesInfo'
import type { CustomSpecies } from '../store'
import { useI18n } from '../i18n'
import type { AppData, Dive } from '../store'
import { diveStats, fmtMinutes, isPlanned, sortDivesDesc, spotMap } from '../dive'
import Sheet from './Sheet'
import ProfileChart from './ProfileChart'
import { approxProfile, planDive } from '../divelog/plan'
import { BRIEF_TOTAL } from '../divelog/briefing'
import { Thumb } from './TripCard'

const moodEmoji = (m: number) => MOODS.find((x) => x[0] === m)?.[1] ?? ''

export function MarineChip({ k, custom, count }: { k: string; custom?: Record<string, CustomSpecies>; count?: string }) {
  const { pick } = useI18n()
  const v = speciesView(k, custom)
  const a = ABUNDANCE.find((x) => x[0] === count)
  return (
    <span className="chip static life-chip">
      {v.photo ? <img src={v.photo('square')} alt="" /> : <span>{v.emoji}</span>}
      {pick(v.ko, v.en)}
      {a && <b className="abund-tag">{pick(a[1], a[2])}</b>}
    </span>
  )
}

function LifeThumbs({ keys, custom }: { keys: string[]; custom: Record<string, CustomSpecies> }) {
  return (
    <div className="life-thumbs">
      {keys.slice(0, 6).map((k) => {
        const v = speciesView(k, custom)
        return v.photo ? <img key={k} src={v.photo('square')} alt="" title={v.ko} /> : <span key={k}>{v.emoji}</span>
      })}
      {keys.length > 6 && <small className="muted">+{keys.length - 6}</small>}
    </div>
  )
}

function fmtDate(d: string, lang: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function DiveCard({ dive, no, spot, onClick, showCountry = true, custom = {} }: {
  dive: Dive
  no: number
  spot?: DiveSpot
  onClick: () => void
  showCountry?: boolean
  custom?: Record<string, CustomSpecies>
}) {
  const { lang, t, spotName, cName } = useI18n()
  return (
    <button className="dive-card" onClick={onClick}>
      {isPlanned(dive) ? (
        <div className="dive-no planned">
          <small>{lang === 'ko' ? '예정' : 'Plan'}</small>
          <b>📋</b>
        </div>
      ) : (
        <div className="dive-no">
          <small>No.</small>
          <b>{no}</b>
        </div>
      )}
      <div className="dive-main">
        <div className="dive-spot">
          {spotName(spot) || t.unknownSpot} {dive.mood ? moodEmoji(dive.mood) : ''}
        </div>
        <div className="muted small">
          {showCountry && <>{flagEmoji(dive.country)} {cName(COUNTRY_BY_CODE[dive.country])} · </>}
          {fmtDate(dive.date, lang)}
        </div>
        {isPlanned(dive) && dive.plan && (
          <div className="dive-metrics planned-line">
            <span>{lang === 'ko' ? '계획' : 'Plan'} ⬇ {dive.plan.depth}m · ⏱ {dive.plan.time}{lang === 'ko' ? '분' : 'min'}</span>
            <b>{lang === 'ko' ? '다이빙 후 눌러서 ③ 디브리프 ›' : 'Tap after the dive to debrief ›'}</b>
          </div>
        )}
        <div className="dive-metrics">
          {dive.maxDepth != null && <span>⬇ {dive.maxDepth}m</span>}
          {dive.bottomTime != null && <span>⏱ {dive.bottomTime}{lang === 'ko' ? '분' : 'min'}</span>}
          {dive.waterTemp != null && <span>🌡 {dive.waterTemp}°</span>}
          {dive.visibility != null && <span>👁 {dive.visibility}m</span>}
        </div>
        {dive.marineLife.length > 0 && <LifeThumbs keys={dive.marineLife} custom={custom} />}
      </div>
      {dive.photoIds[0] && <Thumb id={dive.photoIds[0]} className="dive-thumb" />}
    </button>
  )
}

export function DiveDetail({ dive, no, spot, custom = {}, onEdit, onClose }: {
  dive: Dive
  no: number
  spot?: DiveSpot
  custom?: Record<string, CustomSpecies>
  onEdit: () => void
  onClose: () => void
}) {
  const { t, lang, pick, spotName, cName } = useI18n()
  const mood = MOODS.find((m) => m[0] === dive.mood)
  const suit = SUITS.find((s) => s[0] === dive.suit)
  const rows: [string, string | undefined][] = [
    [t.maxDepth, dive.maxDepth != null ? `${dive.maxDepth} m` : undefined],
    [t.avgDepth, dive.avgDepth != null ? `${dive.avgDepth} m` : undefined],
    [t.bottomTime, dive.bottomTime != null ? fmtMinutes(dive.bottomTime, lang) : undefined],
    [t.waterTemp, dive.waterTemp != null ? `${dive.waterTemp} °C` : undefined],
    [t.visibility, dive.visibility != null ? `${dive.visibility} m` : undefined],
    [t.weight, dive.weight != null ? `${dive.weight} kg` : undefined],
    [t.startBar + ' → ' + t.endBar, dive.startBar != null || dive.endBar != null ? `${dive.startBar ?? '?'} → ${dive.endBar ?? '?'} bar` : undefined],
    [t.gas, dive.gas === 'air' ? 'Air' : `${t.nitrox} ${dive.gas.replace('ean', '')}%`],
    [t.suit, suit ? pick(suit[1], suit[2]) : undefined],
    [t.entry, dive.entry ? (dive.entry === 'boat' ? t.boat : t.shore) : undefined],
    [t.current, dive.current ? { none: t.curNone, weak: t.curWeak, medium: t.curMedium, strong: t.curStrong }[dive.current] : undefined],
    [t.time, dive.time || undefined],
    [t.buddy, dive.buddy || undefined],
    [pick('다이빙 컴퓨터', 'Dive computer'), dive.computer || undefined],
    [t.shop, dive.shop || undefined],
  ]
  return (
    <Sheet onClose={onClose} title={isPlanned(dive) ? <>📋 {pick('다이빙 예정', 'Upcoming dive')}</> : <>🤿 No. {no}</>}>
      <div className="trip-detail">
        <h2>{spotName(spot) || t.unknownSpot}</h2>
        <div className="muted">
          {flagEmoji(dive.country)} {cName(COUNTRY_BY_CODE[dive.country])} · {fmtDate(dive.date, lang)}
        </div>
        {mood && (
          <div className="mood-line">
            <span className="mood-big">{mood[1]}</span> {pick(mood[2], mood[3])}
            {dive.conditions.length > 0 && (
              <span className="muted"> · {dive.conditions.map((c) => {
                const x = CONDITIONS.find((y) => y[0] === c)
                return x ? pick(x[1], x[2]) : c
              }).join(', ')}</span>
            )}
          </div>
        )}
        {(() => {
          const approx = approxProfile(dive)
          const actual = dive.profile?.length ? dive.profile : approx
          if (!actual && !dive.plan) return null
          return (
            <ProfileChart
              title={dive.profile?.length ? undefined : approx ? pick('대략 그래프 (수심·시간으로 그림)', 'Approximate profile (from depth & time)') : pick('다이빙 계획', 'Dive plan')}
              series={[
                ...(dive.plan ? [{ points: planDive(dive.plan.depth, dive.plan.time, dive.plan.gas).curve, kind: 'plan' as const }] : []),
                ...(actual ? [{ points: actual, kind: 'actual' as const }] : []),
              ]}
            />
          )
        })()}
        <div className="log-grid">
          {rows.filter((r) => r[1]).map(([k, v]) => (
            <div key={k}><span>{k}</span><b>{v}</b></div>
          ))}
        </div>
        {dive.plan && (
          <div className="plan-line">
            📋 {pick('계획', 'Plan')} {dive.plan.depth}m · {dive.plan.time}{pick('분', 'min')}
            {dive.plan.turnBar ? ` · ${pick('상승 시작', 'turn')} ${dive.plan.turnBar} bar` : ''}
            {dive.plan.briefing && (
              <b> · {dive.plan.briefing.length === BRIEF_TOTAL ? pick('브리핑 완료 ✓', 'Briefed ✓') : `${pick('브리핑', 'Briefing')} ${dive.plan.briefing.length}/${BRIEF_TOTAL}`}</b>
            )}
          </div>
        )}
        {dive.marineLife.length > 0 && (
          <>
            <h4 className="form-section">🐠 {t.marineLife}</h4>
            <div className="chips">{dive.marineLife.map((k) => <MarineChip key={k} k={k} custom={custom} count={dive.lifeCounts?.[k]} />)}</div>
          </>
        )}
        {dive.photoIds.length > 0 && (
          <div className="detail-photos">
            {dive.photoIds.map((p) => <Thumb key={p} id={p} className="detail-photo" />)}
          </div>
        )}
        {dive.debrief && (dive.debrief.good || dive.debrief.improve || dive.debrief.next) && (
          <div className="debrief-view">
            <h4 className="form-section">🗣️ {pick('디브리프 회고', 'Debrief')}</h4>
            {dive.debrief.good && <p><b>👍 {pick('잘된 점', 'Went well')}</b> {dive.debrief.good}</p>}
            {dive.debrief.improve && <p><b>🔧 {pick('아쉬운 점', 'To improve')}</b> {dive.debrief.improve}</p>}
            {dive.debrief.next && <p><b>➡️ {pick('다음 다이빙에', 'Next time')}</b> {dive.debrief.next}</p>}
          </div>
        )}
        {dive.note && <p className="detail-note">{dive.note}</p>}
        <div className="form-actions">
          <span className="spacer" />
          <button className="btn primary" onClick={onEdit}>{isPlanned(dive) ? `③ ${pick('디브리프 시작', 'Start debrief')}` : t.editDive}</button>
        </div>
      </div>
    </Sheet>
  )
}

export function DiveStatsRow({ data }: { data: AppData }) {
  const { t, lang } = useI18n()
  const s = diveStats(data)
  return (
    <div className="dive-stats">
      <div><b>{s.count}</b><span>{t.totalDives}</span></div>
      <div><b>{fmtMinutes(s.totalMin, lang)}</b><span>{t.totalTime}</span></div>
      <div><b>{s.maxDepth}m</b><span>{t.deepest}</span></div>
      <div><b>{s.countries}</b><span>{t.diveCountries}</span></div>
      <div><b>{s.spots}</b><span>{t.spotsIn}</span></div>
      <div><b>{s.species}</b><span>{t.species}</span></div>
    </div>
  )
}

export function DiveLogView({ data, numbers, onOpen, onAdd, onImport, onPlan }: {
  data: AppData
  numbers: Record<string, number>
  onOpen: (d: Dive) => void
  onAdd: () => void
  onImport: () => void
  onPlan: () => void
}) {
  const { t, pick } = useI18n()
  const spots = spotMap(data)
  const dives = sortDivesDesc(data.dives)
  return (
    <div className="page">
      <div className="section-head">
        <h2>🤿 {t.logbook}</h2>
        <button className="btn primary small" onClick={onAdd}>＋ {t.addDive}</button>
      </div>
      <DiveStatsRow data={data} />
      <div className="log-actions">
        <button className="import-link" onClick={onPlan}>📋 {pick('다이빙 계획', 'Plan a dive')} <span className="muted">›</span></button>
        <button className="import-link" onClick={onImport}>⌚ {pick('컴퓨터 기록 불러오기', 'Import from computer')} <span className="muted">›</span></button>
      </div>
      {dives.length === 0 && (
        <div className="empty">
          <div className="empty-emoji">🤿</div>
          <p>{t.noDives}</p>
          <p className="muted">{t.noDivesHint}</p>
        </div>
      )}
      <div className="trip-list">
        {dives.map((d) => <DiveCard key={d.id} dive={d} no={numbers[d.id]} spot={spots[d.spotId]} custom={data.customSpecies} onClick={() => onOpen(d)} />)}
      </div>
    </div>
  )
}

function SpotRow({ spot, count, onClick }: { spot: DiveSpot; count: number; onClick: () => void }) {
  const { spotName, pick, t } = useI18n()
  const type = spot.type ? SPOT_TYPES[spot.type] : undefined
  return (
    <button className="spot-row" onClick={onClick}>
      <span className={count ? 'spot-pin mine' : 'spot-pin'} />
      <div className="spot-info">
        <div className="spot-name">{spot.custom ? '⭐ ' : ''}{spotName(spot)}</div>
        <div className="muted small">
          {type && pick(type[0], type[1])}
          {spot.highlights.length > 0 && ' · ' + spot.highlights.map((h) => SPECIES_BY_KEY[h]?.emoji ?? '').join(' ')}
        </div>
      </div>
      {count > 0 && <span className="count-badge">{count}{pick(t.times, '')}</span>}
    </button>
  )
}

export function DiveCountrySheet({ code, data, onOpenSpot, onAddDive, onPlan, onFindArea, onClose }: {
  code: string
  data: AppData
  onOpenSpot: (id: string) => void
  onAddDive: () => void
  onPlan: () => void
  onFindArea: () => void
  onClose: () => void
}) {
  const { t, cName, spotName, pick } = useI18n()
  const spots = Object.values(spotMap(data)).filter((s) => s.country === code)
  const counts: Record<string, number> = {}
  for (const d of data.dives) if (d.country === code) counts[d.spotId] = (counts[d.spotId] ?? 0) + 1
  const mine = spots.filter((s) => counts[s.id]).sort((a, b) => counts[b.id] - counts[a.id])
  const others = spots.filter((s) => !counts[s.id]).sort((a, b) => spotName(a).localeCompare(spotName(b)))
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return (
    <Sheet
      onClose={onClose}
      title={
        <div className="country-title">
          <span className="big-flag">{flagEmoji(code)}</span>
          <div>
            <div className="name">{cName(COUNTRY_BY_CODE[code])}</div>
            <div className="muted small">🤿 {total} {t.times} · {t.spotsIn} {spots.length}</div>
          </div>
        </div>
      }
    >
      <div className="row">
        <button className="btn ghost" onClick={onPlan}>📋 {pick('계획', 'Plan')}</button>
        <button className="btn primary grow" onClick={onAddDive}>＋ {t.addDive}</button>
      </div>
      <button className="find-area-btn" onClick={onFindArea}>🔍 {pick('지역으로 다이빙 포인트 찾기 (예: 샤오류추)', 'Find dive sites by area')}</button>
      {mine.length > 0 && (
        <section>
          <h3 className="sub">{t.mySpots}</h3>
          <div className="spot-list">{mine.map((s) => <SpotRow key={s.id} spot={s} count={counts[s.id]} onClick={() => onOpenSpot(s.id)} />)}</div>
        </section>
      )}
      <section>
        <h3 className="sub">{t.otherSpots}</h3>
        {others.length === 0 && <p className="muted small">{t.noSpots}</p>}
        <div className="spot-list">{others.map((s) => <SpotRow key={s.id} spot={s} count={0} onClick={() => onOpenSpot(s.id)} />)}</div>
      </section>
      <p className="muted small">{t.approx}</p>
    </Sheet>
  )
}

export function SpotSheet({ spot, data, numbers, onOpenDive, onAddDive, onPlan, onBack, onClose }: {
  spot: DiveSpot
  data: AppData
  numbers: Record<string, number>
  onOpenDive: (d: Dive) => void
  onAddDive: () => void
  onPlan: () => void
  onBack: () => void
  onClose: () => void
}) {
  const { t, pick, spotName, cName } = useI18n()
  const dives = sortDivesDesc(data.dives.filter((d) => d.spotId === spot.id))
  const type = spot.type ? SPOT_TYPES[spot.type] : undefined
  return (
    <Sheet
      onClose={onClose}
      title={
        <button className="back-title" onClick={onBack}>
          ‹ {flagEmoji(spot.country)} {cName(COUNTRY_BY_CODE[spot.country])}
        </button>
      }
    >
      <div>
        <h2>{spotName(spot)}</h2>
        <div className="muted small">
          {type && pick(type[0], type[1])}
          {isFinite(spot.lat) && ` · ${spot.lat.toFixed(3)}, ${spot.lon.toFixed(3)}`}
        </div>
      </div>
      {spot.highlights.length > 0 && <div className="chips">{spot.highlights.map((h) => <MarineChip key={h} k={h} />)}</div>}
      <div className="row">
        <button className="btn ghost" onClick={onPlan}>📋 {pick('다이빙 계획', 'Plan')}</button>
        <button className="btn primary grow" onClick={onAddDive}>{t.diveHere}</button>
      </div>
      <h3 className="sub">{t.divesHere} <span className="muted">{dives.length}</span></h3>
      <div className="trip-list">
        {dives.map((d) => <DiveCard key={d.id} dive={d} no={numbers[d.id]} spot={spot} showCountry={false} custom={data.customSpecies} onClick={() => onOpenDive(d)} />)}
      </div>
    </Sheet>
  )
}
