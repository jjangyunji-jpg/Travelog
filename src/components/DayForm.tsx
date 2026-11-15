import { useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { deletePhoto, savePhoto, type Trip, type TripDay } from '../store'
import { dayNumber, dayOf } from '../trip'
import Sheet from './Sheet'
import { Thumb } from './TripCard'

export function fmtDay(date: string, lang: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'long', day: 'numeric', weekday: 'short' })
}

/** 하루 일기 쓰기 */
export default function DayForm({ trip, date, onSave, onClose }: {
  trip: Trip
  date: string
  onSave: (day: TripDay) => void
  onClose: () => void
}) {
  const { lang, t, pick } = useI18n()
  const initial = dayOf(trip, date)
  const [note, setNote] = useState(initial?.note ?? '')
  const [photos, setPhotos] = useState<string[]>(initial?.photoIds ?? [])
  const [busy, setBusy] = useState(false)
  const added = useRef<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const n = dayNumber(trip, date)

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    const ids: string[] = []
    for (const f of Array.from(files)) ids.push(await savePhoto(f))
    added.current.push(...ids)
    setPhotos((p) => [...p, ...ids])
    setBusy(false)
  }
  const removePhoto = (id: string) => {
    if (added.current.includes(id)) deletePhoto(id)
    setPhotos((p) => p.filter((x) => x !== id))
  }
  const cancel = () => {
    added.current.forEach(deletePhoto)
    onClose()
  }
  const save = () => {
    initial?.photoIds.filter((p) => !photos.includes(p)).forEach(deletePhoto)
    onSave({ date, note, photoIds: photos })
  }

  return (
    <Sheet onClose={cancel} title={<>📔 {n > 0 ? `Day ${n} · ` : ''}{fmtDay(date, lang)}</>}>
      <div className="trip-form">
        <textarea
          rows={8}
          autoFocus={!initial}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={pick('오늘 어디에 갔고, 무엇을 먹고, 어떤 기분이었나요?', 'Where did you go, what did you eat, how did you feel today?')}
        />
        <div>
          <span className="field-label">{t.photos}</span>
          <div className="photo-grid">
            {photos.map((p) => (
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
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={cancel}>{t.cancel}</button>
          <button type="button" className="btn primary" onClick={save} disabled={busy}>{t.save}</button>
        </div>
      </div>
    </Sheet>
  )
}
