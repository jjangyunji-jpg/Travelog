import { useMemo, useRef, useState } from 'react'
import { I18nContext, useI18n, type Lang } from './i18n'
import { exportBackup, importBackup, useAppData, type Trip } from './store'
import { computeStats } from './stats'
import WorldMap from './components/WorldMap'
import CountrySheet from './components/CountrySheet'
import TripForm from './components/TripForm'
import TripDetail from './components/TripDetail'
import StatsView from './components/StatsView'
import CountryListView from './components/CountryListView'
import JournalView from './components/JournalView'
import ShareSheet from './components/ShareSheet'
import TripCard from './components/TripCard'

type Tab = 'map' | 'journal' | 'stats' | 'list'
type Modal =
  | { kind: 'country'; code: string }
  | { kind: 'form'; trip?: Trip; country?: string; back?: string }
  | { kind: 'trip'; trip: Trip; back?: string }
  | { kind: 'share' }
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
  const setLang = (l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem('travelog:lang', l)
    } catch {
      /* 무시 */
    }
  }
  const ctx = useMemo(() => ({ lang, setLang }), [lang])
  return (
    <I18nContext.Provider value={ctx}>
      <Main />
    </I18nContext.Provider>
  )
}

function Main() {
  const { t, lang, setLang } = useI18n()
  const { data, setStatus, saveTrip, deleteTrip, replaceAll } = useAppData()
  const [tab, setTab] = useState<Tab>('map')
  const [modal, setModal] = useState<Modal>(null)
  const stats = computeStats(data)
  const fileRef = useRef<HTMLInputElement>(null)

  const openCountry = (code: string) => setModal({ kind: 'country', code })
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
      replaceAll(await importBackup(f))
      alert(t.restoreDone)
      setModal(null)
    } catch {
      alert(t.restoreFail)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">✈︎</span> Travelog
        </div>
        <div className="top-actions">
          <button className="btn ghost small" onClick={() => setModal({ kind: 'share' })}>{t.share}</button>
          <button className="icon-btn" onClick={() => setModal({ kind: 'settings' })} aria-label={t.settings}>⚙︎</button>
        </div>
      </header>

      <main className="content">
        {tab === 'map' && (
          <div className="map-page">
            <div className="summary">
              <div className="sum-item"><b>{stats.visited.length}</b><span>{t.visitedCountries}</span></div>
              <div className="sum-item"><b>{stats.percent}%</b><span>{t.ofWorld}</span></div>
              <div className="sum-item"><b>{stats.wish.length}</b><span>{t.wishCountries}</span></div>
            </div>
            <WorldMap statuses={data.statuses} selected={modal?.kind === 'country' ? modal.code : undefined} onSelect={openCountry} />
            <div className="legend">
              <span><i className="dot visited" />{t.visited}</span>
              <span><i className="dot wish" />{t.wish}</span>
              <span className="muted">{t.tapHint}</span>
            </div>
            {data.trips.length > 0 && (
              <section className="recent">
                <div className="section-head">
                  <h3>{lang === 'ko' ? '최근 여행' : 'Recent trips'}</h3>
                  <button className="btn ghost small" onClick={() => setTab('journal')}>{lang === 'ko' ? '전체 보기' : 'See all'}</button>
                </div>
                <div className="trip-list">
                  {[...data.trips]
                    .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
                    .slice(0, 3)
                    .map((trip) => <TripCard key={trip.id} trip={trip} onClick={() => setModal({ kind: 'trip', trip })} />)}
                </div>
              </section>
            )}
          </div>
        )}
        {tab === 'journal' && (
          <JournalView trips={data.trips} onOpen={(trip) => setModal({ kind: 'trip', trip })} onAdd={() => setModal({ kind: 'form' })} />
        )}
        {tab === 'stats' && <StatsView data={data} onSelect={openCountry} />}
        {tab === 'list' && <CountryListView statuses={data.statuses} onSelect={openCountry} onStatus={setStatus} />}
      </main>

      <nav className="tabbar">
        {(
          [
            ['map', '🗺️', t.map],
            ['journal', '📔', t.journal],
            ['stats', '📊', t.stats],
            ['list', '🌐', t.list],
          ] as [Tab, string, string][]
        ).map(([id, icon, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            <span className="tab-icon">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {modal?.kind === 'country' && (
        <CountrySheet
          code={modal.code}
          status={data.statuses[modal.code]}
          trips={tripsOf(modal.code)}
          onStatus={(s) => setStatus(modal.code, s)}
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
            setModal({ kind: 'trip', trip, back: modal.back })
          }}
          onDelete={(id) => {
            deleteTrip(id)
            backTo(modal.back)
          }}
          onClose={() => (modal.trip ? setModal({ kind: 'trip', trip: modal.trip, back: modal.back }) : backTo(modal.back))}
        />
      )}
      {modal?.kind === 'trip' && (
        <TripDetail
          trip={modal.trip}
          onEdit={() => setModal({ kind: 'form', trip: modal.trip, back: modal.back })}
          onClose={() => backTo(modal.back)}
        />
      )}
      {modal?.kind === 'share' && <ShareSheet data={data} onClose={() => setModal(null)} />}
      {modal?.kind === 'settings' && (
        <div className="sheet-backdrop" onClick={() => setModal(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-head">
              <div className="sheet-title">{t.settings}</div>
              <button className="icon-btn" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="sheet-body settings">
              <button className="btn ghost block" onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}>🌐 {t.language}</button>
              <button className="btn ghost block" onClick={doExport}>⬇︎ {t.backup}</button>
              <button className="btn ghost block" onClick={() => fileRef.current?.click()}>⬆︎ {t.restore}</button>
              <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => doImport(e.target.files?.[0])} />
              <p className="muted small">
                {lang === 'ko'
                  ? '모든 기록과 사진은 이 기기(브라우저)에만 저장돼요. 기기를 바꾸기 전에 백업을 내보내 주세요.'
                  : 'Your data and photos are stored only on this device. Export a backup before switching devices.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
