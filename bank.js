/* ============================================================
   KHO SAO THƯỞNG CHUNG (dùng cho cả 3 ứng dụng)
   - Sao của Học từ vựng: nằm trong dữ liệu đồng bộ của ứng dụng từ vựng (sync/vocab_stars_v1.<bé>)
   - Sao của Toán, Tiếng Việt, Ngữ văn: mỗi lần nhận là một dòng riêng trong bankx/<bé>/e/<mã>
     (mỗi dòng một tài liệu nên nhiều máy cùng ghi không bao giờ đè mất của nhau)
   Tổng sao của bé = sao Từ vựng + tổng các dòng Toán / Tiếng Việt / Ngữ văn
   ============================================================ */
(function () {
  'use strict';
  if (window.BANK) return;
  var KIDS = [
    { id: 'anhphong', name: 'Anh Phong', av: '🦖', grade: 'Lớp 2', color: '#EA580C', soft: '#FFEBD6', app: 'lop2', appName: 'Toán & Tiếng Việt lớp 2' },
    { id: 'thanhnghi', name: 'Thanh Nghị', av: '🚀', grade: 'Lớp 6', color: '#15803D', soft: '#E2F6E8', app: 'lop6', appName: 'Toán & Ngữ văn lớp 6' }
  ];
  var SRC = {
    vocab: { e: '📘', n: 'Từ vựng' },
    toan: { e: '🧮', n: 'Toán' },
    tv: { e: '📖', n: 'Tiếng Việt' },
    van: { e: '📚', n: 'Ngữ văn' },
    home: { e: '🏠', n: 'Bố mẹ thưởng / đổi quà' }
  };
  /* Quy tắc nhận sao cho Toán – Tiếng Việt – Ngữ văn.
     cap: số lần tối đa có sao trong một ngày (tính chung các môn của ứng dụng đó) */
  var RULES = {
    anhphong: {
      round: { min: 10, steps: [[100, 2], [90, 1]], cap: 4, label: 'Luyện một bài (từ 10 câu)' },
      first: { pct: 90, v: 2, label: 'Lần đầu đạt từ 90% ở một bài' },
      test: { min: 10, steps: [[95, 5], [90, 3], [80, 1]], cap: 2, label: 'Bài kiểm tra' },
      drill: { v: 1, cap: 2, label: 'Phá kỉ lục tính nhẩm / bảng cửu chương' }
    },
    thanhnghi: {
      round: { min: 10, steps: [[100, 2], [90, 1]], cap: 4, label: 'Luyện tập 10 câu' },
      review: { min: 10, steps: [[90, 2]], cap: 1, label: 'Ôn tập đến hạn (từ 10 câu)' },
      fix: { min: 5, v: 1, cap: 1, label: 'Sửa đúng từ 5 câu trong Sổ lỗi sai' },
      lesson: { v: 3, label: 'Hoàn thành một bài học (lần đầu)' },
      test: { min: 20, steps: [[98, 5], [94, 3], [90, 1]], cap: 2, label: 'Bài kiểm tra (từ 20 câu)' },
      write: { min: 2, max: 10, label: 'Bài viết được bố mẹ chấm' }
    }
  };
  function stepStars(steps, pct) { for (var i = 0; i < steps.length; i++) if (pct >= steps[i][0]) return steps[i][1]; return 0; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(t) { var d = t ? new Date(t) : new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  var CACHE_KEY = 'bank_ext_cache_v1';
  var cache = { anhphong: {}, thanhnghi: {} };   // id -> dòng sao (Toán/TV/Văn)
  var pending = {};                               // id -> dòng chưa lên kho
  var vocab = { anhphong: null, thanhnghi: null };// {bal, led} của Học từ vựng (đọc từ kho)
  try { var c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); if (c && c.anhphong) cache = c; } catch (e) { }
  function saveCache() { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) { } }

  var listeners = [], PIN = null;
  var B = {
    KIDS: KIDS, SRC: SRC, RULES: RULES, ymd: ymd, stepStars: stepStars,
    db: null, state: 'loading', pinSet: false,
    pin: function () { return PIN; },
    kid: function (id) { return KIDS.filter(function (k) { return k.id === id; })[0] || null; },
    onChange: function (f) { listeners.push(f); },
    _emit: function () { listeners.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); },
    /* các dòng sao Toán/TV/Văn còn hiệu lực, mới nhất trước */
    extList: function (kid) {
      var m = cache[kid] || {};
      return Object.keys(m).map(function (k) { return m[k]; }).filter(function (e) { return e && !e.void; }).sort(function (a, b) { return b.t - a.t; });
    },
    extSum: function (kid) { return B.extList(kid).reduce(function (s, e) { return s + (+e.v || 0); }, 0); },
    vocabBal: function (kid) { return vocab[kid] ? (+vocab[kid].bal || 0) : null; },
    vocabLed: function (kid) { return vocab[kid] && vocab[kid].led ? vocab[kid].led : []; },
    total: function (kid) { var v = B.vocabBal(kid); return (v == null ? 0 : v) + B.extSum(kid); },
    /* sao nhận hôm nay theo nguồn: {vocab, toan, tv, van, home} */
    todayBySrc: function (kid) {
      var d = ymd(), o = { vocab: 0, toan: 0, tv: 0, van: 0, home: 0 };
      B.vocabLed(kid).forEach(function (e) {
        if (!(e.v > 0) || ymd(e.t) !== d || /^📌/.test(String(e.r))) return;
        if (!e.k || e.k === 'auto') o.vocab += e.v; else o.home += e.v;
      });
      B.extList(kid).forEach(function (e) { if (e.v > 0 && ymd(e.t) === d) o[e.src] = (o[e.src] || 0) + e.v; });
      return o;
    },
    /* số lần đã nhận sao hôm nay của một loại (k) */
    countToday: function (kid, k) { var d = ymd(); return B.extList(kid).filter(function (e) { return e.k === k && ymd(e.t) === d && e.v > 0; }).length; },
    has: function (kid, key) { return B.extList(kid).some(function (e) { return e.key === key; }); },
    /* ghi một dòng sao: {v, r, src, k, key?} */
    add: function (kid, o) {
      if (!o || !o.v || !cache[kid]) return null;
      var e = { id: rid(), t: Date.now(), v: Math.round(o.v), r: String(o.r || ''), src: o.src || 'home', k: o.k || 'x', key: o.key || '', day: ymd() };
      cache[kid][e.id] = e; pending[kid + '/' + e.id] = e; saveCache(); B._emit(); B._flush();
      return e;
    },
    void: function (kid, id) {
      var e = cache[kid] && cache[kid][id]; if (!e) return false;
      e.void = true; e.vt = Date.now(); pending[kid + '/' + id] = e; saveCache(); B._emit(); B._flush(); return true;
    },
    _flush: function () {
      if (!B.db) return;
      Object.keys(pending).forEach(function (p) {
        var e = pending[p], kid = p.split('/')[0];
        B.db.doc('bankx/' + kid + '/e/' + e.id).set(e).then(function () { if (pending[p] === e) delete pending[p]; }).catch(function () { setTimeout(B._flush, 15000); });
      });
    }
  };

  function withTimeout(p, ms) { return Promise.race([p, new Promise(function (r) { setTimeout(function () { r(null); }, ms); })]); }
  async function readVocabDoc(snap, kidOf) {
    if (!snap || !snap.exists) return null;
    var x = snap.data() || {}, s = null;
    if (typeof x.v === 'string') s = x.v;
    else if (x.c) {
      s = '';
      for (var i = 0; i < x.c; i++) {
        try { var p = await B.db.doc('sync/vocab_stars_v1.' + kidOf + '~' + i).get(); s += (p.exists ? (p.data() || {}).p : '') || ''; } catch (e) { return null; }
      }
    }
    try { return JSON.parse(s); } catch (e) { return null; }
  }
  B.ready = (async function () {
    var db = null;
    try { if (window.claude && claude.use) db = await withTimeout(claude.use('db'), 15000); } catch (e) { db = null; }
    if (!db) { B.state = 'off'; B._emit(); return false; }
    B.db = db; B.state = 'ok';
    KIDS.forEach(function (k) {
      try {
        db.collection('bankx/' + k.id + '/e').onSnapshot(function (snap) {
          var m = {};
          snap.docs.forEach(function (d) { var x = d.data(); if (x && x.id) m[x.id] = x; });
          Object.keys(pending).forEach(function (p) { if (p.indexOf(k.id + '/') === 0) { var e = pending[p]; m[e.id] = e; } });
          cache[k.id] = m; saveCache(); B._emit();
        }, function () { B.state = 'err'; B._emit(); });
      } catch (e) { }
      try {
        db.doc('sync/vocab_stars_v1.' + k.id).onSnapshot(function (snap) {
          readVocabDoc(snap, k.id).then(function (v) { if (v) { vocab[k.id] = v; B._emit(); } });
        });
      } catch (e) { }
    });
    try { db.doc('sync/vocab_pin').onSnapshot(function (snap) { if (snap && snap.exists) { try { var v = JSON.parse((snap.data() || {}).v); if (v) { PIN = String(v); B.pinSet = true; } } catch (e) { } } }); } catch (e) { }
    B._flush();
    return true;
  })();

  /* Cửa sổ báo nhận sao (dùng chung) */
  B.celebrate = function (lines) {
    lines = (lines || []).filter(function (x) { return x && x.v; });
    if (!lines.length) return;
    var tot = lines.reduce(function (s, x) { return s + x.v; }, 0);
    var el = document.createElement('div');
    el.setAttribute('role', 'dialog');
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:rgba(15,23,42,.45);padding:20px;font-family:system-ui,-apple-system,Segoe UI,sans-serif';
    el.innerHTML = '<div style="background:#fff;border-radius:24px;max-width:420px;width:100%;padding:24px 22px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.25);border:3px solid #F59E0B">' +
      '<div style="font-size:54px;line-height:1">⭐</div>' +
      '<div style="font-size:26px;font-weight:800;color:#B45309;margin:6px 0 4px">+' + tot + ' sao thưởng!</div>' +
      lines.map(function (x) { return '<div style="font-size:16px;color:#334155;margin:4px 0">' + x.r.replace(/</g, '&lt;') + ' <b style="color:#B45309">+' + x.v + '</b></div>'; }).join('') +
      '<div style="font-size:13px;color:#64748B;margin-top:8px">Sao đã vào kho Sao thưởng chung.</div>' +
      '<button style="margin-top:14px;font-size:18px;font-weight:700;padding:12px 30px;border-radius:14px;border:0;background:#F59E0B;color:#fff;cursor:pointer">Tuyệt vời!</button></div>';
    el.querySelector('button').onclick = function () { el.remove(); };
    document.body.appendChild(el);
  };

  /* ----- Hàm thưởng dùng trong Toán / Tiếng Việt / Ngữ văn -----
     Trả về danh sách dòng sao đã ghi để ứng dụng hiện cho bé */
  B.awardRound = function (kid, src, c, n, label, opt) {
    opt = opt || {}; var R = RULES[kid]; if (!R || !n) return [];
    var kind = opt.kind || 'round', rule = R[kind] || R.round, out = [], pct = Math.round(c / n * 100);
    if (rule && n >= (rule.min || 0)) {
      var v = rule.steps ? stepStars(rule.steps, pct) : (c >= (rule.min || 0) ? rule.v : 0);
      if (v && (rule.cap == null || B.countToday(kid, kind) < rule.cap)) {
        var e = B.add(kid, { v: v, r: SRC[src].e + ' ' + (opt.title || rule.label) + (label ? ': ' + label : '') + ' (' + c + '/' + n + ')', src: src, k: kind });
        if (e) out.push(e);
      }
    }
    if (opt.firstKey && R.first && pct >= R.first.pct && !B.has(kid, opt.firstKey)) {
      var f = B.add(kid, { v: R.first.v, r: SRC[src].e + ' Lần đầu đạt ' + pct + '%' + (label ? ': ' + label : ''), src: src, k: 'first', key: opt.firstKey });
      if (f) out.push(f);
    }
    return out;
  };
  B.capLeft = function (kid, kind) { var r = RULES[kid] && RULES[kid][kind]; if (!r || r.cap == null) return Infinity; return Math.max(0, r.cap - B.countToday(kid, kind)); };

  /* Danh sách quy tắc để hiện cho bé và bố mẹ */
  B.rulesHtml = function (kid) {
    var R = RULES[kid]; if (!R) return '';
    var sub = kid === 'anhphong' ? 'Toán · Tiếng Việt' : 'Toán · Ngữ văn';
    function steps(s, n) { return s.map(function (x) { return (x[0] === 100 ? 'đúng hết' : 'từ ' + x[0] + '%') + ' → +' + x[1]; }).join(' · '); }
    var rows = [];
    Object.keys(R).forEach(function (k) {
      var r = R[k], t;
      if (r.steps) t = steps(r.steps);
      else if (k === 'write') t = 'bố mẹ chấm từ +' + r.min + ' đến +' + r.max;
      else t = '+' + r.v;
      rows.push('<li><b>' + r.label + '</b>: ' + t + (r.cap != null ? ' <span style="opacity:.7">(tối đa ' + r.cap + ' lần/ngày)</span>' : '') + '</li>');
    });
    return '<div style="font-weight:700;margin-bottom:4px">' + sub + '</div><ul style="margin:0;padding-left:20px;line-height:1.6">' + rows.join('') + '</ul>';
  };

  window.BANK = B;
})();
