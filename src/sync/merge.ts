import { normalize, type AppData } from '../store'

type Rec = { id: string; createdAt?: number; updatedAt?: number }
const ts = (r: Rec) => r.updatedAt ?? r.createdAt ?? 0

/** 같은 id면 더 최근에 고친 쪽을, 삭제 기록이 더 최근이면 삭제 */
function mergeList<T extends Rec>(a: T[], b: T[], deleted: Record<string, number>, prefix: string): T[] {
  const map = new Map<string, T>()
  for (const r of [...a, ...b]) {
    const cur = map.get(r.id)
    if (!cur || ts(r) > ts(cur)) map.set(r.id, r)
  }
  return [...map.values()].filter((r) => !(deleted[prefix + r.id] >= ts(r)))
}

/**
 * 두 기기의 데이터를 합침. 순서와 상관없이 같은 결과가 나옴.
 * 기록 단위로 최신 수정이 이기고, 삭제는 삭제 이후에 고친 기록이 없을 때만 반영.
 */
export function mergeData(localRaw: AppData, remoteRaw: Partial<AppData>): AppData {
  const local = normalize(localRaw)
  const remote = normalize(remoteRaw)

  const deleted: Record<string, number> = { ...local.deleted }
  for (const [k, v] of Object.entries(remote.deleted)) deleted[k] = Math.max(deleted[k] ?? 0, v)

  const statuses: AppData['statuses'] = {}
  const statusTs: Record<string, number> = {}
  const codes = new Set([...Object.keys(local.statusTs), ...Object.keys(remote.statusTs), ...Object.keys(local.statuses), ...Object.keys(remote.statuses)])
  for (const code of codes) {
    const lt = local.statusTs[code] ?? 0
    const rt = remote.statusTs[code] ?? 0
    const lv = local.statuses[code]
    const rv = remote.statuses[code]
    // 더 최근에 바꾼 쪽이 이김 (해제한 경우 값이 없음 = 해제가 이김)
    // 같은 시각이면 '방문함' 우선 → 어느 기기에서 합쳐도 같은 결과
    let value: (typeof lv) | undefined
    if (rt > lt) value = rv
    else if (lt > rt) value = lv
    else value = lv === 'visited' || rv === 'visited' ? 'visited' : (lv ?? rv)
    const t = Math.max(lt, rt)
    statusTs[code] = t
    if (value && !(deleted['status:' + code] >= t && t > 0)) statuses[code] = value
  }

  const remoteNewerOffset = remote.diveOffsetTs > local.diveOffsetTs
  return {
    statuses,
    statusTs,
    deleted,
    trips: mergeList(local.trips, remote.trips, deleted, 'trip:'),
    dives: mergeList(local.dives, remote.dives, deleted, 'dive:'),
    customSpots: mergeList(local.customSpots, remote.customSpots, deleted, 'spot:'),
    diveOffset: remoteNewerOffset ? remote.diveOffset : local.diveOffset,
    diveOffsetTs: Math.max(local.diveOffsetTs, remote.diveOffsetTs),
  }
}

/** 데이터가 참조하는 모든 사진 id */
export const referencedPhotos = (d: AppData) => new Set([...d.trips, ...d.dives].flatMap((r) => r.photoIds))

/** 동기화가 필요한 변경인지 비교하기 위한 지문 */
export const fingerprint = (d: AppData) => JSON.stringify(d)
