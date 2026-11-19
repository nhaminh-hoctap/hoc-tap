/* Góc học tập: chạy như ứng dụng trên iPad
   - Trang và ứng dụng: lấy bản mới nhất từ mạng; mạng chậm (quá 4 giây) hoặc mất mạng thì dùng bản đã lưu
   - Thư viện Firebase: dùng bản đã lưu, cập nhật ngầm
   - Dữ liệu học (Firestore) không đi qua đây: luôn đi thẳng tới máy chủ */
const V = 'hoc-tap-v20';
const CORE = ['./', 'index.html', 'claude-shim.js?v=20', 'bank.js?v=20', 'thidua.js?v=20', 'tuvung.html', 'lop2.html', 'lop6.html', 'words.json', 'manifest.json', 'icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V)
    .then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => { }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function fromCache(req) {
  return caches.match(req).then(h => h || caches.match(req, { ignoreSearch: true }));
}
function networkFirst(req) {
  const net = fetch(req, { cache: 'no-cache' }).then(res => {
    if (res && res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(req, cp)); }
    return res;
  });
  const slow = new Promise(r => setTimeout(r, 4000)).then(() => fromCache(req)).then(h => h || net);
  return Promise.race([net.catch(() => fromCache(req).then(h => h || Promise.reject(new Error('offline')))), slow]);
}
function cacheFirst(req) {
  return caches.open(V).then(c => c.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
}

self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname === 'www.gstatic.com') { e.respondWith(cacheFirst(r)); return; }
  if (u.origin !== location.origin) return;
  e.respondWith(networkFirst(r));
});
