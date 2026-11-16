import { useCallback, useEffect, useRef, useState } from 'react'
import { getPhoto, putPhoto, type AppData } from '../store'
import { fingerprint, mergeData, referencedPhotos } from './merge'
import * as drive from './drive'

export type SyncState = 'off' | 'idle' | 'syncing' | 'error' | 'needsLogin'

const ENABLED_KEY = 'travelog:sync:on'
const LAST_KEY = 'travelog:sync:last'

const readFlag = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const writeFlag = (k: string, v: string | null) => {
  try {
    if (v == null) localStorage.removeItem(k)
    else localStorage.setItem(k, v)
  } catch {
    /* 무시 */
  }
}

/** 한 번의 동기화: 원격 데이터 받기 → 합치기 → 사진 주고받기 → 합친 데이터 올리기 */
async function syncOnce(local: AppData): Promise<AppData> {
  const files = await drive.listFiles()
  const byName = new Map(files.map((f) => [f.name, f.id]))

  const dataId = byName.get(drive.DATA_FILE)
  const remote = dataId ? await (await drive.download(dataId)).json() : {}
  const merged = mergeData(local, remote)
  const needed = referencedPhotos(merged)

  // 사진: 이 기기에만 있으면 올리고, Drive에만 있으면 받기
  for (const id of needed) {
    const name = drive.photoFileName(id)
    const remoteId = byName.get(name)
    const localBlob = await getPhoto(id)
    if (localBlob && !remoteId) await drive.upload(name, localBlob)
    else if (!localBlob && remoteId) await putPhoto(id, await (await drive.download(remoteId)).blob())
  }

  // 사진을 먼저 올린 뒤 데이터를 올림 (데이터만 있고 사진이 없는 상태를 피하기 위해)
  await drive.upload(drive.DATA_FILE, new Blob([JSON.stringify(merged)], { type: 'application/json' }), dataId)

  // 어디에서도 쓰지 않는 사진은 Drive에서 정리
  for (const f of files) {
    if (f.name.startsWith('photo-') && !needed.has(f.name.slice(6, -4))) await drive.remove(f.id).catch(() => {})
  }
  return merged
}

export function useSync(data: AppData, setData: (fn: (d: AppData) => AppData) => void) {
  const [enabled, setEnabled] = useState(() => readFlag(ENABLED_KEY) === '1')
  const [state, setState] = useState<SyncState>(enabled ? 'idle' : 'off')
  const [lastSync, setLastSync] = useState<number>(() => Number(readFlag(LAST_KEY)) || 0)
  const [error, setError] = useState('')
  const dataRef = useRef(data)
  dataRef.current = data
  const running = useRef(false)
  const again = useRef(false)
  const lastPushed = useRef('')

  const run = useCallback(async () => {
    if (!readFlag(ENABLED_KEY)) return
    if (running.current) {
      again.current = true
      return
    }
    running.current = true
    try {
      // 출입증이 만료됐으면 로그인 창 없이 자동으로 새로 받기 (안 되면 느낌표 → 버튼으로 로그인)
      if (!(await drive.silentToken())) {
        setState('needsLogin')
        return
      }
      setState('syncing')
      const before = dataRef.current
      const merged = await syncOnce(before)
      // 동기화하는 동안 이 기기에서 바뀐 내용도 잃지 않도록 한 번 더 합침
      setData((cur) => (cur === before ? merged : mergeData(cur, merged)))
      lastPushed.current = fingerprint(merged)
      const now = Date.now()
      setLastSync(now)
      writeFlag(LAST_KEY, String(now))
      setError('')
      setState('idle')
    } catch (e) {
      if (e instanceof drive.AuthError) setState('needsLogin')
      else {
        setError(String((e as Error).message ?? e))
        setState('error')
      }
    } finally {
      running.current = false
      if (again.current) {
        again.current = false
        setTimeout(run, 500)
      }
    }
  }, [setData])

  /** 버튼으로 연결·동기화 (로그인 창이 필요하면 이때 띄움) */
  const connect = useCallback(async () => {
    try {
      await drive.signIn(true)
      writeFlag(ENABLED_KEY, '1')
      setEnabled(true)
      await run()
    } catch (e) {
      const msg = String((e as Error).message ?? e)
      setError(msg)
      setState(msg === 'no-client-id' ? 'off' : 'error')
      throw e
    }
  }, [run])

  const disconnect = useCallback(() => {
    drive.signOut()
    writeFlag(ENABLED_KEY, null)
    setEnabled(false)
    setState('off')
  }, [])

  // 앱을 열 때, 다시 화면으로 돌아올 때 동기화
  useEffect(() => {
    if (!enabled) return
    run()
    const onVisible = () => document.visibilityState === 'visible' && run()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', run)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', run)
    }
  }, [enabled, run])

  // 이 기기에서 기록이 바뀌면 잠시 뒤 자동으로 올림
  useEffect(() => {
    if (!enabled || fingerprint(data) === lastPushed.current) return
    const t = setTimeout(run, 3000)
    return () => clearTimeout(t)
  }, [data, enabled, run])

  return { enabled, state, lastSync, error, connect, disconnect, syncNow: connect }
}

