/* Góc học tập: chạy như ứng dụng trên iPad
   - Trang và ứng dụng: lấy bản mới nhất từ mạng; mạng chậm (quá 4 giây) hoặc mất mạng thì dùng bản đã lưu
   - Thư viện Firebase: dùng bản đã lưu, cập nhật ngầm
   - Hình (img/): lưu riêng một lần, lần sau mở ngay không cần mạng (đổi hình thì đổi tên tệp)
   - Dữ liệu học (Firestore) không đi qua đây: luôn đi thẳng tới máy chủ */
const V = 'hoc-tap-v61';
const IMG = 'hoc-tap-hinh-v1';
const CORE = ['./', 'index.html', 'claude-shim.js?v=61', 'bank.js?v=61', 'thidua.js?v=61', 'tuvung.html', 'lop1.html', 'lop2.html', 'lop3.html', 'lop5.html', 'lop7.html', 'lop6.html', 'nuoithu.html', 'words.json', 'manifest.json', 'icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V)
    .then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => { }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== V && k !== IMG).map(k => caches.delete(k))))
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
function cacheFirst(req, name) {
  return caches.open(name || V).then(c => c.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
}

self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname === 'www.gstatic.com') { e.respondWith(cacheFirst(r)); return; }
  if (u.origin !== location.origin) return;
  if (/\/img\//.test(u.pathname)) { e.respondWith(cacheFirst(r, IMG)); return; }
  e.respondWith(networkFirst(r));
});
