/**
 * Google Drive 앱 전용 폴더(appDataFolder)를 저장소로 쓰는 동기화.
 * - 사용자 본인의 Drive에 숨김 폴더로 저장되어 다른 파일과 섞이지 않음
 * - 서버 없이 브라우저에서 직접 Google API 호출
 */

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'
const TOKEN_KEY = 'travelog:gtoken'
const CLIENT_KEY = 'travelog:gclient'

export const DATA_FILE = 'travelog-data.json'
export const photoFileName = (id: string) => `photo-${id}.jpg`

/* ---------------- Client ID ---------------- */
export function getClientId(): string {
  try {
    const saved = localStorage.getItem(CLIENT_KEY)
    if (saved) return saved
  } catch {
    /* 무시 */
  }
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''
}
export function setClientId(id: string) {
  try {
    if (id) localStorage.setItem(CLIENT_KEY, id.trim())
    else localStorage.removeItem(CLIENT_KEY)
  } catch {
    /* 무시 */
  }
}

/* ---------------- 토큰 ---------------- */
interface Token {
  token: string
  exp: number
}
function savedToken(): Token | null {
  try {
    const t = JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null') as Token | null
    if (t && t.exp > Date.now() + 60_000) return t
  } catch {
    /* 무시 */
  }
  return null
}
export const hasValidToken = () => !!savedToken()
export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* 무시 */
  }
}

/* ---------------- Google 로그인 (Google Identity Services) ---------------- */
interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}
interface TokenClient {
  callback: (r: TokenResponse) => void
  requestAccessToken: (o?: { prompt?: string }) => void
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string
            scope: string
            callback: (r: TokenResponse) => void
            error_callback?: (e: { type: string }) => void
          }) => TokenClient
          revoke?: (token: string, cb?: () => void) => void
        }
      }
    }
  }
}

let gisPromise: Promise<void> | null = null
export function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  gisPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      gisPromise = null
      reject(new Error('gis-load-failed'))
    }
    document.head.appendChild(s)
  })
  return gisPromise
}

/** 로그인 창을 띄워 토큰을 받음. 버튼 클릭 등 사용자 동작 안에서 호출해야 팝업이 막히지 않음 */
export async function signIn(interactive: boolean): Promise<string> {
  const existing = savedToken()
  if (existing) return existing.token
  const clientId = getClientId()
  if (!clientId) throw new Error('no-client-id')
  await loadGis()
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (r) => {
        if (!r.access_token) return reject(new Error(r.error || 'auth-failed'))
        const t: Token = { token: r.access_token, exp: Date.now() + (r.expires_in ?? 3600) * 1000 }
        try {
          localStorage.setItem(TOKEN_KEY, JSON.stringify(t))
        } catch {
          /* 무시 */
        }
        resolve(t.token)
      },
      error_callback: (e) => reject(new Error(e.type || 'auth-failed')),
    })
    client.requestAccessToken({ prompt: interactive ? '' : 'none' })
  })
}

export function signOut() {
  const t = savedToken()
  if (t) window.google?.accounts.oauth2.revoke?.(t.token)
  clearToken()
}

/* ---------------- Drive REST ---------------- */
export class AuthError extends Error {}

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const t = savedToken()
  if (!t) throw new AuthError('no-token')
  const res = await fetch(path, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${t.token}` } })
  if (res.status === 401) {
    clearToken()
    throw new AuthError('expired')
  }
  if (!res.ok) throw new Error(`drive ${res.status}`)
  return res
}

export interface RemoteFile {
  id: string
  name: string
}

export async function listFiles(): Promise<RemoteFile[]> {
  const out: RemoteFile[] = []
  let pageToken = ''
  do {
    const q = new URLSearchParams({ spaces: 'appDataFolder', fields: 'nextPageToken,files(id,name)', pageSize: '1000' })
    if (pageToken) q.set('pageToken', pageToken)
    const json = await (await call(`${API}/files?${q}`)).json()
    out.push(...json.files)
    pageToken = json.nextPageToken ?? ''
  } while (pageToken)
  return out
}

export async function download(id: string): Promise<Response> {
  return call(`${API}/files/${id}?alt=media`)
}

export async function upload(name: string, body: Blob, existingId?: string): Promise<string> {
  if (existingId) {
    await call(`${UPLOAD}/files/${existingId}?uploadType=media`, { method: 'PATCH', body })
    return existingId
  }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify({ name, parents: ['appDataFolder'] })], { type: 'application/json' }))
  form.append('file', body)
  const json = await (await call(`${UPLOAD}/files?uploadType=multipart&fields=id`, { method: 'POST', body: form })).json()
  return json.id
}

export async function remove(id: string) {
  await call(`${API}/files/${id}`, { method: 'DELETE' })
}
