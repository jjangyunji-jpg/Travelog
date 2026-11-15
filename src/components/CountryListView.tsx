import { useMemo, useState } from 'react'
import { CONTINENTS, COUNTRIES, flagEmoji, type Continent } from '../data/countries'
import { useI18n } from '../i18n'
import type { Status } from '../store'

export default function CountryListView({ statuses, onSelect, onStatus }: {
  statuses: Record<string, Status>
  onSelect: (code: string) => void
  onStatus: (code: string, s: Status | null) => void
}) {
  const { t, cName, contName } = useI18n()
  const [q, setQ] = useState('')
  const [cont, setCont] = useState<Continent | 'ALL'>('ALL')
  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    return COUNTRIES.filter((c) => c.continent !== 'AN' || c.code === 'AQ')
      .filter((c) => cont === 'ALL' || c.continent === cont)
      .filter((c) => !query || c.nameKo.includes(query) || c.nameEn.toLowerCase().includes(query) || c.code.toLowerCase() === query)
      .sort((a, b) => {
        // 검색어로 시작하는 이름을 먼저 (예: '프랑스' 검색 시 프랑스가 맨 위)
        if (query) {
          const sa = Number(!(a.nameKo.startsWith(query) || a.nameEn.toLowerCase().startsWith(query)))
          const sb = Number(!(b.nameKo.startsWith(query) || b.nameEn.toLowerCase().startsWith(query)))
          if (sa !== sb) return sa - sb
        }
        return cName(a).localeCompare(cName(b))
      })
  }, [q, cont, cName])

  return (
    <div className="page">
      <input className="search" placeholder={`🔍 ${t.search}`} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="tabs-scroll">
        <button className={cont === 'ALL' ? 'pill on' : 'pill'} onClick={() => setCont('ALL')}>{t.all}</button>
        {CONTINENTS.map((c) => (
          <button key={c} className={cont === c ? 'pill on' : 'pill'} onClick={() => setCont(c)}>{contName(c)}</button>
        ))}
      </div>
      <ul className="country-list">
        {list.map((c) => {
          const s = statuses[c.code]
          return (
            <li key={c.code}>
              <button className="country-row" onClick={() => onSelect(c.code)}>
                <span className="flag">{flagEmoji(c.code)}</span>
                <span className="cname">{cName(c)}</span>
              </button>
              <button className={s === 'wish' ? 'mini wish on' : 'mini wish'} onClick={() => onStatus(c.code, s === 'wish' ? null : 'wish')} aria-label={t.wish}>♡</button>
              <button className={s === 'visited' ? 'mini visited on' : 'mini visited'} onClick={() => onStatus(c.code, s === 'visited' ? null : 'visited')} aria-label={t.visited}>✓</button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
