import { useMemo, useRef, useState } from 'react'
import { COUNTRIES, COUNTRY_BY_CODE, flagEmoji } from '../data/countries'
import { KNOWN_PLACES, normName } from '../data/places'
import type { Status } from '../store'
import { useI18n } from '../i18n'

/** 지도 위 검색: 나라 또는 도시 이름 → 그 나라로 확대하고 열기 */
export default function MapSearch({ statuses, onPick }: { statuses: Record<string, Status>; onPick: (code: string) => void }) {
  const { cName, pick, t } = useI18n()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const ref = useRef<HTMLInputElement>(null)

  const items = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return []
    const n = normName(query)
    const starts = (c: (typeof COUNTRIES)[number]) => c.nameKo.startsWith(query) || c.nameEn.toLowerCase().startsWith(query)
    const countries = COUNTRIES.filter((c) => c.nameKo.includes(query) || c.nameEn.toLowerCase().includes(query) || c.code.toLowerCase() === query)
      .sort((a, b) => Number(!starts(a)) - Number(!starts(b)) || cName(a).localeCompare(cName(b)))
      .slice(0, 6)
      .map((c) => ({ code: c.code, label: cName(c), sub: pick(c.nameEn, c.nameKo), city: false }))
    const cities = KNOWN_PLACES.filter((p) => p.names.some((x) => normName(x).startsWith(n)))
      .slice(0, 4)
      .map((p) => {
        const code = COUNTRY_BY_CODE[p.country] ? p.country : (p.parent ?? p.country)
        const name = p.names.find((x) => normName(x).startsWith(n)) ?? p.names[0]
        return { code, label: name, sub: cName(COUNTRY_BY_CODE[code]), city: true }
      })
    return [...countries, ...cities].filter((x) => COUNTRY_BY_CODE[x.code])
  }, [q, cName, pick])

  const choose = (code: string) => {
    onPick(code)
    setQ('')
    setOpen(false)
    ref.current?.blur()
  }

  return (
    <div className="map-search">
      <span className="ms-icon">🔍</span>
      <input
        ref={ref}
        value={q}
        placeholder={pick('나라·도시 찾기 (예: 몰타, 교토, japan)', 'Find a country or city')}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          setHi(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setHi((h) => Math.min(h + 1, items.length - 1))
          else if (e.key === 'ArrowUp') setHi((h) => Math.max(h - 1, 0))
          else if (e.key === 'Enter' && items[hi]) {
            e.preventDefault()
            choose(items[hi].code)
          } else if (e.key === 'Escape') ref.current?.blur()
        }}
      />
      {q && <button className="ms-clear" aria-label="clear" onMouseDown={(e) => e.preventDefault()} onClick={() => setQ('')}>✕</button>}
      {open && q.trim() && (
        <ul className="cs-list" role="listbox">
          {items.map((it, i) => {
            const st = statuses[it.code]
            return (
              <li key={(it.city ? 'c:' : '') + it.code + it.label}>
                <button type="button" className={i === hi ? 'hi' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(it.code)}>
                  <span>{it.city ? '📍' : flagEmoji(it.code)}</span> {it.label}
                  <small className="muted">
                    {it.city ? `${flagEmoji(it.code)} ${it.sub}` : it.sub}
                    {st && ` · ${st === 'visited' ? t.visited : t.wish}`}
                  </small>
                </button>
              </li>
            )
          })}
          {items.length === 0 && <li className="muted small cs-empty">{pick('검색 결과가 없어요', 'No matches')}</li>}
        </ul>
      )}
    </div>
  )
}
