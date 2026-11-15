import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { searchPlaces, type Place, type PlaceResult } from '../geo'

/** 도시 검색해서 칩으로 추가 (좌표 포함). 검색이 안 되면 이름만 추가 */
export default function PlacePicker({ places, country, onChange, placeholder }: {
  places: (Place | { name: string; lat?: undefined; lon?: undefined })[]
  country?: string
  onChange: (p: (Place | { name: string })[]) => void
  placeholder?: string
}) {
  const { lang, pick } = useI18n()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [open, setOpen] = useState(false)
  const timer = useRef<number>(0)

  useEffect(() => {
    clearTimeout(timer.current)
    if (!q.trim()) return setResults([])
    timer.current = window.setTimeout(() => {
      searchPlaces(q, lang, country || undefined)
        .then(setResults)
        .catch(() => setResults([]))
    }, 300)
    return () => clearTimeout(timer.current)
  }, [q, lang, country])

  const add = (p: Place | { name: string }) => {
    if (!places.some((x) => x.name === p.name)) onChange([...places, p])
    setQ('')
    setResults([])
  }

  return (
    <div className="place-search">
      {places.length > 0 && (
        <div className="place-chips">
          {places.map((p) => (
            <span key={p.name} className={p.lat != null ? 'place-chip' : 'place-chip nocoord'} title={p.lat != null ? '' : pick('지도 위치 없음', 'No map location')}>
              {p.lat != null ? '📍' : '•'} {p.name}
              <button type="button" aria-label="remove" onClick={() => onChange(places.filter((x) => x.name !== p.name))}>✕</button>
            </span>
          ))}
        </div>
      )}
      <input
        value={q}
        placeholder={placeholder}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (results[0]) add(results[0])
            else if (q.trim()) add({ name: q.trim() })
          }
        }}
      />
      {open && q.trim() && (
        <ul className="cs-list" role="listbox">
          {results.map((r, i) => (
            <li key={i}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add({ name: r.name, lat: r.lat, lon: r.lon })}>
                <span>📍</span> {r.name}
                <small className="muted">{[r.admin, r.country].filter(Boolean).join(', ')}</small>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add({ name: q.trim() })}>
              <span>＋</span> {pick(`"${q.trim()}" 이름만 추가`, `Add "${q.trim()}" as text`)}
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
