/**
 * Vercel 서버 기능: Google Drive 동기화 로그인을 "한 번만" 하게 해 줌
 * - 처음 로그인할 때 받은 갱신 키(refresh token)를 암호화해 이 기기의 쿠키에 보관
 *   (자바스크립트로 읽을 수 없는 HttpOnly 쿠키, 서버 어디에도 따로 저장하지 않음)
 * - 이후 앱을 열 때마다 이 키로 1시간짜리 출입증(access token)을 자동으로 새로 받음
 * 필요한 Vercel 환경 변수: GOOGLE_CLIENT_SECRET (Sensitive), VITE_GOOGLE_CLIENT_ID (이미 있음)
 *
 * POST   /api/google-auth  { code }  처음 로그인 (Google 로그인 창에서 받은 코드 교환)
 * GET    /api/google-auth            출입증 새로 받기
 * DELETE /api/google-auth            연결 해제
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const COOKIE = 'tl_grt'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

const clientId = () => process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || ''
const secret = () => process.env.GOOGLE_CLIENT_SECRET || ''
const key = () => createHash('sha256').update('travelog-refresh:' + secret()).digest()

export function seal(text) {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([c.update(text, 'utf8'), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url')
}
export function open(sealed) {
  try {
    const buf = Buffer.from(sealed, 'base64url')
    const d = createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12))
    d.setAuthTag(buf.subarray(12, 28))
    return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8')
  } catch {
    return null
  }
}

const readCookie = (req) =>
  (req.headers.cookie ?? '')
    .split(';')
    .map((s) => s.trim().split('='))
    .find(([k]) => k === COOKIE)?.[1]
const setCookie = (res, value, maxAge) =>
  res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/api/google-auth; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`)

async function google(params) {
  const r = await fetch(TOKEN_URL, { method: 'POST', body: new URLSearchParams({ client_id: clientId(), client_secret: secret(), ...params }) })
  return { ok: r.ok, json: await r.json().catch(() => ({})) }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (!secret() || !clientId()) return res.status(501).json({ error: 'not-configured' })

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {}
    if (!body.code) return res.status(400).json({ error: 'code 필요' })
    const { ok, json } = await google({ code: body.code, grant_type: 'authorization_code', redirect_uri: 'postmessage' })
    if (!ok || !json.access_token) return res.status(400).json({ error: json.error || 'exchange-failed' })
    // 갱신 키는 처음 동의할 때만 오므로, 없으면 이전 쿠키 유지
    if (json.refresh_token) setCookie(res, seal(json.refresh_token), 400 * 24 * 3600)
    return res.status(200).json({ access_token: json.access_token, expires_in: json.expires_in, refresh: !!json.refresh_token || !!readCookie(req) })
  }

  if (req.method === 'GET') {
    const sealed = readCookie(req)
    const rt = sealed && open(sealed)
    if (!rt) return res.status(401).json({ error: 'no-login' })
    const { ok, json } = await google({ refresh_token: rt, grant_type: 'refresh_token' })
    if (!ok || !json.access_token) {
      // 사용자가 Google 계정에서 권한을 취소했거나 키가 만료됨
      if (json.error === 'invalid_grant') setCookie(res, '', 0)
      return res.status(401).json({ error: json.error || 'refresh-failed' })
    }
    return res.status(200).json({ access_token: json.access_token, expires_in: json.expires_in })
  }

  if (req.method === 'DELETE') {
    const rt = readCookie(req) && open(readCookie(req))
    if (rt) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(rt)}`, { method: 'POST' }).catch(() => {})
    setCookie(res, '', 0)
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
