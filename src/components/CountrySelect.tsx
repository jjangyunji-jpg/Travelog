import { useMemo, useRef, useState } from 'react'
import { COUNTRIES, COUNTRY_BY_CODE, flagEmoji } from '../data/countries'
import { useI18n } from '../i18n'

/** 검색해서 고르는 나라 선택 (한/영/코드) */
export default function CountrySelect({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const { cName, pick } = useI18n()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    const starts = (c: (typeof COUNTRIES)[number]) =>
      c.nameKo.startsWith(query) || c.nameEn.toLowerCase().startsWith(query) || c.code.toLowerCase() === query
    return COUNTRIES.filter((c) => !query || c.nameKo.includes(query) || c.nameEn.toLowerCase().includes(query) || c.code.toLowerCase() === query)
      .sort((a, b) => (query ? Number(!starts(a)) - Number(!starts(b)) : 0) || cName(a).localeCompare(cName(b)))
      .slice(0, 60)
  }, [q, cName])

  const choose = (code: string) => {
    onChange(code)
    setOpen(false)
    setQ('')
    inputRef.current?.blur()
  }

  const selected = COUNTRY_BY_CODE[value]
  return (
    <div className="country-select">
      <div className="cs-input">
        <span className="cs-flag">{open || !selected ? '🔍' : flagEmoji(value)}</span>
        <input
          ref={inputRef}
          value={open ? q : selected ? cName(selected) : ''}
          placeholder={pick('나라 검색 (예: 필리핀, japan)', 'Search country')}
          onFocus={() => {
            setOpen(true)
            setQ('')
            setHi(0)
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setQ(e.target.value)
            setHi(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setHi((h) => Math.min(h + 1, list.length - 1))
            else if (e.key === 'ArrowUp') setHi((h) => Math.max(h - 1, 0))
            else if (e.key === 'Enter') {
              e.preventDefault()
              if (list[hi]) choose(list[hi].code)
            } else if (e.key === 'Escape') inputRef.current?.blur()
          }}
        />
      </div>
      {open && (
        <ul className="cs-list" role="listbox">
          {list.map((c, i) => (
            <li key={c.code}>
              <button type="button" className={i === hi ? 'hi' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(c.code)}>
                <span>{flagEmoji(c.code)}</span> {cName(c)}
                <small className="muted">{pick(c.nameEn, c.nameKo)}</small>
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="muted small cs-empty">{pick('검색 결과가 없어요', 'No matches')}</li>}
        </ul>
      )}
    </div>
  )
}
