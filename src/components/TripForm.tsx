import { useRef, useState } from 'react'
import { COUNTRY_BY_CODE, flagEmoji } from '../data/countries'
import { useI18n } from '../i18n'
import { deletePhoto, savePhoto, uid, type Trip } from '../store'
import Sheet from './Sheet'
import CountrySelect from './CountrySelect'
import PlacePicker from './PlacePicker'
import { splitCities } from '../geo'
import { Thumb } from './TripCard'

const addDays = (date: string, n: number) => {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** 자주 쓰는 여행 기간 [박, 한국어, 영어] */
const DURATIONS: [number, string, string][] = [
  [0, '당일', 'Day'],
  [1, '1박2일', '2 days'],
  [2, '2박3일', '3 days'],
  [3, '3박4일', '4 days'],
  [4, '4박5일', '5 days'],
  [6, '1주일', '1 week'],
  [13, '2주', '2 weeks'],
]

interface Props {
  initial?: Trip
  country?: string
  onSave: (t: Trip) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

export default function TripForm({ initial, country, onSave, onDelete, onClose }: Props) {
  const { t, cName, pick } = useI18n()
  const today = new Date().toISOString().slice(0, 10)
  const [trip, setTrip] = useState<Trip>(
    initial ?? {
      id: uid(),
      country: country ?? '',
      title: '',
      city: '',
      startDate: today,
      endDate: today,
      note: '',
      photoIds: [],
      createdAt: Date.now(),
    },
  )
  const [busy, setBusy] = useState(false)
  const added = useRef<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const up = (patch: Partial<Trip>) => setTrip((x) => ({ ...x, ...patch }))
  // 기간(박): 종료일 - 시작일
  const nights = trip.startDate && trip.endDate ? Math.max(0, Math.round((Date.parse(trip.endDate) - Date.parse(trip.startDate)) / 86400000)) : 0
  const setNights = (n: number) => trip.startDate && up({ endDate: addDays(trip.startDate, n) })

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    const ids: string[] = []
    for (const f of Array.from(files)) ids.push(await savePhoto(f))
    added.current.push(...ids)
    setTrip((x) => ({ ...x, photoIds: [...x.photoIds, ...ids] }))
    setBusy(false)
  }

  const removePhoto = (id: string) => {
    if (added.current.includes(id)) deletePhoto(id)
    up({ photoIds: trip.photoIds.filter((p) => p !== id) })
  }

  const cancel = () => {
    added.current.forEach(deletePhoto)
    onClose()
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!trip.country) return
    const removed = initial?.photoIds.filter((p) => !trip.photoIds.includes(p)) ?? []
    removed.forEach(deletePhoto)
    onSave({ ...trip, endDate: trip.endDate < trip.startDate ? trip.startDate : trip.endDate })
  }

  return (
    <Sheet onClose={cancel} title={initial ? t.editTrip : t.addTrip}>
      <form className="trip-form" onSubmit={submit}>
        <label>
          <span>{t.country}</span>
          <CountrySelect value={trip.country} onChange={(code) => up({ country: code })} />
        </label>
        <label>
          <span>{t.title}</span>
          <input value={trip.title} onChange={(e) => up({ title: e.target.value })} placeholder={t.titlePh} />
        </label>
        <label>
          <span>{t.city}</span>
          <PlacePicker
            country={trip.country}
            placeholder={t.cityPh}
            places={[
              ...(trip.places ?? []),
              // 예전 기록: 좌표 없이 이름만 있는 도시
              ...splitCities(trip.city)
                .filter((n) => !(trip.places ?? []).some((p) => p.name === n))
                .map((name) => ({ name })),
            ]}
            onChange={(list) => {
              const withCoords = list.filter((p): p is { name: string; lat: number; lon: number } => 'lat' in p && p.lat != null)
              up({ places: withCoords, city: list.map((p) => p.name).join(', ') })
            }}
          />
        </label>
        <div className="row">
          <label>
            <span>{t.start}</span>
            <input
              type="date"
              value={trip.startDate}
              onChange={(e) => {
                const start = e.target.value
                // 시작일을 옮기면 기간(N박)을 유지한 채 종료일도 같이 이동
                up({ startDate: start, endDate: start ? addDays(start, nights) : trip.endDate })
              }}
            />
          </label>
          <label>
            <span>{t.end}</span>
            <input type="date" value={trip.endDate} min={trip.startDate} onChange={(e) => up({ endDate: e.target.value })} />
          </label>
        </div>
        <div className="duration">
          <div className="dur-chips">
            {DURATIONS.map(([n, ko, en]) => (
              <button type="button" key={n} className={nights === n ? 'pill on' : 'pill'} onClick={() => setNights(n)}>
                {pick(ko, en)}
              </button>
            ))}
          </div>
          <div className="dur-step">
            <button type="button" aria-label="-1" onClick={() => setNights(Math.max(0, nights - 1))} disabled={nights <= 0}>－</button>
            <b>{nights === 0 ? pick('당일', 'Day trip') : pick(`${nights}박 ${nights + 1}일`, `${nights} night${nights > 1 ? 's' : ''}`)}</b>
            <button type="button" aria-label="+1" onClick={() => setNights(nights + 1)}>＋</button>
          </div>
        </div>
        <label>
          <span>{t.note}</span>
          <textarea rows={6} value={trip.note} onChange={(e) => up({ note: e.target.value })} placeholder={t.notePh} />
        </label>
        <div>
          <span className="field-label">{t.photos}</span>
          <div className="photo-grid">
            {trip.photoIds.map((p) => (
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
        <div className="form-actions">
          {initial && onDelete && (
            <button type="button" className="btn danger" onClick={() => confirm(t.confirmDelete) && onDelete(trip.id)}>
              {t.delete}
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={cancel}>{t.cancel}</button>
          <button type="submit" className="btn primary" disabled={busy || !trip.country}>{t.save}</button>
        </div>
        {trip.country && <div className="form-hint">{flagEmoji(trip.country)} {cName(COUNTRY_BY_CODE[trip.country])}</div>}
      </form>
    </Sheet>
  )
}
