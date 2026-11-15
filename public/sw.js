// 간단한 오프라인 캐시: 같은 출처의 앱 파일만, 네트워크 우선 → 실패 시 캐시
// (Google 로그인·Drive 요청은 절대 캐시하지 않음)
const CACHE = 'travelog-v3'
const PHOTO_CACHE = 'travelog-species-photos'
const PHOTO_HOSTS = ['inaturalist-open-data.s3.amazonaws.com', 'static.inaturalist.org']
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== PHOTO_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  ),
)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return
  // 생물 사진: 한 번 본 사진은 기기에 저장해서 오프라인(배 위)에서도 보이게
  if (PHOTO_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open(PHOTO_CACHE).then((c) =>
        c.match(e.request).then((hit) => hit || fetch(e.request).then((res) => (c.put(e.request, res.clone()), res))),
      ),
    )
    return
  }
  if (url.origin !== self.location.origin) return
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, copy))
        return res
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/'))),
  )
})
