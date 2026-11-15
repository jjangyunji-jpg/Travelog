import { useEffect, useMemo, useState } from 'react'
import type { DiveSpot } from '../data/diveSpots'
import { useI18n } from '../i18n'
import { allSpots, sortDivesDesc } from '../dive'
import { planDive } from '../divelog/plan'
import { prefetchSpot } from '../inat'
import { speciesView } from '../speciesInfo'
import type { AppData } from '../store'
import CountrySelect from './CountrySelect'
import { BRIEFING, BRIEF_TOTAL } from '../divelog/briefing'
import ProfileChart from './ProfileChart'
import Sheet from './Sheet'

export interface Plan {
  depth: number
  time: number
  gas: string
  turnBar?: number
  briefing?: string[]
}

export default function PlanSheet({ data, spotId: initialSpot, country: initialCountry, onStart, onClose }: {
  data: AppData
  spotId?: string
  country?: string
  onStart: (spot: DiveSpot | undefined, country: string, plan: Plan) => void
  onClose: () => void
}) {
  const { t, lang, pick, spotName } = useI18n()
  const spots = useMemo(() => allSpots(data), [data])
  const init = spots.find((s) => s.id === initialSpot)
  const [country, setCountry] = useState(init?.country ?? initialCountry ?? '')
  const [spotId, setSpotId] = useState(initialSpot ?? '')
  const last = sortDivesDesc(data.dives)[0]
  const [depth, setDepth] = useState(18)
  const [time, setTime] = useState(45)
  const [gas, setGas] = useState(last?.gas ?? 'air')
  const [offline, setOffline] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [step, setStep] = useState<1 | 2>(1)
  const [turnBar, setTurnBar] = useState(70)
  const [checked, setChecked] = useState<string[]>([])
  const toggleCheck = (k: string) => setChecked((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))
  const spot = spots.find((s) => s.id === spotId)
  const countrySpots = spots.filter((s) => s.country === country).sort((a, b) => spotName(a).localeCompare(spotName(b)))

  const plan = planDive(depth, time, gas)
  const past = data.dives.filter((d) => d.spotId === spotId && d.profile?.length)

  // 다이빙 전, 인터넷이 될 때 스팟 근처 생물을 미리 저장
  useEffect(() => {
    if (!spot || !isFinite(spot.lat) || !navigator.onLine) return
    setOffline('saving')
    prefetchSpot(spot.lat, spot.lon, lang)
      .then(() => setOffline('saved'))
      .catch(() => setOffline('error'))
  }, [spot, lang])

  const fmt = (m: number) => (m < 1 ? `${Math.round(m * 60)}${pick('초', 's')}` : `${Math.round(m * 10) / 10}${pick('분', 'min')}`)

  return (
    <Sheet onClose={onClose} title={<>📋 {pick('다이빙 계획', 'Dive plan')}</>}>
      <div className="steps three">
        <button type="button" className={step === 1 ? 'on' : ''} onClick={() => setStep(1)}>① {pick('계획', 'Plan')}</button>
        <button type="button" className={step === 2 ? 'on' : ''} onClick={() => setStep(2)} disabled={!country || plan.tooShort}>
          ② {pick('브리핑', 'Briefing')} <small>{checked.length}/{BRIEF_TOTAL}</small>
        </button>
        <span className="later">③ {pick('디브리프', 'Debrief')}<small>{pick('다이빙 후', 'after dive')}</small></span>
      </div>
      {step === 1 && (
      <div className="trip-form">
        <label>
          <span>{t.country}</span>
          <CountrySelect value={country} onChange={(c) => { setCountry(c); setSpotId('') }} />
        </label>
        {country && (
          <label>
            <span>{t.spot}</span>
            <select value={spotId} onChange={(e) => setSpotId(e.target.value)}>
              <option value="">{t.selectSpot}</option>
              {countrySpots.map((s) => <option key={s.id} value={s.id}>{s.custom ? '⭐ ' : ''}{spotName(s)}</option>)}
            </select>
          </label>
        )}

        <div className="plan-inputs">
          <label>
            <span>{pick('계획 수심', 'Planned depth')} <b>{depth}m</b></span>
            <input type="range" min={5} max={40} step={1} value={depth} onChange={(e) => setDepth(+e.target.value)} />
          </label>
          <label>
            <span>{pick('총 다이빙 시간', 'Total dive time')} <b>{time}{pick('분', 'min')}</b></span>
            <input type="range" min={15} max={90} step={1} value={time} onChange={(e) => setTime(+e.target.value)} />
          </label>
          <div className="seg">
            {['air', 'ean32', 'ean36'].map((g) => (
              <button type="button" key={g} className={gas === g ? 'on' : ''} onClick={() => setGas(g)}>
                {g === 'air' ? 'Air' : `${t.nitrox} ${g.slice(3)}%`}
              </button>
            ))}
          </div>
        </div>

        <ProfileChart
          title={pick('예상 수심 그래프', 'Planned profile')}
          series={[...past.slice(0, 5).map((d) => ({ points: d.profile!, kind: 'past' as const })), { points: plan.points, kind: 'plan' as const }]}
        />

        <div className="plan-facts">
          <div><span>{pick('하강', 'Descent')}</span><b>{fmt(plan.descentMin)}</b></div>
          <div><span>{pick('바닥 시간', 'Bottom time')}</span><b>{fmt(plan.bottomMin)}</b></div>
          <div><span>{pick('안전정지', 'Safety stop')}</span><b>5m · 3{pick('분', 'min')}</b></div>
          <div className={plan.overNdl ? 'warn' : 'ok'}>
            <span>{pick('무감압 한계 (참고)', 'NDL (reference)')}</span>
            <b>{plan.ndl != null ? `${plan.ndl}${pick('분', 'min')}` : '—'} {plan.overNdl ? '⚠️' : '✓'}</b>
          </div>
          {plan.mod != null && (
            <div className={plan.overMod ? 'warn' : 'ok'}>
              <span>{pick('최대 운용 수심 (PO₂ 1.4)', 'MOD (PO₂ 1.4)')}</span>
              <b>{plan.mod}m {plan.overMod ? '⚠️' : '✓'}</b>
            </div>
          )}
        </div>
        {plan.tooShort && <p className="import-error small">{pick('시간이 너무 짧아요. 하강·상승·안전정지 시간을 고려해 늘려 주세요.', 'Too short for descent, ascent and safety stop.')}</p>}
        {plan.overNdl && <p className="import-error small">{pick('계획한 수심과 시간이 무감압 한계를 넘을 수 있어요. 수심을 낮추거나 시간을 줄여 보세요.', 'This plan may exceed the no-decompression limit.')}</p>}
        {plan.overMod && <p className="import-error small">{pick('이 기체로는 계획 수심이 너무 깊어요.', 'Too deep for this gas.')}</p>}
        <p className="muted small">
          {pick('⚠️ 참고용이에요. 실제 다이빙은 반드시 다이빙 컴퓨터와 교육받은 기준을 따르세요. 무감압 한계는 첫 다이빙 기준이며 반복 다이빙이면 더 짧아요.', '⚠️ For reference only. Always follow your dive computer and training. NDLs are for a first dive; repetitive dives are shorter.')}
        </p>

        {spot && spot.highlights.length > 0 && (
          <div>
            <span className="field-label">🐠 {pick('여기서 볼 수 있는 생물', 'Look out for')}</span>
            <div className="life-thumbs big">
              {spot.highlights.map((k) => {
                const v = speciesView(k)
                return (
                  <span key={k} className="hl">
                    {v.photo ? <img src={v.photo('square')} alt="" /> : <i>{v.emoji}</i>}
                    <small>{pick(v.ko, v.en)}</small>
                  </span>
                )
              })}
            </div>
          </div>
        )}
        {spot && (
          <p className="muted small">
            {offline === 'saving' && pick('📥 오프라인용으로 이 스팟 생물 목록 저장 중…', '📥 Saving species for offline…')}
            {offline === 'saved' && pick('✅ 이 스팟 생물 목록과 사진을 기기에 저장했어요. 배 위에서 인터넷이 없어도 볼 수 있어요.', '✅ Saved for offline use.')}
            {offline === 'error' && pick('오프라인 저장은 인터넷이 연결되면 다시 시도해요.', 'Offline save will retry when online.')}
          </p>
        )}

        <div className="form-actions sticky">
          <span className="spacer" />
          <button type="button" className="btn primary" disabled={!country || plan.tooShort} onClick={() => setStep(2)}>
            {pick('다음: 브리핑', 'Next: briefing')} ›
          </button>
        </div>
      </div>
      )}

      {step === 2 && (
        <div className="briefing">
          <div className="brief-summary">
            <b>{spot ? spotName(spot) : ''}</b>
            <span>⬇ {depth}m · ⏱ {time}{pick('분', 'min')} · {gas === 'air' ? 'Air' : `EAN${gas.slice(3)}`}</span>
            <label className="turn">
              {pick('상승 시작 압력', 'Start ascent at')}
              <input type="number" inputMode="numeric" value={turnBar} min={30} max={150} step={10} onChange={(e) => setTurnBar(+e.target.value)} />
              bar
            </label>
            <small className="muted">{pick('브리핑을 마치면 로그북에 "다이빙 예정"으로 저장돼요. 다이빙 후 눌러서 ③ 디브리프를 하세요. ', 'After briefing this is saved as an upcoming dive; tap it after the dive to debrief. ')}{pick('보통 70 bar에 상승을 시작해 50 bar 이상 남기고 출수해요.', 'Typically ascend at 70 bar and surface with 50+ bar.')}</small>
          </div>
          {BRIEFING.map((sec) => {
            const done = sec.items.filter((i) => checked.includes(sec.key + '.' + i.key)).length
            return (
              <section key={sec.key} className="brief-sec">
                <h4 className="sub">
                  {sec.icon} {pick(sec.ko, sec.en)} <span className={done === sec.items.length ? 'brief-count done' : 'brief-count'}>{done}/{sec.items.length}</span>
                </h4>
                <ul>
                  {sec.items.map((i) => {
                    const k = sec.key + '.' + i.key
                    return (
                      <li key={k}>
                        <label className={checked.includes(k) ? 'on' : ''}>
                          <input type="checkbox" checked={checked.includes(k)} onChange={() => toggleCheck(k)} />
                          <span>
                            {pick(i.ko, i.en)}
                            {k === 'plan.depth' && <b> — {depth}m · {time}{pick('분', 'min')}</b>}
                            {k === 'plan.turn' && <b> — {turnBar} bar</b>}
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
          <div className="form-actions sticky">
            <button type="button" className="btn ghost" onClick={() => setStep(1)}>‹ {pick('계획', 'Plan')}</button>
            <span className="spacer" />
            <button type="button" className="btn primary" onClick={() => onStart(spot, country, { depth, time, gas, turnBar, briefing: checked })}>
              {checked.length === BRIEF_TOTAL ? '✅ ' : ''}{pick('브리핑 완료 · 입수!', 'Briefed · dive!')}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
