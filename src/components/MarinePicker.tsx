import { useEffect, useMemo, useState } from 'react'
import { BUILTIN_SPOTS, type DiveSpot } from '../data/diveSpots'
import { COLORS, GROUPS, SIZES, SPECIES, regionOf, type Group, type Region, type Size } from '../data/species'
import { useI18n } from '../i18n'
import { nearbySpecies, searchSpecies, toCustom, type InatTaxon } from '../inat'
import { KEY_BY_TAXON, speciesView, type SpeciesView } from '../speciesInfo'
import type { CustomSpecies } from '../store'

interface Props {
  selected: string[]
  spot?: DiveSpot
  country?: string
  customSpecies: Record<string, CustomSpecies>
  onChange: (keys: string[]) => void
  onAddSpecies: (list: CustomSpecies[]) => void
  onClose: () => void
}

function spotRegion(spot?: DiveSpot, country?: string): Region | undefined {
  if (spot && isFinite(spot.lat) && isFinite(spot.lon)) return regionOf(spot.lat, spot.lon)
  const ref = BUILTIN_SPOTS.find((s) => s.country === (spot?.country ?? country))
  return ref ? regionOf(ref.lat, ref.lon) : undefined
}

export function SpeciesTile({ v, on, note, onClick }: { v: SpeciesView; on: boolean; note?: string; onClick: () => void }) {
  const { lang } = useI18n()
  const name = lang === 'ko' ? v.ko : v.en
  return (
    <button type="button" className={on ? 'sp-tile on' : 'sp-tile'} onClick={onClick} title={v.sci}>
      <div className="sp-img">
        {v.photo ? <img src={v.photo('small')} alt="" loading="lazy" /> : <span className="sp-emoji">{v.emoji}</span>}
        {on && <span className="sp-check">✓</span>}
        {note && <span className="sp-note">{note}</span>}
      </div>
      <div className="sp-name">{name}</div>
    </button>
  )
}

export default function MarinePicker({ selected, spot, country, customSpecies, onChange, onAddSpecies, onClose }: Props) {
  const { t, lang, pick, spotName } = useI18n()
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<Group | ''>('')
  const [colors, setColors] = useState<string[]>([])
  const [size, setSize] = useState<Size | ''>('')
  const [nearby, setNearby] = useState<{ taxon: InatTaxon; count: number }[] | null>(null)
  const [nearbyState, setNearbyState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [online, setOnline] = useState<InatTaxon[] | null>(null)
  const [onlineState, setOnlineState] = useState<'idle' | 'loading' | 'error'>('idle')
  // 온라인에서 고른 생물 정보 (저장 전까지 임시 보관)
  const [extra, setExtra] = useState<Record<string, CustomSpecies>>({})
  const allCustom = { ...customSpecies, ...extra }

  const region = spotRegion(spot, country)
  const highlights = spot?.highlights ?? []
  const filtering = !!(q.trim() || group || colors.length || size)

  // 스팟 근처 관찰 기록 불러오기
  useEffect(() => {
    if (!spot || !isFinite(spot.lat) || !isFinite(spot.lon)) return
    setNearbyState('loading')
    nearbySpecies(spot.lat, spot.lon, lang)
      .then((list) => {
        setNearby(list)
        setNearbyState('idle')
      })
      .catch(() => setNearbyState('error'))
  }, [spot, lang])

  const toggle = (key: string, info?: CustomSpecies) => {
    if (info && !allCustom[key]) setExtra((e) => ({ ...e, [key]: info }))
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key])
  }

  const done = () => {
    const used = Object.values(extra).filter((x) => selected.includes(x.key))
    if (used.length) onAddSpecies(used)
    onClose()
  }

  // 도감 필터
  const catalog = useMemo(() => {
    const query = q.trim().toLowerCase()
    return SPECIES.filter((s) => s.key !== 'wreck' || !filtering)
      .filter((s) => !group || s.group === group)
      .filter((s) => colors.every((c) => s.colors.includes(c)))
      .filter((s) => !size || s.size === size)
      .filter((s) => !query || s.ko.includes(query) || s.en.toLowerCase().includes(query) || s.sci.toLowerCase().includes(query))
      .sort((a, b) => Number(!(region && a.regions.includes(region))) - Number(!(region && b.regions.includes(region))))
  }, [q, group, colors, size, region, filtering])

  // 근처 관찰 기록 → 도감에 있는 종 / 없는 종
  const nearbyCatalogKeys = useMemo(
    () => (nearby ?? []).map((n) => KEY_BY_TAXON[n.taxon.id]).filter(Boolean),
    [nearby],
  )
  const nearbyCounts = useMemo(
    () => Object.fromEntries((nearby ?? []).map((n) => [KEY_BY_TAXON[n.taxon.id] ?? 'inat:' + n.taxon.id, n.count])),
    [nearby],
  )

  const spotKeys = useMemo(() => {
    const keys = [...highlights, ...nearbyCatalogKeys]
    if (region) keys.push(...SPECIES.filter((s) => s.regions.includes(region) && s.key !== 'wreck').map((s) => s.key))
    else keys.push(...SPECIES.filter((s) => s.key !== 'wreck').map((s) => s.key))
    return [...new Set(keys)]
  }, [highlights, nearbyCatalogKeys, region])

  const nearbyOthers = (nearby ?? []).filter((n) => !KEY_BY_TAXON[n.taxon.id]).slice(0, 36)

  const runOnline = () => {
    if (!q.trim()) return
    setOnlineState('loading')
    searchSpecies(q.trim(), lang)
      .then((r) => {
        setOnline(r)
        setOnlineState('idle')
      })
      .catch(() => setOnlineState('error'))
  }

  const noteFor = (key: string) =>
    highlights.includes(key) ? pick('대표', 'Top') : nearbyCounts[key] ? pick(`관찰 ${nearbyCounts[key]}`, `${nearbyCounts[key]} obs`) : undefined

  return (
    <div className="picker-overlay marine-picker">
      <div className="picker-head">
        <b>🐠 {t.marineLife} {selected.length > 0 && <span className="count-badge">{selected.length}</span>}</b>
        <button type="button" className="btn primary small" onClick={done}>{t.confirm}</button>
      </div>

      <input className="search" placeholder={`🔍 ${pick('이름으로 찾기 (예: 거북, 니모, frogfish)', 'Search by name')}`} value={q} onChange={(e) => { setQ(e.target.value); setOnline(null) }} />

      <div className="filters">
        <div className="tabs-scroll">
          {GROUPS.map(([g, emoji, ko, en]) => (
            <button type="button" key={g} className={group === g ? 'pill on' : 'pill'} onClick={() => setGroup(group === g ? '' : g)}>{emoji} {pick(ko, en)}</button>
          ))}
        </div>
        <div className="tabs-scroll swatches">
          {COLORS.map(([c, css, ko, en]) => (
            <button type="button" key={c} className={colors.includes(c) ? 'swatch on' : 'swatch'} title={pick(ko, en)} onClick={() => setColors(colors.includes(c) ? colors.filter((x) => x !== c) : [...colors, c])}>
              <i style={{ background: css }} />
              <small>{pick(ko, en)}</small>
            </button>
          ))}
        </div>
        <div className="tabs-scroll">
          {SIZES.map(([s, ko, en]) => (
            <button type="button" key={s} className={size === s ? 'pill on' : 'pill'} onClick={() => setSize(size === s ? '' : s)}>{pick(ko, en)}</button>
          ))}
          {filtering && <button type="button" className="pill" onClick={() => { setQ(''); setGroup(''); setColors([]); setSize(''); setOnline(null) }}>✕ {pick('필터 지우기', 'Clear')}</button>}
        </div>
      </div>

      <div className="picker-scroll">
        {selected.length > 0 && (
          <section>
            <h4 className="sub">✓ {pick('내가 본 생물', 'Selected')}</h4>
            <div className="sp-grid">
              {selected.map((k) => <SpeciesTile key={k} v={speciesView(k, allCustom)} on onClick={() => toggle(k)} />)}
            </div>
          </section>
        )}

        {!filtering && (
          <>
            <section>
              <h4 className="sub">📍 {spot ? pick(`${spotName(spot)}에서 볼 수 있는 생물`, `Seen at ${spotName(spot)}`) : pick('자주 보는 생물', 'Common species')}</h4>
              {nearbyState === 'loading' && <p className="muted small">{pick('근처 관찰 기록 불러오는 중…', 'Loading nearby sightings…')}</p>}
              <div className="sp-grid">
                {spotKeys.map((k) => <SpeciesTile key={k} v={speciesView(k)} on={selected.includes(k)} note={noteFor(k)} onClick={() => toggle(k)} />)}
              </div>
            </section>
            {nearbyOthers.length > 0 && (
              <section>
                <h4 className="sub">🔭 {pick('이 근처에서 관찰된 다른 생물', 'Other species seen nearby')}</h4>
                <p className="muted small">{pick('iNaturalist 다이버·연구자들의 관찰 기록', 'From iNaturalist observations')}</p>
                <div className="sp-grid">
                  {nearbyOthers.map(({ taxon, count }) => {
                    const c = toCustom(taxon)
                    return <SpeciesTile key={c.key} v={speciesView(c.key, { [c.key]: c })} on={selected.includes(c.key)} note={pick(`관찰 ${count}`, `${count} obs`)} onClick={() => toggle(c.key, c)} />
                  })}
                </div>
              </section>
            )}
            {nearbyState === 'error' && <p className="muted small">{pick('오프라인이라 근처 관찰 기록을 불러오지 못했어요.', 'Offline: nearby sightings unavailable.')}</p>}
          </>
        )}

        {filtering && (
          <section>
            <h4 className="sub">📖 {pick('도감에서 찾은 생물', 'From the field guide')} <span className="muted">{catalog.length}</span></h4>
            <div className="sp-grid">
              {catalog.map((s) => <SpeciesTile key={s.key} v={speciesView(s.key)} on={selected.includes(s.key)} note={noteFor(s.key)} onClick={() => toggle(s.key)} />)}
            </div>
            {catalog.length === 0 && <p className="muted small">{pick('조건에 맞는 생물이 도감에 없어요.', 'Nothing matches in the guide.')}</p>}
          </section>
        )}

        {q.trim() && (
          <section>
            {online === null ? (
              <button type="button" className="btn ghost block" onClick={runOnline} disabled={onlineState === 'loading'}>
                🌐 {onlineState === 'loading' ? pick('찾는 중…', 'Searching…') : pick(`온라인 도감에서 "${q.trim()}" 더 찾기`, `Search "${q.trim()}" online`)}
              </button>
            ) : (
              <>
                <h4 className="sub">🌐 {pick('온라인 도감 (iNaturalist)', 'Online (iNaturalist)')} <span className="muted">{online.length}</span></h4>
                <div className="sp-grid">
                  {online.map((taxon) => {
                    const known = KEY_BY_TAXON[taxon.id]
                    if (known) return <SpeciesTile key={known} v={speciesView(known)} on={selected.includes(known)} onClick={() => toggle(known)} />
                    const c = toCustom(taxon)
                    return <SpeciesTile key={c.key} v={speciesView(c.key, { [c.key]: c })} on={selected.includes(c.key)} onClick={() => toggle(c.key, c)} />
                  })}
                </div>
              </>
            )}
            {onlineState === 'error' && <p className="muted small">{pick('인터넷 연결을 확인해 주세요.', 'Check your connection.')}</p>}
          </section>
        )}
        <p className="muted small credit">{pick('생물 사진: iNaturalist 관찰자들 (CC 라이선스). 사진을 길게 누르면 학명이 보여요.', 'Photos: iNaturalist observers (CC licensed).')}</p>
      </div>
    </div>
  )
}
