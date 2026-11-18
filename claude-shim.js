/* ============================================================
   Cầu nối cho trang web riêng (GitHub Pages + Firebase)
   Các ứng dụng được viết cho Claude dùng claude.use('db'), ('user'), ('downloads')…
   Tệp này cung cấp đúng các hàm đó nhưng lưu dữ liệu vào Firebase Firestore.
   Mọi dữ liệu nằm dưới families/<mã gia đình>/…  (mã gia đình KHÔNG lưu trong mã nguồn)
   ============================================================ */
(function () {
  'use strict';
  var CONFIG = {
    apiKey: 'AIzaSyCvuR3wRq6-8DXKW_-e4sJXf6AlM0WQ9Vs',
    authDomain: 'hoc-tap-c8925.firebaseapp.com',
    projectId: 'hoc-tap-c8925',
    storageBucket: 'hoc-tap-c8925.firebasestorage.app',
    messagingSenderId: '607696742885',
    appId: '1:607696742885:web:c713d6f8b2f2924a52e70c'
  };
  var FKEY = 'hoc_family_code';

  /* Nhận mã gia đình từ đường link dạng …/#ma=xxxxxxxx (chỉ cần mở một lần trên mỗi máy) */
  try {
    var m = /[#&]ma=([a-z0-9]{16,64})/i.exec(location.hash);
    if (m) { localStorage.setItem(FKEY, m[1].toLowerCase()); history.replaceState(null, '', location.pathname + location.search); }
  } catch (e) { }
  function family() { try { return localStorage.getItem(FKEY) || ''; } catch (e) { return ''; } }

  var ready = null;
  function start() {
    if (ready) return ready;
    ready = new Promise(function (resolve) {
      var fam = family();
      if (!fam || fam.length < 16 || !window.firebase) { resolve(null); return; }
      try {
        var app = firebase.apps.length ? firebase.app() : firebase.initializeApp(CONFIG);
        var fs = firebase.firestore();
        try { fs.enablePersistence({ synchronizeTabs: true }).catch(function () { }); } catch (e) { }
        firebase.auth().signInAnonymously().then(function () {
          var pre = 'families/' + fam + '/';
          /* onSnapshot luôn kèm includeMetadataChanges để biết khi nào dữ liệu đã được máy chủ xác nhận (fromCache=false) */
          function snapOpts(r) { return function (a, b, c) { if (typeof a === 'function') return r.onSnapshot({ includeMetadataChanges: true }, a, b); return r.onSnapshot(a, b, c); }; }
          function wq(q) { return { get: function (o) { return q.get(o); }, onSnapshot: snapOpts(q), where: function () { return wq(q.where.apply(q, arguments)); }, orderBy: function () { return wq(q.orderBy.apply(q, arguments)); }, limit: function (n) { return wq(q.limit(n)); } }; }
          function wd(r) { return { id: r.id, path: r.path, get: function (o) { return r.get(o); }, set: function (v, o) { return o ? r.set(v, o) : r.set(v); }, update: function (v) { return r.update(v); }, delete: function () { return r.delete(); }, onSnapshot: snapOpts(r), collection: function (c) { return wc(r.collection(c)); } }; }
          function wc(c) { var q = wq(c); q.id = c.id; q.doc = function (id) { return wd(id ? c.doc(id) : c.doc()); }; q.add = function (v) { return c.add(v); }; return q; }
          resolve({
            doc: function (p) { return wd(fs.doc(pre + p)); },
            collection: function (p) { return wc(fs.collection(pre + p)); }
          });
        }).catch(function (e) { console.error('Đăng nhập Firebase lỗi', e); window.__fbError = e && (e.code || e.message); resolve(null); });
      } catch (e) { console.error(e); window.__fbError = String(e); resolve(null); }
    });
    return ready;
  }

  var caps = {
    db: function () { return start(); },
    user: function () { return Promise.resolve({ id: function () { return Promise.resolve('gia-dinh'); }, name: function () { return Promise.resolve(''); } }); },
    downloads: function () {
      return Promise.resolve({
        save: function (o) {
          var blob = new Blob([o.data], { type: o.type || 'application/json' }), a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = o.filename || 'tep.json'; document.body.appendChild(a); a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000); return Promise.resolve(true);
        }
      });
    }
    /* tts, dictation, sample: không có trên web → ứng dụng tự dùng giọng đọc và micro của trình duyệt */
  };
  window.claude = { use: function (name) { var f = caps[name]; return f ? f() : Promise.resolve(null); } };
  window.WEB_FAMILY = { get: family, set: function (c) { try { localStorage.setItem(FKEY, c); } catch (e) { } }, KEY: FKEY };
})();
