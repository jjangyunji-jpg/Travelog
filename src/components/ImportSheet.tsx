import { useRef, useState } from 'react'
import { COUNTRY_BY_CODE, flagEmoji } from '../data/countries'
import type { DiveSpot } from '../data/diveSpots'
import { useI18n } from '../i18n'
import { allSpots } from '../dive'
import { parseDiveFile, type ImportedDive } from '../divelog/parse'
import { countryAt, findDuplicate, matchSpot } from '../divelog/match'
import { uid, type AppData, type Dive } from '../store'
import Sheet from './Sheet'
import CountrySelect from './CountrySelect'

interface Row {
  d: ImportedDive
  on: boolean
  dup: boolean
  country: string
  spot?: DiveSpot
}

export default function ImportSheet({ data, onImport, onClose }: {
  data: AppData
  onImport: (dives: Dive[], spots: DiveSpot[]) => void
  onClose: () => void
}) {
  const { pick, spotName, cName } = useI18n()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async (files: FileList | null) => {
    if (!files?.length) return
    setError('')
    try {
      const parsed: ImportedDive[] = []
      for (const f of Array.from(files)) parsed.push(...parseDiveFile(await f.text()))
      if (!parsed.length) throw new Error('empty')
      const spots = allSpots(data)
      parsed.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      setRows(
        parsed.map((d) => {
          const geoCountry = d.lat != null && d.lon != null ? countryAt(d.lat, d.lon) : undefined
          const spot = matchSpot(d, spots, geoCountry)
          const dup = !!findDuplicate(d, data.dives)
          return { d, on: !dup, dup, country: spot?.country ?? geoCountry ?? '', spot }
        }),
      )
    } catch (e) {
      const m = (e as Error).message
      setError(
        m === 'unknown-format'
          ? pick('지원하지 않는 파일 형식이에요. UDDF(.uddf) 또는 Subsurface(.xml/.ssrf) 파일을 선택해 주세요.', 'Unsupported file. Use UDDF or Subsurface XML.')
          : m === 'empty'
            ? pick('파일에서 다이빙 기록을 찾지 못했어요.', 'No dives found in the file.')
            : pick('파일을 읽을 수 없어요.', 'Could not read the file.'),
      )
    }
  }

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r!.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const chosen = rows?.filter((r) => r.on) ?? []
  const missingCountry = chosen.some((r) => !r.country)

  const doImport = () => {
    const newSpots: DiveSpot[] = []
    const dives: Dive[] = chosen.map((r) => {
      let spot = r.spot && r.spot.country === r.country ? r.spot : undefined
      if (!spot) {
        const name = r.d.siteName?.trim() || pick('이름 없는 스팟', 'Unnamed site')
        spot =
          newSpots.find((s) => s.country === r.country && s.nameEn === name) ??
          (() => {
            const s: DiveSpot = { id: 'my-' + uid(), country: r.country, nameEn: name, nameKo: name, lat: r.d.lat ?? NaN, lon: r.d.lon ?? NaN, highlights: [], custom: true }
            newSpots.push(s)
            return s
          })()
      }
      const d = r.d
      return {
        id: uid(),
        country: r.country,
        spotId: spot.id,
        date: d.date,
        time: d.time,
        maxDepth: d.maxDepth,
        avgDepth: d.avgDepth,
        bottomTime: d.bottomTime,
        waterTemp: d.waterTemp,
        startBar: d.startBar,
        endBar: d.endBar,
        weight: d.weight,
        gas: d.gas,
        suit: '',
        entry: '',
        current: '',
        buddy: d.buddy ?? '',
        shop: d.shop ?? '',
        marineLife: [],
        mood: 0,
        conditions: [],
        note: d.note ?? '',
        photoIds: [],
        profile: d.profile,
        computer: d.computer,
        createdAt: Date.now(),
      }
    })
    onImport(dives, newSpots)
  }

  return (
    <Sheet onClose={onClose} title={<>⌚ {pick('다이빙 컴퓨터 기록 불러오기', 'Import from dive computer')}</>}>
      {!rows && (
        <div className="import-intro">
          <p>{pick('다이빙 컴퓨터 앱에서 내보낸 파일을 선택하세요. 수심·시간·수온·압력·수심 그래프가 그대로 들어와요.', 'Choose a file exported from your dive computer app. Depth, time, temperature, pressure and the depth profile are imported.')}</p>
          <ul className="muted small">
            <li><b>UDDF</b> (.uddf) — {pick('여러 다이빙 앱의 공통 내보내기 형식', 'common export format of many dive apps')}</li>
            <li><b>Subsurface</b> (.xml / .ssrf) — {pick('무료 앱 Subsurface로 Shearwater·Suunto·Mares·Garmin 등 대부분의 컴퓨터 기록을 받을 수 있어요', 'free Subsurface app downloads from most computers')}</li>
          </ul>
          <button className="btn primary block" onClick={() => fileRef.current?.click()}>📂 {pick('파일 선택', 'Choose file')}</button>
          <input ref={fileRef} type="file" accept=".uddf,.xml,.ssrf,application/xml,text/xml" multiple hidden onChange={(e) => load(e.target.files)} />
          {error && <p className="import-error">{error}</p>}
        </div>
      )}
      {rows && (
        <>
          <p className="muted small">
            {pick(`${rows.length}개의 다이빙을 찾았어요.`, `Found ${rows.length} dives.`)}
            {rows.some((r) => r.dup) && ' ' + pick('이미 있는 기록은 체크를 해제해 뒀어요.', 'Existing dives are unchecked.')}
          </p>
          <ul className="import-list">
            {rows.map((r, i) => (
              <li key={i} className={r.on ? '' : 'off'}>
                <label className="import-row">
                  <input type="checkbox" checked={r.on} onChange={(e) => update(i, { on: e.target.checked })} />
                  <div className="import-main">
                    <div className="import-title">
                      {r.d.date} {r.d.time}
                      {r.dup && <span className="dup-badge">{pick('이미 있음', 'Exists')}</span>}
                    </div>
                    <div className="muted small">
                      {r.spot ? `📍 ${spotName(r.spot)}` : r.d.siteName ? `📍 ${r.d.siteName} (${pick('새 스팟', 'new')})` : `📍 ${pick('스팟 이름 없음', 'No site name')}`}
                    </div>
                    <div className="dive-metrics">
                      {r.d.maxDepth != null && <span>⬇ {r.d.maxDepth}m</span>}
                      {r.d.bottomTime != null && <span>⏱ {r.d.bottomTime}{pick('분', 'min')}</span>}
                      {r.d.waterTemp != null && <span>🌡 {r.d.waterTemp}°</span>}
                      {r.d.profile && <span>📈</span>}
                    </div>
                  </div>
                </label>
                {r.on && (
                  <div className="import-country">
                    <CountrySelect value={r.country} onChange={(c) => update(i, { country: c, spot: r.spot?.country === c ? r.spot : undefined })} />
                    {!r.country && <small className="import-error">{pick('나라를 골라 주세요', 'Choose a country')}</small>}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="form-actions sticky">
            <button className="btn ghost" onClick={() => setRows(null)}>{pick('다른 파일', 'Another file')}</button>
            <span className="spacer" />
            <button className="btn primary" disabled={!chosen.length || missingCountry} onClick={doImport}>
              {pick(`${chosen.length}개 불러오기`, `Import ${chosen.length}`)}
            </button>
          </div>
          {chosen.length > 0 && !missingCountry && (
            <p className="muted small">
              {[...new Set(chosen.map((r) => r.country))].map((c) => `${flagEmoji(c)} ${cName(COUNTRY_BY_CODE[c])}`).join(' · ')}
            </p>
          )}
        </>
      )}
    </Sheet>
  )
}
