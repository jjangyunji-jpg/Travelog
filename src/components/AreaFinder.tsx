import { useEffect, useMemo, useState } from 'react'
import { geoDistance } from 'd3-geo'
import { COUNTRY_BY_CODE, flagEmoji } from '../data/countries'
import type { DiveSpot } from '../data/diveSpots'
import { useI18n } from '../i18n'
import { allSpots } from '../dive'
import { searchPlaces, type PlaceResult } from '../geo'
import { findDiveSites, type OsmDiveSite } from '../osm'
import { countryAt } from '../divelog/match'
import { uid, type AppData } from '../store'
import Sheet from './Sheet'

export interface Area {
  name: string
  lat: number
  lon: number
  country?: string
}

const km = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => geoDistance([a.lon, a.lat], [b.lon, b.lat]) * 6371

/** 지역을 골라 주변 다이빙 포인트 찾기 → 내 스팟으로 추가 */
export default function AreaFinder({ data, initial, country, onAdd, onPickSpot, onClose }: {
  data: AppData
  initial?: Area
  country?: string
  onAdd: (spots: DiveSpot[]) => void
  /** 있으면 각 포인트에 "이 포인트로" 버튼 (예: 계획으로 돌아가기) */
  onPickSpot?: (spotId: string) => void
  onClose: () => void
}) {
  const { lang, pick, spotName, cName } = useI18n()
  const [area, setArea] = useState<Area | undefined>(initial)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [radius, setRadius] = useState(15)
  const [osm, setOsm] = useState<OsmDiveSite[] | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [cached, setCached] = useState(false)
  const [manual, setManual] = useState('')

  // 지역 검색
  useEffect(() => {
    if (!q.trim()) return setResults([])
    const t = setTimeout(() => searchPlaces(q, lang, country, 6).then(setResults).catch(() => setResults([])), 300)
    return () => clearTimeout(t)
  }, [q, lang, country])

  const search = async (a = area, r = radius) => {
    if (!a) return
    setState('loading')
    try {
      const res = await findDiveSites(a.lat, a.lon, r, lang)
      setOsm(res.sites)
      setCached(res.cached)
      setState('idle')
    } catch {
      setState('error')
    }
  }

  // 지역이 정해져 있으면 바로 찾기
  useEffect(() => {
    if (initial) search(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const spots = useMemo(() => allSpots(data), [data])
  const near = useMemo(
    () => (area ? spots.filter((s) => isFinite(s.lat) && km(area, s) <= radius).sort((a, b) => km(area, a) - km(area, b)) : []),
    [area, spots, radius],
  )
  const savedIds = new Set(spots.map((s) => s.id))
  const osmSites = (osm ?? []).filter((x) => x.kind === 'site' && !savedIds.has(x.id))
  const osmShops = (osm ?? []).filter((x) => x.kind === 'shop')

  const countryOf = (lat: number, lon: number) => countryAt(lat, lon) ?? area?.country ?? country ?? ''

  const addOsm = (x: OsmDiveSite) => {
    const spot: DiveSpot = { id: x.id, country: countryOf(x.lat, x.lon), nameEn: x.local ? `${x.name} (${x.local})` : x.name, nameKo: x.local ? `${x.name} (${x.local})` : x.name, lat: x.lat, lon: x.lon, highlights: [], custom: true }
    onAdd([spot])
    return spot.id
  }
  const addManual = (lat: number, lon: number) => {
    if (!manual.trim()) return
    const spot: DiveSpot = { id: 'my-' + uid(), country: countryOf(lat, lon), nameEn: manual.trim(), nameKo: manual.trim(), lat, lon, highlights: [], custom: true }
    onAdd([spot])
    setManual('')
  }
  const useGps = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => addManual(p.coords.latitude, p.coords.longitude),
      () => alert(pick('위치를 가져올 수 없어요.', 'Could not get your location.')),
    )

  const dist = (p: { lat: number; lon: number }) => (area ? `${km(area, p).toFixed(1)}km` : '')

  return (
    <Sheet onClose={onClose} title={<>🔍 {pick('다이빙 포인트 찾기', 'Find dive sites')}</>}>
      <div className="area-finder">
        {/* 1. 지역 */}
        <div className="area-pick">
          <span className="field-label">📍 {pick('가는 지역', 'Area')}</span>
          {area ? (
            <div className="area-chosen">
              <b>{area.name}</b>
              {area.country && COUNTRY_BY_CODE[area.country] && <span className="muted"> {flagEmoji(area.country)} {cName(COUNTRY_BY_CODE[area.country])}</span>}
              <button className="link-btn" onClick={() => { setArea(undefined); setOsm(null) }}>{pick('바꾸기', 'Change')}</button>
            </div>
          ) : (
            <div className="place-search">
              <input className="search" autoFocus value={q} placeholder={pick('예: 샤오류추, 모알보알, 서귀포', 'e.g. Moalboal, Tulamben')} onChange={(e) => setQ(e.target.value)} />
              {results.length > 0 && (
                <ul className="cs-list static">
                  {results.map((r, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => {
                          const a = { name: r.name, lat: r.lat, lon: r.lon, country: r.countryCode }
                          setArea(a)
                          setQ('')
                          setResults([])
                          search(a)
                        }}
                      >
                        <span>📍</span> {r.name}
                        <small className="muted">{[r.admin, r.country].filter(Boolean).join(', ')}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {area && (
          <>
            <div className="seg radius">
              {[5, 15, 30].map((r) => (
                <button key={r} type="button" className={radius === r ? 'on' : ''} onClick={() => { setRadius(r); search(area, r) }}>
                  {pick(`반경 ${r}km`, `${r} km`)}
                </button>
              ))}
            </div>

            {state === 'loading' && <p className="muted small">{pick('OpenStreetMap에서 다이빙 포인트 찾는 중…', 'Searching OpenStreetMap…')}</p>}
            {state === 'error' && (
              <p className="import-error small">
                {pick('포인트를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.', 'Could not load. Check your connection and retry.')}{' '}
                <button className="link-btn" onClick={() => search()}>{pick('다시 시도', 'Retry')}</button>
              </p>
            )}
            {cached && <p className="muted small">{pick('📥 오프라인: 예전에 찾아 둔 결과예요.', '📥 Offline: showing saved results.')}</p>}

            {/* 2. 내 스팟 + 추천 스팟 */}
            {near.length > 0 && (
              <section>
                <h4 className="sub">⭐ {pick('추천·내 스팟', 'Saved & recommended')} <span className="muted">{near.length}</span></h4>
                <ul className="area-list">
                  {near.map((s) => (
                    <li key={s.id}>
                      <span className={s.custom ? 'spot-pin mine' : 'spot-pin'} />
                      <div className="spot-info">
                        <div className="spot-name">{spotName(s)}</div>
                        <div className="muted small">{dist(s)}{s.custom ? ` · ${pick('내가 추가', 'Mine')}` : ''}</div>
                      </div>
                      {onPickSpot && <button className="btn primary small" onClick={() => onPickSpot(s.id)}>{pick('이 포인트로', 'Use')}</button>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 3. OpenStreetMap 포인트 */}
            {osm && (
              <section>
                <h4 className="sub">🗺️ {pick('주변 다이빙 포인트 (OpenStreetMap)', 'Nearby sites (OpenStreetMap)')} <span className="muted">{osmSites.length}</span></h4>
                {osmSites.length === 0 && <p className="muted small">{pick('이 지역에는 등록된 포인트가 없어요. 아래에서 직접 추가해 주세요.', 'No sites listed here. Add your own below.')}</p>}
                <ul className="area-list">
                  {osmSites.map((x) => (
                    <li key={x.id}>
                      <span className="spot-pin" />
                      <div className="spot-info">
                        <div className="spot-name">{x.name}</div>
                        <div className="muted small">{dist(x)}{x.depth ? ` · ⬇ ${x.depth}m` : ''}{x.local ? ` · ${x.local}` : ''}</div>
                      </div>
                      <button
                        className="btn ghost small"
                        onClick={() => {
                          const id = addOsm(x)
                          if (onPickSpot) onPickSpot(id)
                        }}
                      >
                        ＋ {onPickSpot ? pick('추가하고 선택', 'Add & use') : pick('추가', 'Add')}
                      </button>
                    </li>
                  ))}
                </ul>
                {osmShops.length > 0 && (
                  <details className="shops">
                    <summary>🏪 {pick(`주변 다이빙샵 ${osmShops.length}곳`, `${osmShops.length} dive shops nearby`)}</summary>
                    <ul className="area-list">
                      {osmShops.map((x) => (
                        <li key={x.id}>
                          <span>🏪</span>
                          <div className="spot-info">
                            <div className="spot-name">{x.name}</div>
                            <div className="muted small">{dist(x)}</div>
                          </div>
                          <a className="btn ghost small" href={`https://www.google.com/maps/search/?api=1&query=${x.lat},${x.lon}`} target="_blank" rel="noreferrer">{pick('지도', 'Map')}</a>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </section>
            )}

            {/* 4. 직접 추가 */}
            <section className="manual-add">
              <h4 className="sub">✍️ {pick('포인트 직접 추가', 'Add a site')}</h4>
              <input className="search" value={manual} placeholder={pick('포인트 이름 (예: 미인동굴)', 'Site name')} onChange={(e) => setManual(e.target.value)} />
              <div className="row">
                <button className="btn ghost small" disabled={!manual.trim()} onClick={() => addManual(area.lat, area.lon)}>📍 {pick(`${area.name} 위치로`, `At ${area.name}`)}</button>
                <button className="btn ghost small" disabled={!manual.trim()} onClick={useGps}>🛰️ {pick('현재 위치로', 'Current location')}</button>
              </div>
              <small className="muted">{pick('추가한 포인트는 다이빙 기록·계획에서 바로 고를 수 있어요. 정확한 위치는 기록 화면에서 지도로 고칠 수 있어요.', 'Saved sites appear in dive logs and plans.')}</small>
            </section>
            <p className="muted small credit">{pick('포인트·샵 정보: © OpenStreetMap 기여자', 'Data © OpenStreetMap contributors')}</p>
          </>
        )}
      </div>
    </Sheet>
  )
}
