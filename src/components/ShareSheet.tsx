import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import type { AppData } from '../store'
import { computeStats, visitCounts, visitLevel } from '../stats'
import Sheet from './Sheet'
import { COUNTRY_PATHS, MAP_H, MAP_W, projection } from './WorldMap'

const W = 1080
const H = 1350

async function renderImage(data: AppData, lang: string, title: string, ofWorld: string): Promise<Blob> {
  await document.fonts.ready
  const s = computeStats(data)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0f2a3f')
  bg.addColorStop(1, '#14435f')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const font = (w: number, size: number) => `${w} ${size}px Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.font = font(800, 64)
  ctx.fillText(title, 72, 150)
  ctx.fillStyle = '#9cc7e0'
  ctx.font = font(500, 34)
  ctx.fillText('Travelog', 72, 205)

  // 지도
  const scale = (W - 80) / MAP_W
  ctx.save()
  ctx.translate(40, 300)
  ctx.scale(scale, scale)
  const counts = visitCounts(data)
  const VISIT = ['#ffd27a', '#ffb547', '#ff8f2e', '#ff6b1a']
  ctx.lineWidth = 0.4
  ctx.strokeStyle = '#0f2a3f'
  for (const p of COUNTRY_PATHS) {
    const st = data.statuses[p.code]
    ctx.fillStyle = p.code === data.home ? '#b197fc' : st === 'visited' ? VISIT[visitLevel(counts[p.code] ?? 1) - 1] : st === 'wish' ? '#5fd3c4' : '#2d5f7d'
    const path = new Path2D(p.d)
    ctx.fill(path)
    ctx.stroke(path)
  }
  // 간 도시 점
  for (const t of data.trips)
    for (const pl of t.places ?? []) {
      const pt = projection([pl.lon, pl.lat])
      if (!pt) continue
      ctx.beginPath()
      ctx.arc(pt[0], pt[1], 3.2 / scale, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.lineWidth = 1.4 / scale
      ctx.strokeStyle = '#0f2a3f'
      ctx.stroke()
    }
  ctx.restore()

  // 숫자
  const y = 300 + MAP_H * scale + 140
  const items: [string, string][] = [
    [String(s.visited.length), lang === 'ko' ? '방문한 나라' : 'countries'],
    [`${s.percent}%`, ofWorld],
    [String(s.continentsVisited), lang === 'ko' ? '대륙' : 'continents'],
  ]
  items.forEach(([num, label], i) => {
    const x = 72 + i * 330
    ctx.fillStyle = '#ffb547'
    ctx.font = font(800, 96)
    ctx.fillText(num, x, y)
    ctx.fillStyle = '#cfe3ef'
    ctx.font = font(500, 34)
    ctx.fillText(label, x, y + 56)
  })

  // 범례
  const ly = H - 90
  const legend: [string, string][] = [
    ['#ffb547', lang === 'ko' ? '가 봤어요' : 'Been there'],
    ['#5fd3c4', lang === 'ko' ? '가고 싶어요' : 'Want to go'],
    ...(data.home ? [['#b197fc', lang === 'ko' ? '출생 국가' : 'Home'] as [string, string]] : []),
    ...(data.trips.some((t) => t.places?.length) ? [['#ffffff', lang === 'ko' ? '간 도시' : 'Cities'] as [string, string]] : []),
  ]
  let lx = 72
  ctx.font = font(500, 30)
  for (const [color, label] of legend) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(lx + 12, ly - 10, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#cfe3ef'
    ctx.fillText(label, lx + 36, ly)
    lx += 36 + ctx.measureText(label).width + 48
  }
  return new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'))
}

export default function ShareSheet({ data, onClose }: { data: AppData; onClose: () => void }) {
  const { t, lang } = useI18n()
  const [blob, setBlob] = useState<Blob>()
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    let u: string | undefined
    renderImage(data, lang, t.myMap, t.ofWorld).then((b) => {
      setBlob(b)
      u = URL.createObjectURL(b)
      setUrl(u)
    })
    return () => {
      if (u) URL.revokeObjectURL(u)
    }
  }, [data, lang, t])

  const file = blob && new File([blob], 'my-travel-map.png', { type: 'image/png' })
  const canShare = !!file && !!navigator.canShare?.({ files: [file] })

  const download = () => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = 'my-travel-map.png'
    a.click()
  }

  return (
    <Sheet onClose={onClose} title={t.shareMap}>
      <div className="share-preview">{url ? <img src={url} alt={t.myMap} /> : <div className="ph share-ph" />}</div>
      <div className="form-actions">
        <span className="spacer" />
        <button className="btn ghost" onClick={download} disabled={!url}>{t.download}</button>
        {canShare && (
          <button className="btn primary" onClick={() => navigator.share({ files: [file!], title: t.myMap }).catch(() => {})}>
            {t.share}
          </button>
        )}
      </div>
    </Sheet>
  )
}
