import { flagEmoji, COUNTRY_BY_CODE } from '../data/countries'
import { useI18n } from '../i18n'
import type { AppData } from '../store'
import { computeStats } from '../stats'

export default function StatsView({ data, onSelect }: { data: AppData; onSelect: (code: string) => void }) {
  const { t, lang, cName, contName } = useI18n()
  const s = computeStats(data)
  const sortByName = (codes: string[]) => [...codes].sort((a, b) => cName(COUNTRY_BY_CODE[a]).localeCompare(cName(COUNTRY_BY_CODE[b])))
  return (
    <div className="page">
      <div className="hero-stat">
        <div className="ring" style={{ ['--p' as string]: s.percent }}>
          <div>
            <b>{s.percent}%</b>
            <small>{t.ofWorld}</small>
          </div>
        </div>
        <div className="hero-nums">
          <div><b>{s.visited.length}</b><span>{t.visitedCountries}</span></div>
          <div><b>{s.continentsVisited}</b><span>{lang === 'ko' ? '대륙' : 'continents'}</span></div>
          <div><b>{data.trips.length}</b><span>{t.trips}</span></div>
          <div><b>{s.days}</b><span>{lang === 'ko' ? '여행한 날' : 'days traveled'}</span></div>
        </div>
      </div>

      <h3>{t.byContinent}</h3>
      <div className="continent-bars">
        {s.byContinent.map((c) => (
          <div key={c.continent} className="cbar">
            <div className="cbar-label">
              <span>{contName(c.continent)}</span>
              <span className="muted">{c.count} / {c.total}</span>
            </div>
            <div className="cbar-track"><div className="cbar-fill" style={{ width: `${(c.count / c.total) * 100}%` }} /></div>
          </div>
        ))}
      </div>

      <h3>{t.visitedCountries} <span className="muted">{s.visited.length}</span></h3>
      <div className="chips">
        {sortByName(s.visited).map((c) => (
          <button key={c} className="chip visited" onClick={() => onSelect(c)}>{flagEmoji(c)} {cName(COUNTRY_BY_CODE[c])}</button>
        ))}
      </div>
      <h3>{t.wishCountries} <span className="muted">{s.wish.length}</span></h3>
      <div className="chips">
        {sortByName(s.wish).map((c) => (
          <button key={c} className="chip wish" onClick={() => onSelect(c)}>{flagEmoji(c)} {cName(COUNTRY_BY_CODE[c])}</button>
        ))}
      </div>
    </div>
  )
}
