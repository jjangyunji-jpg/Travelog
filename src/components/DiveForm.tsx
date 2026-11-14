import { useMemo, useRef, useState } from 'react'
import { COUNTRIES, COUNTRY_BY_CODE, flagEmoji } from '../data/countries'
import type { DiveSpot } from '../data/diveSpots'
import { CONDITIONS, MARINE, MARINE_BY_KEY, MOODS, SUITS } from '../data/marine'
import { useI18n } from '../i18n'
import { deletePhoto, savePhoto, uid, type AppData, type Dive } from '../store'
import { allSpots } from '../dive'
import Sheet from './Sheet'
import { Thumb } from './TripCard'
import WorldMap, { type MapMarker } from './WorldMap'

interface Props {
  data: AppData
  initial?: Dive
  country?: string
  spotId?: string
  onSave: (d: Dive, newSpot?: DiveSpot) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

const NEW = '__new__'

function NumField({ label, unit, value, onChange, step = 1 }: {
  label: string
  unit: string
  value?: number
  onChange: (v?: number) => void
  step?: number
}) {
  return (
    <label className="num-field">
      <span>{label}</span>
      <div className="num-input">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        />
        <em>{unit}</em>
      </div>
    </label>
  )
}

export default function DiveForm({ data, initial, country, spotId, onSave, onDelete, onClose }: Props) {
  const { t, cName, spotName, pick } = useI18n()
  const today = new Date().toISOString().slice(0, 10)
  const last = data.dives[data.dives.length - 1]
  const [dive, setDive] = useState<Dive>(
    initial ?? {
      id: uid(),
      country: country ?? '',
      spotId: spotId ?? '',
      date: today,
      time: '',
      gas: 'air',
      // 직전 다이빙의 장비 설정을 그대로 가져옴
      suit: last?.suit ?? '',
      weight: last?.weight,
      entry: '',
      current: '',
      buddy: '',
      shop: '',
      marineLife: [],
      mood: 0,
      conditions: [],
      note: '',
      photoIds: [],
      createdAt: Date.now(),
    },
  )
  const [newSpot, setNewSpot] = useState({ name: '', lat: '', lon: '' })
  const [picking, setPicking] = useState(false)
  const [custom, setCustom] = useState('')
  const [busy, setBusy] = useState(false)
  const added = useRef<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const up = (patch: Partial<Dive>) => setDive((x) => ({ ...x, ...patch }))

  const spots = useMemo(
    () => allSpots(data).filter((s) => s.country === dive.country).sort((a, b) => spotName(a).localeCompare(spotName(b))),
    [data, dive.country, spotName],
  )
  const countryOptions = useMemo(() => [...COUNTRIES].sort((a, b) => cName(a).localeCompare(cName(b))), [cName])

  const toggle = (list: string[], key: string) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key])

  const addCustom = () => {
    const v = custom.trim()
    if (v && !dive.marineLife.includes(v)) up({ marineLife: [...dive.marineLife, v] })
    setCustom('')
  }

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    const ids: string[] = []
    for (const f of Array.from(files)) ids.push(await savePhoto(f))
    added.current.push(...ids)
    setDive((x) => ({ ...x, photoIds: [...x.photoIds, ...ids] }))
    setBusy(false)
  }
  const removePhoto = (id: string) => {
    if (added.current.includes(id)) deletePhoto(id)
    up({ photoIds: dive.photoIds.filter((p) => p !== id) })
  }

  const useGps = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => setNewSpot((s) => ({ ...s, lat: p.coords.latitude.toFixed(4), lon: p.coords.longitude.toFixed(4) })),
      () => alert(pick('위치를 가져올 수 없어요.', 'Could not get your location.')),
    )

  const cancel = () => {
    added.current.forEach(deletePhoto)
    onClose()
  }

  const isNew = dive.spotId === NEW
  const canSave = !!dive.country && !!dive.spotId && (!isNew || !!newSpot.name.trim()) && !busy

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    let spot: DiveSpot | undefined
    let final = dive
    if (isNew) {
      const lat = parseFloat(newSpot.lat)
      const lon = parseFloat(newSpot.lon)
      spot = {
        id: 'my-' + uid(),
        country: dive.country,
        nameEn: newSpot.name.trim(),
        nameKo: newSpot.name.trim(),
        lat: isFinite(lat) ? lat : NaN,
        lon: isFinite(lon) ? lon : NaN,
        highlights: [],
        custom: true,
      }
      final = { ...dive, spotId: spot.id }
    }
    initial?.photoIds.filter((p) => !final.photoIds.includes(p)).forEach(deletePhoto)
    onSave(final, spot)
  }

  const used = dive.startBar != null && dive.endBar != null ? dive.startBar - dive.endBar : undefined
  const pickMarkers: MapMarker[] =
    newSpot.lat && newSpot.lon ? [{ id: 'pick', lat: +newSpot.lat, lon: +newSpot.lon, kind: 'pick' }] : []

  return (
    <Sheet onClose={cancel} title={initial ? t.editDive : `🤿 ${t.addDive}`}>
      <form className="trip-form dive-form" onSubmit={submit}>
        {/* 스팟 */}
        <div className="row">
          <label>
            <span>{t.country}</span>
            <select value={dive.country} onChange={(e) => up({ country: e.target.value, spotId: '' })} required>
              <option value="">{t.selectCountry}</option>
              {countryOptions.map((c) => (
                <option key={c.code} value={c.code}>{flagEmoji(c.code)} {cName(c)}</option>
              ))}
            </select>
          </label>
        </div>
        {dive.country && (
          <label>
            <span>{t.spot}</span>
            <select value={dive.spotId} onChange={(e) => up({ spotId: e.target.value })} required>
              <option value="">{t.selectSpot}</option>
              {spots.map((s) => <option key={s.id} value={s.id}>{s.custom ? '⭐ ' : ''}{spotName(s)}</option>)}
              <option value={NEW}>{t.newSpot}</option>
            </select>
          </label>
        )}
        {isNew && (
          <div className="new-spot">
            <label>
              <span>{t.spotName}</span>
              <input value={newSpot.name} onChange={(e) => setNewSpot({ ...newSpot, name: e.target.value })} placeholder={t.spotNamePh} required />
            </label>
            <span className="field-label">{t.location}</span>
            <div className="row">
              <button type="button" className="btn ghost small" onClick={() => setPicking(true)}>{t.pickOnMap}</button>
              <button type="button" className="btn ghost small" onClick={useGps}>{t.useGps}</button>
            </div>
            <div className="row">
              <input placeholder={t.lat} inputMode="decimal" value={newSpot.lat} onChange={(e) => setNewSpot({ ...newSpot, lat: e.target.value })} />
              <input placeholder={t.lon} inputMode="decimal" value={newSpot.lon} onChange={(e) => setNewSpot({ ...newSpot, lon: e.target.value })} />
            </div>
          </div>
        )}
        <div className="row">
          <label>
            <span>{t.date}</span>
            <input type="date" value={dive.date} onChange={(e) => up({ date: e.target.value })} required />
          </label>
          <label>
            <span>{t.time}</span>
            <input type="time" value={dive.time} onChange={(e) => up({ time: e.target.value })} />
          </label>
        </div>

        {/* 수치 */}
        <h4 className="form-section">📏 {t.numbers}</h4>
        <div className="num-grid">
          <NumField label={t.maxDepth} unit="m" step={0.1} value={dive.maxDepth} onChange={(v) => up({ maxDepth: v })} />
          <NumField label={t.avgDepth} unit="m" step={0.1} value={dive.avgDepth} onChange={(v) => up({ avgDepth: v })} />
          <NumField label={t.bottomTime} unit={pick('분', 'min')} value={dive.bottomTime} onChange={(v) => up({ bottomTime: v })} />
          <NumField label={t.waterTemp} unit="°C" step={0.5} value={dive.waterTemp} onChange={(v) => up({ waterTemp: v })} />
          <NumField label={t.visibility} unit="m" value={dive.visibility} onChange={(v) => up({ visibility: v })} />
          <NumField label={t.weight} unit="kg" step={0.5} value={dive.weight} onChange={(v) => up({ weight: v })} />
          <NumField label={t.startBar} unit="bar" step={10} value={dive.startBar} onChange={(v) => up({ startBar: v })} />
          <NumField label={t.endBar} unit="bar" step={10} value={dive.endBar} onChange={(v) => up({ endBar: v })} />
        </div>
        {used != null && <div className="muted small">{t.airUsed}: {used} bar</div>}

        {/* 장비·환경 */}
        <h4 className="form-section">🧰 {t.gear}</h4>
        <div className="row">
          <label>
            <span>{t.suit}</span>
            <select value={dive.suit} onChange={(e) => up({ suit: e.target.value })}>
              <option value="">—</option>
              {SUITS.map(([k, ko, en]) => <option key={k} value={k}>{pick(ko, en)}</option>)}
            </select>
          </label>
          <label>
            <span>{t.gas}</span>
            <select value={dive.gas} onChange={(e) => up({ gas: e.target.value })}>
              <option value="air">Air</option>
              <option value="ean32">{t.nitrox} 32%</option>
              <option value="ean36">{t.nitrox} 36%</option>
            </select>
          </label>
        </div>
        <span className="field-label">{t.entry}</span>
        <div className="seg">
          {(['boat', 'shore'] as const).map((k) => (
            <button type="button" key={k} className={dive.entry === k ? 'on' : ''} onClick={() => up({ entry: dive.entry === k ? '' : k })}>
              {k === 'boat' ? '🚤 ' + t.boat : '🏖️ ' + t.shore}
            </button>
          ))}
        </div>
        <span className="field-label">{t.current}</span>
        <div className="seg">
          {(['none', 'weak', 'medium', 'strong'] as const).map((k) => (
            <button type="button" key={k} className={dive.current === k ? 'on' : ''} onClick={() => up({ current: dive.current === k ? '' : k })}>
              {{ none: t.curNone, weak: t.curWeak, medium: t.curMedium, strong: t.curStrong }[k]}
            </button>
          ))}
        </div>

        {/* 생물 */}
        <h4 className="form-section">🐠 {t.marineLife}</h4>
        <div className="chips">
          {MARINE.map(([k, emoji, ko, en]) => (
            <button type="button" key={k} className={dive.marineLife.includes(k) ? 'chip sel' : 'chip'} onClick={() => up({ marineLife: toggle(dive.marineLife, k) })}>
              {emoji} {pick(ko, en)}
            </button>
          ))}
          {dive.marineLife.filter((k) => !MARINE_BY_KEY[k]).map((k) => (
            <button type="button" key={k} className="chip sel" onClick={() => up({ marineLife: toggle(dive.marineLife, k) })}>
              🐟 {k} ✕
            </button>
          ))}
        </div>
        <input
          className="custom-input"
          value={custom}
          placeholder={`＋ ${t.addCustom}`}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustom()
            }
          }}
          onBlur={addCustom}
        />

        {/* 감정·상태 */}
        <h4 className="form-section">💭 {t.mood}</h4>
        <div className="moods">
          {MOODS.map(([v, emoji, ko, en]) => (
            <button type="button" key={v} className={dive.mood === v ? 'mood on' : 'mood'} onClick={() => up({ mood: dive.mood === v ? 0 : v })}>
              <span>{emoji}</span>
              <small>{pick(ko, en)}</small>
            </button>
          ))}
        </div>
        <span className="field-label">{t.condition}</span>
        <div className="chips">
          {CONDITIONS.map(([k, ko, en]) => (
            <button type="button" key={k} className={dive.conditions.includes(k) ? 'chip sel' : 'chip'} onClick={() => up({ conditions: toggle(dive.conditions, k) })}>
              {pick(ko, en)}
            </button>
          ))}
        </div>

        {/* 사람 */}
        <h4 className="form-section">👥 {t.people}</h4>
        <div className="row">
          <label>
            <span>{t.buddy}</span>
            <input value={dive.buddy} onChange={(e) => up({ buddy: e.target.value })} />
          </label>
          <label>
            <span>{t.shop}</span>
            <input value={dive.shop} onChange={(e) => up({ shop: e.target.value })} />
          </label>
        </div>

        <label>
          <span>{t.diveNote}</span>
          <textarea rows={5} value={dive.note} onChange={(e) => up({ note: e.target.value })} placeholder={t.diveNotePh} />
        </label>

        <div>
          <span className="field-label">{t.photos}</span>
          <div className="photo-grid">
            {dive.photoIds.map((p) => (
              <div key={p} className="photo-item">
                <Thumb id={p} />
                <button type="button" className="photo-remove" onClick={() => removePhoto(p)} aria-label="remove">✕</button>
              </div>
            ))}
            <button type="button" className="photo-add" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? '…' : '＋'}
              <small>{t.addPhoto}</small>
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
        </div>

        <div className="form-actions sticky">
          {initial && onDelete && (
            <button type="button" className="btn danger" onClick={() => confirm(t.confirmDelete) && onDelete(dive.id)}>{t.delete}</button>
          )}
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={cancel}>{t.cancel}</button>
          <button type="submit" className="btn primary" disabled={!canSave}>{t.save}</button>
        </div>
      </form>

      {picking && (
        <div className="picker-overlay">
          <div className="picker-head">
            <span>{t.pickHint}</span>
            <button type="button" className="btn primary small" onClick={() => setPicking(false)}>{t.confirm}</button>
          </div>
          <WorldMap
            statuses={data.statuses}
            mode="dive"
            markers={pickMarkers}
            focus={{ code: dive.country, n: 1 }}
            onPick={(lat, lon) => setNewSpot((s) => ({ ...s, lat: String(lat), lon: String(lon) }))}
          />
          <div className="muted small">
            {flagEmoji(dive.country)} {cName(COUNTRY_BY_CODE[dive.country])}
            {newSpot.lat && ` · ${newSpot.lat}, ${newSpot.lon}`}
          </div>
        </div>
      )}
    </Sheet>
  )
}
