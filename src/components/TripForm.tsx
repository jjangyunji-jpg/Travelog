import { useRef, useState } from 'react'
import { COUNTRIES, COUNTRY_BY_CODE, flagEmoji } from '../data/countries'
import { useI18n } from '../i18n'
import { deletePhoto, savePhoto, uid, type Trip } from '../store'
import Sheet from './Sheet'
import { Thumb } from './TripCard'

interface Props {
  initial?: Trip
  country?: string
  onSave: (t: Trip) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

export default function TripForm({ initial, country, onSave, onDelete, onClose }: Props) {
  const { t, cName } = useI18n()
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
          <select value={trip.country} onChange={(e) => up({ country: e.target.value })} required>
            <option value="">{t.selectCountry}</option>
            {[...COUNTRIES]
              .sort((a, b) => cName(a).localeCompare(cName(b)))
              .map((c) => (
                <option key={c.code} value={c.code}>
                  {flagEmoji(c.code)} {cName(c)}
                </option>
              ))}
          </select>
        </label>
        <label>
          <span>{t.title}</span>
          <input value={trip.title} onChange={(e) => up({ title: e.target.value })} placeholder={t.titlePh} />
        </label>
        <label>
          <span>{t.city}</span>
          <input value={trip.city} onChange={(e) => up({ city: e.target.value })} placeholder={t.cityPh} />
        </label>
        <div className="row">
          <label>
            <span>{t.start}</span>
            <input type="date" value={trip.startDate} onChange={(e) => up({ startDate: e.target.value })} />
          </label>
          <label>
            <span>{t.end}</span>
            <input type="date" value={trip.endDate} min={trip.startDate} onChange={(e) => up({ endDate: e.target.value })} />
          </label>
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
