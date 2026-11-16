import { useEffect, useMemo, useRef, useState } from 'react'
import { COUNTRY_BY_CODE } from './data/countries'
import { I18nContext, useI18n, type Lang } from './i18n'
import { exportBackup, importBackup, LIVED_TIERS, uid, useAppData, type Dive, type Trip } from './store'
import { computeStats, livedLevel, visitCounts, visitLevel } from './stats'
import { geocodeCities, geocodeFromTitle, splitCities } from './geo'
import { diveNumbers, sortDivesDesc, spotMap } from './dive'
import WorldMap, { type MapMarker, type MapMode } from './components/WorldMap'
import CountrySheet from './components/CountrySheet'
import TripForm from './components/TripForm'
import TripDetail from './components/TripDetail'
import DayForm, { fmtDay } from './components/DayForm'
import { dayNumber, diaryOn, isOngoing, tierFromDays, todayStr, tripLength } from './trip'
import StatsView from './components/StatsView'
import CountryListView from './components/CountryListView'
import JournalView from './components/JournalView'
import ShareSheet from './components/ShareSheet'
import TripCard from './components/TripCard'
import DiveForm from './components/DiveForm'
import { DiveCard, DiveCountrySheet, DiveDetail, DiveLogView, DiveStatsRow, SpotSheet } from './components/DiveViews'
import Sheet from './components/Sheet'
import ImportSheet from './components/ImportSheet'
import MapSearch from './components/MapSearch'
import AreaFinder, { type Area } from './components/AreaFinder'
import CountrySelect from './components/CountrySelect'
import PlanSheet, { type Plan } from './components/PlanSheet'
import { SPECIES } from './data/species'
import speciesPhotos from './data/speciesPhotos.json'
import { prefetchImages } from './inat'
import { useSync } from './sync/useSync'
import { mergeData } from './sync/merge'
import { getClientId, setClientId } from './sync/drive'

type Tab = 'map' | 'journal' | 'dive' | 'stats' | 'list'
type Modal =
  | { kind: 'country'; code: string }
  | { kind: 'form'; trip?: Trip; country?: string; back?: string }
  | { kind: 'trip'; trip: Trip; back?: string }
  | { kind: 'day'; tripId: string; date: string; back?: Modal }
  | { kind: 'diveCountry'; code: string }
  | { kind: 'spot'; id: string }
  | { kind: 'diveForm'; dive?: Dive; country?: string; spotId?: string; plan?: Plan; back?: Modal }
  | { kind: 'dive'; dive: Dive; back?: Modal }
  | { kind: 'share' }
  | { kind: 'import' }
  | { kind: 'area'; area?: Area; country?: string; forPlan?: boolean; back?: Modal }
  | { kind: 'plan'; spotId?: string; country?: string; back?: Modal }
  | { kind: 'settings' }
  | null

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('travelog:lang')
    if (saved === 'ko' || saved === 'en') return saved
  } catch {
    /* 무시 */
  }
  return navigator.language.startsWith('ko') ? 'ko' : 'en'
}

export default function App() {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const ctx = useMemo(
    () => ({
      lang,
      setLang: (l: Lang) => {
        setLangState(l)
        try {
          localStorage.setItem('travelog:lang', l)
        } catch {
          /* 무시 */
        }
      },
    }),
    [lang],
  )
  return (
    <I18nContext.Provider value={ctx}>
      <Main />
    </I18nContext.Provider>
  )
}

function Main() {
  const { t, lang, setLang } = useI18n()
  const { data, setData, setStatus, saveTrip, deleteTrip, saveDive, deleteDive, importDives, setDiveOffset, addSpecies, patchTrips, setHome, saveTripDay, addCustomSpots } = useAppData()
  const [tab, setTab] = useState<Tab>('map')
  const [mapMode, setMapMode] = useState<MapMode>('travel')
  const [showAllSpots, setShowAllSpots] = useState(true)
  const [focus, setFocus] = useState<{ code: string; n: number } | null>(null)
  const [modal, setModal] = useState<Modal>(null)
  const stats = computeStats(data)
  const sync = useSync(data, setData)
  const [clientId, setClientIdState] = useState(getClientId)
  const startSync = () => sync.connect().catch(() => {})
  const fileRef = useRef<HTMLInputElement>(null)

  const spots = useMemo(() => spotMap(data), [data])
  const numbers = useMemo(() => diveNumbers(data), [data])
  const diveCountries = useMemo(() => new Set(data.dives.map((d) => d.country)), [data.dives])
  const visits = useMemo(() => visitCounts(data), [data])
  const livedLevels = useMemo(() => Object.fromEntries(Object.entries(data.lived ?? {}).map(([c, tier]) => [c, livedLevel(tier)])), [data.lived])
  const levels = useMemo(() => Object.fromEntries(Object.entries(visits).map(([c, n]) => [c, visitLevel(n)])), [visits])
  const cityPins = useMemo<MapMarker[]>(
    () => data.trips.flatMap((t) => (t.places ?? []).map((p, i) => ({ id: `city:${t.id}:${i}`, lat: p.lat, lon: p.lon, kind: 'city' as const }))),
    [data.trips],
  )
  const cityCount = useMemo(() => new Set(data.trips.flatMap((t) => (t.places ?? []).map((p) => `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`))).size, [data.trips])

  // 도시 보기: 좌표 없는 도시 이름을 자동으로 좌표로 (인터넷 될 때, 기록마다 한 번)
  const geoTried = useRef(new Set<string>())
  const [, setGeoRound] = useState(0)
  const [geoBusy, setGeoBusy] = useState(false)
  // 인터넷이 다시 연결되면 위치 찾기 재시도
  const [geoRetry, setGeoRetry] = useState(0)
  useEffect(() => {
    const on = () => setGeoRetry((n) => n + 1)
    window.addEventListener('online', on)
    return () => window.removeEventListener('online', on)
  }, [])
  useEffect(() => {
    if (mapMode !== 'travel' || !navigator.onLine) return
    // 좌표가 없는 도시 이름이 하나라도 있는 기록
    const missing = (t: Trip) => splitCities(t.city).filter((n) => !(t.places ?? []).some((p) => p.name === n))
    // 도시 칸이 비어 있으면 제목에서 지명 찾기 (예: "오키나와 여행")
    const fromTitle = (t: Trip) => !t.city.trim() && !t.places?.length && !!t.title.trim()
    const todo = data.trips.filter((t) => (missing(t).length || fromTitle(t)) && !geoTried.current.has(t.id + t.city + t.title))
    if (!todo.length) return
    let alive = true
    setGeoBusy(true)
    ;(async () => {
      const patches: Record<string, Partial<Trip>> = {}
      for (const t of todo) {
        geoTried.current.add(t.id + t.city + t.title)
        if (fromTitle(t)) {
          const p = await geocodeFromTitle(t.title, t.country, lang)
          if (p) patches[t.id] = { places: [p], city: p.name }
          continue
        }
        const found = await geocodeCities(missing(t).join(','), t.country, lang)
        if (found.length) patches[t.id] = { places: [...(t.places ?? []), ...found] }
        // 인터넷 문제로 못 찾은 이름이 있으면 다음에 다시 시도
        if (found.failed) geoTried.current.delete(t.id + t.city + t.title)
      }
      if (alive && Object.keys(patches).length) patchTrips(patches)
      if (alive) setGeoRound((n) => n + 1)
      setGeoBusy(false)
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapMode, data.trips, geoRetry])

  // 지도에 점이 없는 여행 (도시를 못 찾았거나 비어 있음)
  const noCityTrips = geoBusy ? [] : data.trips.filter((tr) => !tr.places?.length && geoTried.current.has(tr.id + tr.city + tr.title))

  const markers = useMemo<MapMarker[]>(() => {
    // 여행 지도: 나라 색 위에 간 도시 점을 함께
    if (mapMode === 'travel') return cityPins
    const mine = new Set(data.dives.map((d) => d.spotId))
    return Object.values(spots)
      .filter((s) => isFinite(s.lat) && isFinite(s.lon) && (mine.has(s.id) || showAllSpots))
      .map((s) => ({ id: s.id, lat: s.lat, lon: s.lon, kind: mine.has(s.id) ? 'mine' : 'other' }))
  }, [mapMode, cityPins, spots, data.dives, showAllSpots])

  const goTab = (next: Tab) => {
    setFocus(null)
    setTab(next)
  }
  const zoomTo = (code: string) => setFocus((f) => ({ code, n: (f?.n ?? 0) + 1 }))

  const openCountry = (code: string) => {
    if (tab === 'map' && mapMode === 'dive') {
      zoomTo(code)
      setModal({ kind: 'diveCountry', code })
    } else setModal({ kind: 'country', code })
  }
  const openDiveCountry = (code: string) => {
    setTab('map')
    setMapMode('dive')
    zoomTo(code)
    setModal({ kind: 'diveCountry', code })
  }
  const openSpot = (id: string) => {
    if (id.startsWith('city:')) {
      const trip = data.trips.find((t) => t.id === id.split(':')[1])
      if (trip) setModal({ kind: 'trip', trip })
      return
    }
    const s = spots[id]
    if (s && isFinite(s.lat) && tab === 'map') setFocus((f) => ({ code: s.country, n: (f?.n ?? 0) + 1 }))
    setModal({ kind: 'spot', id })
  }

  const backTo = (code?: string) => setModal(code ? { kind: 'country', code } : null)
  const tripsOf = (code: string) =>
    data.trips.filter((tr) => tr.country === code).sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))

  const doExport = async () => {
    const blob = await exportBackup(data)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `travelog-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }
  const doImport = async (f: File | undefined) => {
    if (!f) return
    try {
      // 덮어쓰지 않고 합치기: 이 기기에 있던 기록도 유지, 같은 기록은 더 최근 것
      const imported = await importBackup(f)
      setData((cur) => mergeData(cur, imported))
      alert(t.restoreDone)
      setModal(null)
    } catch {
      alert(t.restoreFail)
    }
  }

  const recentDives = sortDivesDesc(data.dives).slice(0, 3)
  const ongoing = data.trips.find((x) => isOngoing(x) && diaryOn(x))
  const cNameOf = (code: string) => (lang === 'ko' ? COUNTRY_BY_CODE[code]?.nameKo : COUNTRY_BY_CODE[code]?.nameEn) ?? code

  // 생물 도감 사진을 모두 기기에 저장 (작은 사진 + 썸네일)
  const photoUrls = useMemo(
    () => Object.values(speciesPhotos as Record<string, { u: string }>).flatMap((p) => [p.u.replace('{s}', 'small'), p.u.replace('{s}', 'square')]),
    [],
  )
  const [photoProgress, setPhotoProgress] = useState<number | null>(null)
  const downloadPhotos = () => {
    setPhotoProgress(0)
    prefetchImages(photoUrls, setPhotoProgress)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">✈︎</span> Travelog
        </div>
        <div className="top-actions">
          {sync.enabled && (
            <button
              className={`sync-pill ${sync.state}`}
              onClick={() => (sync.state === 'syncing' ? null : startSync())}
              title={sync.state === 'needsLogin' ? t.syncLogin : sync.state === 'error' ? t.syncError : t.synced}
            >
              {sync.state === 'syncing' ? '🔄' : sync.state === 'idle' ? '☁️' : '⚠️'}
            </button>
          )}
          <button className="btn ghost small" onClick={() => setModal({ kind: 'share' })}>{t.share}</button>
          <button className="icon-btn" onClick={() => setModal({ kind: 'settings' })} aria-label={t.settings}>⚙︎</button>
        </div>
      </header>

      <main className="content">
        {tab === 'map' && (
          <div className="map-page">
            <div className="mode-switch" role="tablist">
              <button className={mapMode === 'travel' ? 'on' : ''} onClick={() => setMapMode('travel')}>🌍 {t.travel}</button>
              <button className={mapMode === 'dive' ? 'on dive' : ''} onClick={() => setMapMode('dive')}>🤿 {t.dive}</button>
            </div>
            {mapMode === 'travel' && ongoing && (
              <button className="now-banner" onClick={() => setModal({ kind: 'day', tripId: ongoing.id, date: todayStr() })}>
                <span>✈️</span>
                <span className="now-text">
                  <b>{ongoing.kind === 'stay' ? (lang === 'ko' ? '지금 지내는 중' : 'Living in') : lang === 'ko' ? '지금 여행 중' : 'On a trip'} · {ongoing.title || ongoing.city || cNameOf(ongoing.country)} · Day {dayNumber(ongoing, todayStr())}</b>
                  <small>{fmtDay(todayStr(), lang)} — {lang === 'ko' ? '오늘 일기 쓰기 ›' : "Write today's entry ›"}</small>
                </span>
              </button>
            )}
            {mapMode === 'travel' ? (
              <div className="summary">
                <div className="sum-item"><b>{stats.visited.length}</b><span>{t.visitedCountries}</span></div>
                <div className="sum-item"><b>{stats.percent}%</b><span>{t.ofWorld}</span></div>
                <div className="sum-item"><b>{stats.wish.length}</b><span>{t.wishCountries}</span></div>
              </div>
            ) : (
              <DiveStatsRow data={data} />
            )}
            <MapSearch
              statuses={data.statuses}
              onPick={(code) => {
                // 검색한 나라로 확대하고 바로 열기 (여행: 가 봤어요/가고 싶어요, 다이빙: 스팟 목록)
                zoomTo(code)
                setModal(mapMode === 'dive' ? { kind: 'diveCountry', code } : { kind: 'country', code })
              }}
            />
            <WorldMap
              statuses={data.statuses}
              mode={mapMode}
              levels={levels}
              home={data.home}
              lived={livedLevels}
              diveCountries={diveCountries}
              markers={markers}
              focus={focus}
              selected={modal && 'code' in modal && (modal.kind === 'country' || modal.kind === 'diveCountry') ? modal.code : undefined}
              onSelect={openCountry}
              onSelectSpot={openSpot}
            />
            {mapMode === 'travel' ? (
              <div className="legend">
                <span className="steps-legend" title={lang === 'ko' ? '방문 횟수' : 'Visits'}>
                  <i style={{ background: 'var(--visit-1)' }} /><i style={{ background: 'var(--visit-2)' }} /><i style={{ background: 'var(--visit-3)' }} /><i style={{ background: 'var(--visit-4)' }} />
                  <small className="muted">{lang === 'ko' ? '1 → 5회+' : '1 → 5+ visits'}</small>
                </span>
                <span>
                  <i className="dot city" />
                  {lang === 'ko' ? `간 도시 ${cityCount}곳` : `${cityCount} cities`}
                  {geoBusy && <small className="muted"> · {lang === 'ko' ? '위치 찾는 중…' : 'locating…'}</small>}
                </span>
                <span><i className="dot wish" />{t.wish}</span>
                {Object.values(data.statuses).includes('lived') && (
                  <span className="steps-legend" title={t.lived}>
                    <i style={{ background: 'var(--lived-1)' }} /><i style={{ background: 'var(--lived-2)' }} /><i style={{ background: 'var(--lived-3)' }} /><i style={{ background: 'var(--lived-4)' }} />
                    <small className="muted">{t.lived} {lang === 'ko' ? '1달 → 10년+' : '1 mo → 10 yr+'}</small>
                  </span>
                )}
                {data.home ? (
                  <span><i className="dot home" />{lang === 'ko' ? '출생 국가' : 'Home'}</span>
                ) : (
                  <button className="link-btn" onClick={() => setModal({ kind: 'settings' })}>🏠 {lang === 'ko' ? '출생 국가 설정' : 'Set home country'}</button>
                )}
                {noCityTrips.length > 0 && (
                  <button className="no-city" onClick={() => setModal({ kind: 'form', trip: noCityTrips[0] })}>
                    ⚠️ {lang === 'ko' ? `도시 정보 없는 여행 ${noCityTrips.length}개 — 눌러서 도시 추가` : `${noCityTrips.length} trips without a city — tap to add`}
                  </button>
                )}
              </div>
            ) : (
              <div className="legend">
                <span><i className="dot mine" />{t.mySpots}</span>
                <label className="toggle">
                  <input type="checkbox" checked={showAllSpots} onChange={(e) => setShowAllSpots(e.target.checked)} />
                  <i className="dot other" />{t.showAllSpots}
                </label>
                <span className="muted">{t.diveTapHint}</span>
              </div>
            )}
            {mapMode === 'travel' && data.trips.length > 0 && (
              <section className="recent">
                <div className="section-head">
                  <h3>{lang === 'ko' ? '최근 여행' : 'Recent trips'}</h3>
                  <button className="btn ghost small" onClick={() => goTab('journal')}>{t.seeAll}</button>
                </div>
                <div className="trip-list">
                  {[...data.trips]
                    .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
                    .slice(0, 3)
                    .map((trip) => <TripCard key={trip.id} trip={trip} onClick={() => setModal({ kind: 'trip', trip })} />)}
                </div>
              </section>
            )}
            {mapMode === 'dive' && (
              <section className="recent">
                <div className="section-head">
                  <h3>{t.recentDives}</h3>
                  {recentDives.length > 0 ? (
                    <button className="btn ghost small" onClick={() => goTab('dive')}>{t.seeAll}</button>
                  ) : (
                    <button className="btn primary small" onClick={() => setModal({ kind: 'diveForm' })}>＋ {t.addDive}</button>
                  )}
                </div>
                <div className="trip-list">
                  {recentDives.map((d) => (
                    <DiveCard key={d.id} dive={d} no={numbers[d.id]} spot={spots[d.spotId]} custom={data.customSpecies} onClick={() => setModal({ kind: 'dive', dive: d })} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
        {tab === 'journal' && (
          <JournalView trips={data.trips} onOpen={(trip) => setModal({ kind: 'trip', trip })} onAdd={() => setModal({ kind: 'form' })} />
        )}
        {tab === 'dive' && (
          <DiveLogView data={data} numbers={numbers} onOpen={(d) => setModal({ kind: 'dive', dive: d })} onAdd={() => setModal({ kind: 'diveForm' })} onImport={() => setModal({ kind: 'import' })} onPlan={() => setModal({ kind: 'plan' })} />
        )}
        {tab === 'stats' && <StatsView data={data} onSelect={openCountry} />}
        {tab === 'list' && <CountryListView statuses={data.statuses} onSelect={openCountry} onStatus={setStatus} />}
      </main>

      <nav className="tabbar">
        {(
          [
            ['map', '🗺️', t.map],
            ['journal', '📔', t.journal],
            ['dive', '🤿', t.logbook],
            ['stats', '📊', t.stats],
            ['list', '🌐', t.list],
          ] as [Tab, string, string][]
        ).map(([id, icon, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => goTab(id)}>
            <span className="tab-icon">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {modal?.kind === 'country' && (
        <CountrySheet
          code={modal.code}
          status={data.statuses[modal.code]}
          livedTier={data.lived?.[modal.code]}
          trips={tripsOf(modal.code)}
          visits={visits[modal.code]}
          isHome={data.home === modal.code}
          diveCount={data.dives.filter((d) => d.country === modal.code).length}
          spotCount={Object.values(spots).filter((s) => s.country === modal.code).length}
          onDive={() => openDiveCountry(modal.code)}
          onStatus={(s, tier) => setStatus(modal.code, s, tier)}
          onAddTrip={() => setModal({ kind: 'form', country: modal.code, back: modal.code })}
          onOpenTrip={(trip) => setModal({ kind: 'trip', trip, back: modal.code })}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'form' && (
        <TripForm
          initial={modal.trip}
          country={modal.country}
          onSave={(trip) => {
            saveTrip(trip)
            const tier = trip.kind === 'stay' ? tierFromDays(tripLength(trip)) : undefined
            const cur = data.statuses[trip.country] === 'lived' ? data.lived?.[trip.country] : undefined
            if (tier && (!cur || LIVED_TIERS.indexOf(tier) > LIVED_TIERS.indexOf(cur))) setStatus(trip.country, 'lived', tier)
            setModal({ kind: 'trip', trip, back: modal.back })
          }}
          onDelete={(id) => {
            deleteTrip(id)
            backTo(modal.back)
          }}
          onClose={() => (modal.trip ? setModal({ kind: 'trip', trip: modal.trip, back: modal.back }) : backTo(modal.back))}
        />
      )}
      {modal?.kind === 'trip' && (() => {
        // 하루 일기를 저장하면 바로 보이도록 최신 기록으로
        const live = data.trips.find((x) => x.id === modal.trip.id) ?? modal.trip
        return (
          <TripDetail
            trip={live}
            onEdit={() => setModal({ kind: 'form', trip: live, back: modal.back })}
            onDay={(date) => setModal({ kind: 'day', tripId: live.id, date, back: { kind: 'trip', trip: live, back: modal.back } })}
            onDiary={() => patchTrips({ [live.id]: { diary: true } })}
            onFindDive={() => {
              const pl = live.places![0]
              setModal({ kind: 'area', area: { name: pl.name, lat: pl.lat, lon: pl.lon, country: live.country }, country: live.country, back: { kind: 'trip', trip: live, back: modal.back } })
            }}
            onClose={() => backTo(modal.back)}
          />
        )
      })()}
      {modal?.kind === 'day' && data.trips.some((x) => x.id === modal.tripId) && (
        <DayForm
          trip={data.trips.find((x) => x.id === modal.tripId)!}
          date={modal.date}
          onSave={(day) => {
            saveTripDay(modal.tripId, day)
            setModal(modal.back ?? null)
          }}
          onClose={() => setModal(modal.back ?? null)}
        />
      )}

      {modal?.kind === 'diveCountry' && (
        <DiveCountrySheet
          code={modal.code}
          data={data}
          onOpenSpot={openSpot}
          onAddDive={() => setModal({ kind: 'diveForm', country: modal.code, back: modal })}
          onPlan={() => setModal({ kind: 'plan', country: modal.code, back: modal })}
          onFindArea={() => setModal({ kind: 'area', country: modal.code, back: modal })}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'spot' && spots[modal.id] && (
        <SpotSheet
          spot={spots[modal.id]}
          data={data}
          numbers={numbers}
          onOpenDive={(d) => setModal({ kind: 'dive', dive: d, back: modal })}
          onAddDive={() => setModal({ kind: 'diveForm', country: spots[modal.id].country, spotId: modal.id, back: modal })}
          onPlan={() => setModal({ kind: 'plan', spotId: modal.id, back: modal })}
          onBack={() => setModal({ kind: 'diveCountry', code: spots[modal.id].country })}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'diveForm' && (
        <DiveForm
          data={data}
          initial={modal.dive}
          country={modal.country}
          spotId={modal.spotId}
          plan={modal.plan}
          onAddSpecies={addSpecies}
          onSave={(dive, newSpot) => {
            saveDive(dive, newSpot)
            setModal({ kind: 'dive', dive, back: modal.back })
          }}
          onDelete={(id) => {
            deleteDive(id)
            setModal(modal.back?.kind === 'dive' ? null : (modal.back ?? null))
          }}
          onClose={() => setModal(modal.dive ? { kind: 'dive', dive: modal.dive, back: modal.back } : (modal.back ?? null))}
        />
      )}
      {modal?.kind === 'dive' && (
        <DiveDetail
          dive={data.dives.find((d) => d.id === modal.dive.id) ?? modal.dive}
          no={numbers[modal.dive.id]}
          custom={data.customSpecies}
          spot={spots[(data.dives.find((d) => d.id === modal.dive.id) ?? modal.dive).spotId]}
          onEdit={() => setModal({ kind: 'diveForm', dive: data.dives.find((d) => d.id === modal.dive.id) ?? modal.dive, back: modal.back })}
          onClose={() => setModal(modal.back ?? null)}
        />
      )}

      {modal?.kind === 'plan' && (
        <PlanSheet
          data={data}
          spotId={modal.spotId}
          country={modal.country}
          onFindArea={(country) => setModal({ kind: 'area', country: country || undefined, forPlan: true, back: modal })}
          onStart={(spot, country, plan) => {
            // 브리핑까지 마친 다이빙을 '예정'으로 저장 → 다이빙 후 디브리프
            const now = new Date()
            const dive: Dive = {
              id: uid(),
              country,
              spotId: spot?.id ?? '',
              date: now.toISOString().slice(0, 10),
              time: now.toTimeString().slice(0, 5),
              gas: plan.gas,
              suit: '',
              entry: '',
              current: '',
              buddy: '',
              shop: '',
              marineLife: [],
              mood: 0,
              conditions: [],
              note: '',
              photoIds: [],
              plan,
              createdAt: Date.now(),
            }
            saveDive(dive)
            setTab('dive')
            setModal(null)
          }}
          onClose={() => setModal(modal.back ?? null)}
        />
      )}
      {modal?.kind === 'area' && (
        <AreaFinder
          data={data}
          initial={modal.area}
          country={modal.country}
          onAdd={addCustomSpots}
          onPickSpot={
            modal.forPlan && modal.back?.kind === 'plan'
              ? (spotId) => setModal({ ...(modal.back as Extract<Modal, { kind: 'plan' }>), spotId })
              : undefined
          }
          onClose={() => setModal(modal.back ?? null)}
        />
      )}
      {modal?.kind === 'import' && (
        <ImportSheet
          data={data}
          onImport={(dives, spots) => {
            importDives(dives, spots)
            setModal(null)
            setTab('dive')
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'share' && <ShareSheet data={data} onClose={() => setModal(null)} />}
      {modal?.kind === 'settings' && (
        <Sheet onClose={() => setModal(null)} title={t.settings}>
          <div className="settings">
            <button className="btn ghost block" onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}>🌐 {t.language}</button>
            <div className="setting-row col">
              <span>
                🏠 {lang === 'ko' ? '출생 국가' : 'Home country'}
                <small className="muted">{lang === 'ko' ? '지도에 보라색으로 표시돼요' : 'Shown in purple on the map'}</small>
              </span>
              <CountrySelect value={data.home ?? ''} onChange={setHome} />
              {data.home && <button className="link-btn" onClick={() => setHome('')}>{lang === 'ko' ? '지우기' : 'Clear'}</button>}
            </div>
            <label className="setting-row">
              <span>
                🤿 {t.diveOffset}
                <small className="muted">{t.diveOffsetHint}</small>
              </span>
              <input type="number" inputMode="numeric" min={0} value={data.diveOffset || ''} placeholder="0" onChange={(e) => setDiveOffset(Number(e.target.value))} />
            </label>
            <div className="sync-box">
              <div className="sync-head">
                <b>☁️ {t.sync}</b>
                {sync.enabled && (
                  <span className={`sync-state ${sync.state}`}>
                    {sync.state === 'syncing' ? t.syncing : sync.state === 'idle' ? t.synced : sync.state === 'needsLogin' ? t.syncLogin : t.syncError}
                  </span>
                )}
              </div>
              <p className="muted small">{t.syncDesc}</p>
              <div className="origin-box">
                <small className="muted">
                  {lang === 'ko'
                    ? 'Google Cloud → 클라이언트 → "승인된 JavaScript 원본"에 아래 주소가 있어야 해요 (origin_mismatch 오류가 나면 이 주소를 추가)'
                    : 'This address must be in Google Cloud → Client → "Authorized JavaScript origins" (fixes origin_mismatch)'}
                </small>
                <div className="origin-row">
                  <code>{location.origin}</code>
                  <button
                    className="btn ghost small"
                    onClick={() =>
                      navigator.clipboard
                        ?.writeText(location.origin)
                        .then(() => alert(lang === 'ko' ? '주소를 복사했어요' : 'Copied'))
                        .catch(() => {})
                    }
                  >
                    {lang === 'ko' ? '복사' : 'Copy'}
                  </button>
                </div>
              </div>
              {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                <label className="client-id">
                  <span className="small">{t.clientId}</span>
                  <input
                    value={clientId}
                    placeholder="xxxx.apps.googleusercontent.com"
                    onChange={(e) => {
                      setClientIdState(e.target.value)
                      setClientId(e.target.value)
                    }}
                  />
                  <small className="muted">{t.clientIdHint}</small>
                </label>
              )}
              {sync.enabled ? (
                <>
                  <div className="row">
                    <button className="btn primary" onClick={startSync} disabled={sync.state === 'syncing'}>🔄 {t.syncNow}</button>
                    <button className="btn ghost" onClick={sync.disconnect}>{t.syncOff}</button>
                  </div>
                  <small className="muted">
                    {t.lastSync}: {sync.lastSync ? new Date(sync.lastSync).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US') : t.never}
                    {sync.state === 'error' && sync.error && ` · ${sync.error}`}
                  </small>
                </>
              ) : (
                <button className="btn primary" onClick={startSync} disabled={!clientId}>{t.syncConnect}</button>
              )}
              {!sync.enabled && sync.error && sync.error !== 'no-client-id' && <small className="muted">{t.syncError}: {sync.error}</small>}
            </div>
            <button className="btn ghost block" onClick={downloadPhotos} disabled={photoProgress != null && photoProgress < photoUrls.length}>
              📥 {photoProgress == null
                ? (lang === 'ko' ? `오프라인 준비: 생물 사진 ${SPECIES.length - 1}종 받아두기 (약 3MB)` : `Offline: save ${SPECIES.length - 1} species photos (~3MB)`)
                : photoProgress < photoUrls.length
                  ? `${lang === 'ko' ? '받는 중' : 'Saving'} ${photoProgress}/${photoUrls.length}`
                  : (lang === 'ko' ? '✅ 생물 사진 저장 완료 — 인터넷 없이도 보여요' : '✅ Photos saved for offline')}
            </button>
            <button className="btn ghost block" onClick={doExport}>⬇︎ {t.backup}</button>
            <button className="btn ghost block" onClick={() => fileRef.current?.click()}>⬆︎ {t.restore}</button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => doImport(e.target.files?.[0])} />
            <details className="credits">
              <summary>{lang === 'ko' ? '📷 생물 사진 출처 (iNaturalist)' : '📷 Species photo credits (iNaturalist)'}</summary>
              <ul>
                {SPECIES.filter((sp) => (speciesPhotos as Record<string, { a: string; l: string }>)[sp.key]).map((sp) => {
                  const ph = (speciesPhotos as Record<string, { a: string; l: string; t: number }>)[sp.key]
                  return (
                    <li key={sp.key}>
                      <b>{lang === 'ko' ? sp.ko : sp.en}</b> — {ph.a.replace(/^\(c\)\s*/, '')} <span className="muted">[{ph.l.toUpperCase()}]</span>
                    </li>
                  )
                })}
              </ul>
            </details>
            <p className="muted small">
              {lang === 'ko'
                ? '모든 기록과 사진은 이 기기(브라우저)에만 저장돼요. 기기를 바꾸기 전에 백업을 내보내 주세요.'
                : 'Your data and photos are stored only on this device. Export a backup before switching devices.'}
            </p>
          </div>
        </Sheet>
      )}
    </div>
  )
}
