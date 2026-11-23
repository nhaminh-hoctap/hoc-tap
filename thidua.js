/* ============================================================
   THI ĐUA: Đấu trường tuần · Linh vật lớn lên · Khiên giữ chuỗi
   - Mỗi bé được chấm theo MỤC TIÊU RIÊNG của mình (tối đa 15 điểm/ngày, 105 điểm/tuần)
   - Tuần chốt vào hết Chủ nhật; trang chính tự chốt khi mở vào tuần sau:
       ghi league/<thứ Hai>, trao cúp (+30 sao) cho bé thắng, +1 khiên cho bé đạt từ 75 điểm
   - Học được xu 🪙 (năng lượng từ các ngày học); xu mua thức ăn trong 🐾 Nuôi thú, cho ăn thì linh vật lớn
   ============================================================ */
(function () {
  'use strict';
  if (window.THIDUA) return;
  var START = '2026-11-16', CUP = 30, WIN_MIN = 50, SHIELD_MIN = 75, SHIELD_MAX = 2, NEWW = 5;
  var GOOD = 15, GOOD_MIN = 60; // bé không vô địch nhưng đạt từ 60 điểm: +15 sao
  var KIDS = (window.BANK && BANK.KIDS ? BANK.KIDS.map(function (k) { return k.id; }) : ['anhphong', 'thanhnghi']);
  function appOf(kid) { var k = window.BANK && BANK.kid(kid); return k ? k.app || null : null; }
  /* các ứng dụng Toán/TV cùng kiểu Vở Vui (lớp 2, lớp 3…): [tên tài liệu trên kho, khoá lưu trên máy] */
  var L2F = { lop1: ['lop1', 'vovui-lop1-sync-v4'], lop2: ['sync', 'vovui-lop2-sync-v4'], lop3: ['lop3', 'vovui-lop3-sync-v4'], lop5: ['lop5', 'vovui-lop5-sync-v4'], lop7: ['lop7', 'vovui-lop7-sync-v4'] };
  function vvDoc(kid, n) { var a = appOf(kid); return L2F[a] ? (n || D).lx[a] : null; }
  /* tên môn chính theo bé: 0 ngắn, 1 vừa, 2 dài (bạn chưa có ứng dụng lớp: tạm tính theo 4 việc tiếng Anh) */
  function subN(kid, f) { var a = appOf(kid); if (a === 'lop7') return ['Toán/Văn', 'Toán/Ngữ văn', 'Toán và Ngữ văn lớp 7'][f]; if (a === 'lop3' || a === 'lop1' || a === 'lop5') return ['Toán/TV', 'Toán/Tiếng Việt', 'Toán và Tiếng Việt lớp ' + a.slice(3)][f]; if (a === 'lop2') return ['Toán/TV', 'Toán/Tiếng Việt', 'Toán và Tiếng Việt lớp 2'][f]; if (a === 'lop6') return ['Toán/Văn', 'Toán/Ngữ văn', 'Toán và Ngữ văn lớp 6'][f]; return ['4 việc tiếng Anh', 'đủ 4 việc tiếng Anh', 'đủ 4 việc tiếng Anh'][f]; }
  function subIc(kid) { var a = appOf(kid); return a === 'lop1' || a === 'lop2' || a === 'lop3' || a === 'lop5' ? '🧮' : a === 'lop7' ? '📐' : a === 'lop6' ? '📐' : '📘'; }
  function famOf(kid) { return !window.BANK || !BANK.fam || BANK.fam(kid); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var a = s.split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); }
  function addD(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
  function monday(s) { var d = parse(s), w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return ymd(d); }
  function today() { return ymd(new Date()); }
  function dm(s) { var d = parse(s); return d.getDate() + '/' + (d.getMonth() + 1); }
  function dayOf(t) { return ymd(new Date(t)); }
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  var dayDone = function (r) { return !!(r && (r.done || (r.newDone && r.reviewDone))); };

  /* Rương báu: đủ số từ mới trong ngày (5; Hưng lớp 1: 3) + ôn tập + 2 bài luyện thêm trọn vẹn + 1 bài nghe & nói trọn vẹn */
  function newN(kid) { var b = window.BANK && BANK.kid(kid); return (b && b.nw) || NEWW; }   // số từ mới mỗi ngày (Hưng 3, các bạn khác 5)
  function chestCheck(r, plog, k, kid) {
    var need = kid ? newN(kid) : NEWW;
    var lg = (plog || []).filter(function (e) { return e && e.t && dayOf(e.t) === k && e.total > 0 && e.done >= e.total; });
    /* từ mới chỉ tính khi bé học xong cả bước kiểm tra từ mới (có dấu newDone), mở ra học chưa tính */
    var nd = !!(r && (r.newDone || r.done)), nw = nd ? (r.new || []).length : 0, part = !nd && !!(r && r.new && r.new.length), rv = !!(r && (r.reviewDone || r.done));
    var pr = lg.filter(function (e) { return e.type !== 'ls'; }).length, ls = lg.filter(function (e) { return e.type === 'ls'; }).length;
    return { nw: nw, part: part, rv: rv, pr: pr, ls: ls, need: need, ok: nw >= need && rv && pr >= 2 && ls >= 1 };
  }

  /* ---------- đọc dữ liệu ---------- */
  var D = null, AT = 0, LOADING = null, subs = [], WORDS = null;
  async function readDoc(db, path) {
    try {
      var sn = await db.doc(path).get(); if (!sn.exists) return null; var x = sn.data() || {};
      if (typeof x.json === 'string') return JSON.parse(x.json);
      if (typeof x.v === 'string') return JSON.parse(x.v);
      if (x.c) { var s = ''; for (var i = 0; i < x.c; i++) { var p = await db.doc(path + '~' + i).get(); s += (p.exists ? (p.data() || {}).p : '') || ''; } return JSON.parse(s); }
      return x;
    } catch (e) { return null; }
  }
  async function load(force) {
    if (D && !force && Date.now() - AT < 20000) return D;
    if (LOADING) return LOADING;
    LOADING = (async function () {
      await BANK.ready; var db = BANK.db;
      var per = ['sync/vocab_daily_v1.', 'sync/vocab_practice_log_v1.', 'sync/vocab_shield_v1.', 'thu-cung/'], jobs = [];
      if (db) {
        KIDS.forEach(function (k) { per.forEach(function (p) { jobs.push(readDoc(db, p + k)); }); });
        var uid = 'gia-dinh';   // cả nhà dùng chung một tài khoản trên trang thật
        try { var us = window.claude && claude.use && await claude.use('user'); var u2 = us && await us.id(); if (u2) uid = u2; } catch (e) { }
        jobs.push(readDoc(db, 'data/users/' + uid + '/sync'), readDoc(db, 'tien-do/hoc-sinh'), db.collection('league').get().catch(function () { return null; }));
        Object.keys(L2F).forEach(function (a) { if (a !== 'lop2') jobs.push(readDoc(db, 'data/users/' + uid + '/' + L2F[a][0])); });
      }
      jobs.push(WORDS || fetch('words.json').then(function (r) { return r.json(); }).catch(function () { return null; }));
      var R = await Promise.all(jobs), W = R[R.length - 1];
      if (W) WORDS = W;
      var lg = {}, n = { vd: {}, pl: {}, sh: {}, tc: {}, l2: null, l6: null, lx: {}, lg: lg };
      KIDS.forEach(function (k, i) { var o = i * 4; n.vd[k] = (db && R[o] && R[o].days) || {}; n.pl[k] = (db && R[o + 1]) || []; n.sh[k] = (db && R[o + 2]) || {}; n.tc[k] = (db && R[o + 3]) || null; });
      if (db) { var z = KIDS.length * 4; n.l2 = R[z]; n.l6 = R[z + 1]; if (R[z + 2]) R[z + 2].docs.forEach(function (d) { var x = d.data(); if (x && x.wk) lg[x.wk] = x; });
        Object.keys(L2F).filter(function (a) { return a !== 'lop2'; }).forEach(function (a, i) { n.lx[a] = R[z + 3 + i] || null; }); }
      try { mergeLocal(n); } catch (e) { console.error(e); }
      n.sj = {}; n.goal = {};
      KIDS.forEach(function (k) { n.sj[k] = subjDays(k, n); n.goal[k] = k === 'thanhnghi' ? ((n.l6 && n.l6.cfg && +n.l6.cfg.goal) || 20) : 20; });
      D = n; AT = Date.now(); LOADING = null;
      try { await finalize(); } catch (e) { console.error(e); }
      if (db) setTimeout(function () { snapLog().catch(function (e) { console.error(e); }); }, 1500);
      subs.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
      return D;
    })();
    return LOADING;
  }
  /* Gộp thêm phần bé vừa học trên máy này mà có thể chưa kịp gửi lên kho
     (bé bấm về trang chính ngay, hoặc mạng yếu) — để nhiệm vụ, điểm tuần, linh vật cập nhật ngay */
  function dayScore(r) { return r ? (r.new || []).length * 10 + (r.newDone ? 5 : 0) + (r.reviewDone || r.done ? 5 : 0) + (r.chest ? 3 : 0) + (+r.q || 0) / 1000 : -1; }
  function mergeLocal(n) {
    var vd = lsGet('vocab_daily_v1', {}), pl = lsGet('vocab_practice_log_v1', {});
    KIDS.forEach(function (k) {
      var ld = vd && vd[k] && vd[k].days || {}, cd = n.vd[k];
      Object.keys(ld).forEach(function (d) { if (dayScore(ld[d]) > dayScore(cd[d])) cd[d] = ld[d]; });
      var lp = pl && Array.isArray(pl[k]) ? pl[k] : [];
      if (lp.length) {
        var seen = {}, all = [];
        n.pl[k].concat(lp).forEach(function (e) { if (!e || !e.t) return; var id = e.t + '|' + e.type, o = seen[id];
          if (o === undefined) { seen[id] = all.length; all.push(e); } else if ((+e.done || 0) > (+all[o].done || 0)) all[o] = e; });
        n.pl[k] = all.sort(function (a, b) { return b.t - a.t; });
      }
    });
    /* Lớp 2, Lớp 3…: các lượt chưa gửi + bản kho đã lưu trên máy */
    n.lx.lop2 = n.l2;
    Object.keys(L2F).forEach(function (a) {
      var s2 = lsGet(L2F[a][1], null);
      if (!s2 || typeof s2 !== 'object') return;
      var c2 = n.lx[a] || {}, out = { rounds: [], tests: [] };
      ['rounds', 'tests'].forEach(function (f) {
        var seen = {};
        [].concat(c2[f] || [], (s2.D && s2.D[f]) || [], (s2.L && s2.L[f]) || []).forEach(function (r) {
          if (!Array.isArray(r)) return; var id = r[0] + '|' + r[1]; if (seen[id]) return; seen[id] = 1; out[f].push(r); });
      });
      n.lx[a] = Object.assign({}, c2, out);
    });
    n.l2 = n.lx.lop2;
    /* Lớp 6: mỗi ngày, mỗi môn lấy số câu lớn hơn giữa máy này và kho */
    var s6 = lsGet('vo-on-luyen-lop6-v1', null);
    if (s6 && s6.days) {
      var c6 = n.l6 = n.l6 || { days: {} }; c6.days = c6.days || {};
      Object.keys(s6.days).forEach(function (d) {
        var L = s6.days[d] || {}, C = c6.days[d] = c6.days[d] || {};
        Object.keys(L).forEach(function (sb) { var a = L[sb], b = C[sb]; if (a && typeof a === 'object' && (!b || (+a.q || 0) > (+b.q || 0))) C[sb] = a; });
      });
      if (!c6.cfg && s6.cfg) c6.cfg = s6.cfg;
    }
  }
  /* số câu Toán/TV/Văn mỗi ngày {ngày: {q, c}} */
  function subjDays(kid, n) {
    var o = {};
    function put(k, q, c) { var x = o[k] || (o[k] = { q: 0, c: 0 }); x.q += q; x.c += c; }
    if (L2F[appOf(kid)]) {
      var doc = vvDoc(kid, n); if (!doc) return o;
      (doc.rounds || []).forEach(function (r) { if (Array.isArray(r)) put(dayOf(r[0]), +r[4] || 0, +r[3] || 0); });
      (doc.tests || []).forEach(function (r) { if (Array.isArray(r)) put(dayOf(r[0]), +r[3] || 0, +r[4] || 0); });
    } else if (appOf(kid) === 'lop6') {
      var S = n.l6; if (!S || !S.days) return o;
      Object.keys(S.days).forEach(function (k) { var dd = S.days[k] || {}; Object.keys(dd).forEach(function (s) { if (dd[s] && typeof dd[s] === 'object') put(k, +dd[s].q || 0, +dd[s].c || 0); }); });
    }
    return o;
  }

  /* ---------- điểm ngày / tuần ---------- */
  function dayPts(kid, k) {
    var r = D.vd[kid][k], sj = D.sj[kid][k] || { q: 0, c: 0 }, goal = D.goal[kid], ch = chestCheck(r, D.pl[kid], k, kid);
    var na = !appOf(kid);   // bạn chưa có ứng dụng Toán/TV theo lớp: tạm tính theo tiếng Anh
    var p = { en: dayDone(r) ? 5 : 0, sub: na ? (ch.ok ? 4 : 0) : sj.q >= goal ? 4 : 0, more: na ? (ch.pr >= 4 ? 2 : 0) : sj.q >= goal * 2 ? 2 : 0, acc: 0, chest: ch.ok || (r && r.chest) ? 2 : 0, sq: sj.q, goal: goal, ch: ch };
    var q = (r && +r.q || 0) + sj.q, c = (r && +r.ok || 0) + sj.c; p.q = q; p.pct = q ? Math.round(c / q * 100) : 0;
    if (q >= 20) p.acc = c / q >= 0.9 ? 2 : c / q >= 0.8 ? 1 : 0;
    p.t = p.en + p.sub + p.more + p.acc + p.chest; return p;
  }
  function weekPts(kid, wk) {
    var t = today(), s = 0;
    for (var i = 0; i < 7; i++) { var k = addD(wk, i); if (k > t) break; s += dayPts(kid, k).t; }
    return s;
  }
  async function finalize() {
    var db = BANK.db; if (!db) return; var cur = monday(today()), ext = null;
    for (var wk = START; addD(wk, 7) <= cur; wk = addD(wk, 7)) {
      var doc = D.lg[wk];
      if (!doc) {
        var s = {}; KIDS.forEach(function (k) { s[k] = weekPts(k, wk); });
        /* cúp và sao "làm tốt" là luật riêng của nhà mình: chỉ so giữa các con trong nhà; xu xếp hạng tính cho cả 6 bạn (xpParts) */
        var FK = KIDS.filter(famOf), top = Math.max.apply(null, FK.map(function (k) { return s[k] || 0; }));
        var win = top >= WIN_MIN ? FK.filter(function (k) { return s[k] === top; }) : [];
        doc = { wk: wk, s: s, win: win, good: FK.filter(function (k) { return win.indexOf(k) < 0 && s[k] >= GOOD_MIN; }), sh: KIDS.filter(function (k) { return s[k] >= SHIELD_MIN; }), at: Date.now() };
        try { await db.doc('league/' + wk).set(doc); } catch (e) { }
        D.lg[wk] = doc;
      }
      if (!(doc.win || []).length && !(doc.good || []).length) continue;
      if (ext === null) ext = await BANK.extReady;
      if (!ext) continue; // chưa đọc được kho sao: lần sau trao
      doc.win.forEach(function (k) {
        var id = 'cup-' + wk;
        if (!BANK.hasId(k, id)) BANK.add(k, { id: id, v: CUP, r: '🏆 Cúp vô địch tuần ' + dm(wk) + '–' + dm(addD(wk, 6)) + ' (' + doc.s[k] + ' điểm)', src: 'cup', k: 'cup', key: id });
      });
      (doc.good || []).forEach(function (k) {
        var id = 'good-' + wk;
        if (!BANK.hasId(k, id)) BANK.add(k, { id: id, v: GOOD, r: '💪 Làm tốt tuần ' + dm(wk) + '–' + dm(addD(wk, 6)) + ' (' + doc.s[k] + ' điểm)', src: 'cup', k: 'cup', key: id });
      });
    }
  }
  function cupsOf(kid) { return Object.keys(D.lg).filter(function (w) { return (D.lg[w].win || []).indexOf(kid) >= 0; }).length; }
  /* khiên: nhận vào thứ Hai sau tuần đạt ≥75 điểm, giữ tối đa 2; dùng khi lỡ một ngày */
  function shieldHave(kid) {
    var ev = [];
    Object.keys(D.lg).forEach(function (w) { if ((D.lg[w].sh || []).indexOf(kid) >= 0) ev.push([addD(w, 7), 0]); });
    var used = (D.sh[kid] && D.sh[kid].used) || {}; Object.keys(used).forEach(function (d) { ev.push([String(used[d]).length === 10 ? used[d] : d, 1]); });
    ev.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]; });
    var h = 0; ev.forEach(function (e) { h = e[1] ? Math.max(0, h - 1) : Math.min(SHIELD_MAX, h + 1); }); return h;
  }

  /* ---------- linh vật ---------- */
  /* Các loài linh vật (bé chọn trong 🐾 Nuôi thú). Mốc năng lượng giống nhau cho mọi loài. */
  var STEPS = [0, 30, 80, 160, 300, 500, 800, 1200, 1800];   // bố mẹ chốt 21/11/2026: lớn nhanh lúc đầu, hết cỡ sau ~1 học kỳ
  function mk(L) { return L.map(function (x, i) { return [STEPS[i], x[0], x[1], x[2]]; }); }
  var SPECIES = {
    egg: { n: 'Quả trứng bí ẩn', e: '🥚', L: mk([['🥚', 'Quả trứng bí ẩn', ''], ['🥚', 'Trứng đang ấm lên', '✨'], ['🥚', 'Trứng sắp nở', '💫'], ['🥚', 'Trứng sắp nở', '💫'], ['🥚', 'Trứng sắp nở', '💫'], ['🥚', 'Trứng sắp nở', '💫'], ['🥚', 'Trứng sắp nở', '💫'], ['🥚', 'Trứng sắp nở', '💫'], ['🥚', 'Trứng sắp nở', '💫']]),
      S: ['#FEF3C7,#FDE68A', '#FEF3C7,#FCD34D', '#FEF9C3,#FDE047', '#FEF9C3,#FDE047', '#FEF9C3,#FDE047', '#FEF9C3,#FDE047', '#FEF9C3,#FDE047', '#FEF9C3,#FDE047', '#FEF9C3,#FDE047'] },
    dino: { n: 'Khủng long', e: '🦖', L: mk([['🥚', 'Quả trứng bí ẩn', ''], ['🥚', 'Trứng đang nứt', '💥'], ['🦎', 'Khủng long sơ sinh', '🌱'], ['🦖', 'Khủng long con', '🌿'], ['🦖', 'Khủng long nhanh nhẹn', '💨'], ['🦖', 'Khủng long chiến binh', '🛡️'], ['🦕', 'Khủng long khổng lồ', '🌴'], ['🐉', 'Rồng khủng long', '🔥'], ['🐲', 'Vua khủng long', '👑']]),
      S: ['#FEF3C7,#FDE68A', '#FEF3C7,#FCD34D', '#DCFCE7,#86EFAC', '#D9F99D,#65A30D', '#BEF264,#4D7C0F', '#A7F3D0,#047857', '#6EE7B7,#065F46', '#FDBA74,#9A3412', '#FDE047,#B45309'] },
    dragon: { n: 'Rồng', e: '🐉', L: mk([['🥚', 'Trứng rồng', ''], ['🥚', 'Trứng rồng đang nứt', '💥'], ['🦎', 'Rồng sơ sinh', '💧'], ['🐉', 'Rồng con', '💨'], ['🐉', 'Rồng lửa nhỏ', '🔥'], ['🐉', 'Rồng chiến binh', '🛡️'], ['🐲', 'Rồng mây', '☁️'], ['🐲', 'Rồng thần', '⚡'], ['🐲', 'Long vương', '👑']]),
      S: ['#E0F2FE,#BAE6FD', '#E0F2FE,#7DD3FC', '#CFFAFE,#22D3EE', '#BAE6FD,#0284C7', '#FECACA,#DC2626', '#C7D2FE,#4338CA', '#E0E7FF,#6366F1', '#4C1D95,#1E1B4B', '#7C3AED,#020617'] },
    phoenix: { n: 'Phượng hoàng', e: '🦅', L: mk([['🥚', 'Trứng lửa', ''], ['🥚', 'Trứng lửa đang nứt', '🔥'], ['🐣', 'Chim lửa non', '🔥'], ['🐥', 'Chim lửa con', '🔥'], ['🐦', 'Chim lửa nhanh nhẹn', '💨'], ['🦅', 'Chim lửa dũng mãnh', '🔥'], ['🦚', 'Chim lửa rực rỡ', '✨'], ['🦅', 'Phượng hoàng', '☀️'], ['🦚', 'Phượng hoàng lửa', '👑']]),
      S: ['#FFEDD5,#FDBA74', '#FFEDD5,#FB923C', '#FEF3C7,#F59E0B', '#FED7AA,#EA580C', '#FECACA,#EF4444', '#FDBA74,#C2410C', '#FDE68A,#DC2626', '#F97316,#7C2D12', '#FDE047,#B91C1C'] },
    unicorn: { n: 'Kỳ lân', e: '🦄', L: mk([['🥚', 'Trứng cầu vồng', ''], ['🥚', 'Trứng cầu vồng đang nứt', '🌈'], ['🐴', 'Ngựa thần sơ sinh', '🌸'], ['🦄', 'Kỳ lân con', '🌈'], ['🦄', 'Kỳ lân nhanh nhẹn', '💨'], ['🦄', 'Kỳ lân ánh sao', '⭐'], ['🦄', 'Kỳ lân cầu vồng', '🌈'], ['🦄', 'Kỳ lân thần', '✨'], ['🦄', 'Vua kỳ lân', '👑']]),
      S: ['#FCE7F3,#F9A8D4', '#FCE7F3,#F472B6', '#FAE8FF,#E879F9', '#EDE9FE,#C084FC', '#FCE7F3,#EC4899', '#E0E7FF,#818CF8', '#FDF4FF,#D946EF', '#A78BFA,#6D28D9', '#F0ABFC,#7E22CE'] }
  };
  /* loài bé đã chọn: kho (thu-cung/<bé>) hoặc bản trên máy; chưa chọn thì Anh Phong mặc định khủng long, Thanh Nghị là quả trứng bí ẩn */
  /* tiến độ thú chỉ tăng (giống prog trong nuoithu.html): bản nào cao hơn thì đúng hơn, bằng nhau mới so giờ lưu (sửa 23/11/2026) */
  function tcProg(o) { o = o || {}; var f = o.fw || {}; return (+o.base || 0) + (+o.grow || 0) + (+o.xuSpent || 0) + (+o.xuWin || 0) + (+f.w || 0) + (+f.l || 0) + (+o.adj || 0) * 100000; }
  function tcOf(kid) { var a = lsGet('thu_cung_v1', {})[kid] || null, b = D && D.tc && D.tc[kid] || null; if (!(a && b)) return a || b || {}; var pa = tcProg(a), pb = tcProg(b); return pa !== pb ? (pa > pb ? a : b) : ((+a.t || 0) >= (+b.t || 0) ? a : b); }
  /* Tên các cấp và hình vẽ (img/thu/<loài><cấp>.webp, bố mẹ tạo bằng Gemini 20/11/2026) */
  var PNAMES = { dino: ['Trứng khủng long', 'Khủng long sơ sinh', 'Khủng long tập đi', 'Khủng long chạy nhảy', 'Khủng long khiên lá', 'Khủng long phiêu lưu', 'Khủng long gầm vang', 'Hiệp sĩ khủng long', 'Vua khủng long'],
    dragon: ['Trứng rồng', 'Rồng sơ sinh', 'Rồng con tập bay', 'Rồng con phun lửa', 'Rồng cưỡi mây', 'Rồng giữ ngọc', 'Rồng sấm sét', 'Hiệp sĩ rồng', 'Long vương'],
    phoenix: ['Trứng lửa', 'Chim lửa sơ sinh', 'Chim lửa tập bay', 'Chim lửa nhỏ', 'Chim lửa tung cánh', 'Phượng hoàng trẻ', 'Phượng hoàng rực lửa', 'Hiệp sĩ phượng hoàng', 'Phượng hoàng vương'],
    unicorn: ['Trứng sao trời', 'Kỳ lân sơ sinh', 'Kỳ lân tập đi', 'Kỳ lân chạy nhảy', 'Kỳ lân bờm sao', 'Kỳ lân phi nước đại', 'Kỳ lân sấm sét', 'Hiệp sĩ kỳ lân', 'Vua kỳ lân'] };
  Object.keys(PNAMES).forEach(function (k) { SPECIES[k].L = PNAMES[k].map(function (n, i) { return [STEPS[i], 'sp:' + k + ':' + i, n, '']; }); });
  SPECIES.unicorn.S = ['#E0E7FF,#A5B4FC', '#E0E7FF,#818CF8', '#DBEAFE,#93C5FD', '#E0F2FE,#60A5FA', '#EDE9FE,#8B5CF6', '#C7D2FE,#4F46E5', '#BFDBFE,#1D4ED8', '#312E81,#1E1B4B', '#4C1D95,#0F172A'];
  /* hình của một cấp: mã 'sp:<loài>:<cấp>' thành ảnh, còn lại là biểu tượng chữ */
  function picOf(e, sz) { var m = /^sp:(\w+):(\d)$/.exec(String(e)); if (!m) return e; sz = sz || '1em';
    return '<img src="img/thu/' + m[1] + m[2] + '.webp" alt="" draggable="false" style="width:' + sz + ';height:' + sz + ';object-fit:contain;vertical-align:middle">'; }
  function spOf(kid) { var s = tcOf(kid).sp; return SPECIES[s] ? s : (kid === 'anhphong' ? 'dino' : 'egg'); }
  function petsOf(kid) { return SPECIES[spOf(kid)].L; }
  function sceneOf(kid, i) { return SPECIES[spOf(kid)].S[i]; }

  /* Bố mẹ bù năng lượng linh vật: những ngày này tính như đã đạt mục tiêu Toán/TV (+5 ⚡), không cộng trùng nếu dữ liệu sau đó về đủ.
     19/11/2026: bù cho Anh Phong vì bài Toán/TV hôm đó chưa gửi được lên kho (lỗi đã sửa ở bản 0025). */
  var SUB_BU = { anhphong: ['2026-11-19'], thanhnghi: [] };
  /* Bù tương tự cho phần tiếng Anh (+10 ⚡): ngày này tính như đã học đủ bài tiếng Anh, không cộng trùng.
     19/11/2026: Anh Phong đã học 5 từ mới, ôn tập, mở rương báu nhưng phần năng lượng tiếng Anh chưa được ghi nhận; bố mẹ bù +10. */
  var EN_BU = { anhphong: ['2026-11-19'], thanhnghi: [] };
  function enOk(kid, k) { return dayDone(D.vd[kid][k]) || (EN_BU[kid] || []).indexOf(k) >= 0; }
  function subOk(kid, k) { if (!appOf(kid)) return chestCheck(D.vd[kid][k], D.pl[kid], k, kid).ok; var s = D.sj[kid][k]; return (s && s.q >= D.goal[kid]) || (SUB_BU[kid] || []).indexOf(k) >= 0; }
  /* ---- XU nuôi thú (bố mẹ chốt 21/11/2026, chung cho mọi bé) ----
     xong tiếng Anh +15 · đạt mục tiêu Toán/TV/Văn +10 · mở rương báu ngẫu nhiên +5…+10 (cố định theo bé và ngày, máy nào cũng như nhau) · mỗi bài làm tốt +2 (tối đa 5 bài/ngày)
     học liền 7 ngày +20 · xếp hạng tuần (từ 50 điểm) hạng 1→6: +50/+40/+30/+20/+20/+20 · thắng đấu thú (tính trong Nuôi thú) */
  /* bố mẹ chốt lại 21/11 (tối): bài làm tốt tối đa 3 bài tiếng Anh + 2 bài Toán/TV/Văn mỗi ngày; lần đầu làm tốt một bài +2 xu (mọi bé);
     xếp hạng tuần (từ 50 điểm) hạng 1→6: +50/+40/+30/+20/+20/+20 */
  var XU = { en: 15, sub: 10, chest: [5, 10], good: 2, goodEn: 3, goodSub: 2, first: 2, streak: 20, rank: [50, 40, 30, 20, 20, 20], prog: 30, progMin: 10, team: 10, teamMin: 400 };   // bố mẹ chốt 21/11 tối: tiến bộ nhất tuần +30, cả nhóm từ 400 điểm mỗi bạn +10   // bố mẹ chốt 21/11 tối: bỏ +10 xu khi tuần đạt từ 60 điểm
  /* 🏆 Thuộc chắc → xu (bố mẹ chốt 22/11/2026): mỗi mốc 50 từ thuộc chắc +150 xu. Bạn học cùng: mọi mốc;
     Anh Phong: mốc từ 401 từ trở đi (450, 500…); Thanh Nghị: từ 601 trở đi (650, 700…). Đọc từ sổ sao Từ vựng ("🏆 Thuộc chắc N từ"). */
  XU.mast = 150; var MAST_XU_FROM = { anhphong: 400, thanhnghi: 600 };
  var MAST_RE = /^🏆 Thuộc chắc (\d+) từ/;
  function mastMiles(kid) {   // [{n, t}] các mốc đã thưởng được tính xu, mỗi mốc một lần
    var from = MAST_XU_FROM[kid] || 0, seen = {}, out = [];
    try { BANK.vocabLed(kid).forEach(function (e) { var m = e && e.v > 0 && MAST_RE.exec(String(e.r)); if (!m) return; var n = +m[1]; if (n > from && !seen[n]) { seen[n] = 1; out.push({ n: n, t: +e.t }); } }); } catch (e) { }
    return out;
  }
  function goodDays(kid) {   // mỗi ngày: số bài làm tốt tiếng Anh (en), Toán/TV/Văn (sub), số bài lần đầu làm tốt (first)
    var m = {};
    function add(e, f) { if (!e || !(e.v > 0)) return; var d = ymdOf(e.t), x = m[d] || (m[d] = { en: 0, sub: 0, first: 0 }); x[f]++; }
    try { BANK.vocabLed(kid).forEach(function (e) { if ((!e.k || e.k === 'auto') && !/^📌/.test(String(e.r)) && !MAST_RE.test(String(e.r))) add(e, 'en'); }); } catch (e) { }
    try { BANK.extList(kid).forEach(function (e) { if (!/^(toan|tv|van)$/.test(e.src) || e.k === 'cup') return; add(e, e.k === 'first' || e.k === 'lesson' ? 'first' : 'sub'); }); } catch (e) { }
    return m;
  }
  function goodN(g) { return g ? Math.min(XU.goodEn, g.en) + Math.min(XU.goodSub, g.sub) : 0; }
  function chestXu(kid, d) { var h = 2166136261, s = 'ruong|' + kid + '|' + d; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return XU.chest[0] + ((h >>> 0) % (XU.chest[1] - XU.chest[0] + 1)); }
  function ymdOf(t) { var d = new Date(+t); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  /* 🎁 rương đồ theo hạng tuần của cả 6 bạn (bố mẹ chốt 22/11/2026): hạng 1 → 1 món từ Hiếm trở lên, hạng 2 → 1 món Thường.
     Tính như xu xếp hạng (từ WIN_MIN điểm, bằng điểm thì cùng hạng), chỉ các tuần đã chốt từ tuần RK_FROM. Nuôi thú đọc để trao rương. */
  var RK_FROM = '2026-11-16';
  function rankChests(kid) {
    if (!D) return []; var out = [];
    Object.keys(D.lg).sort().forEach(function (w) {
      var L = D.lg[w]; if (!L || !L.s || w < RK_FROM) return; var sc = L.s, me = +sc[kid] || 0; if (me < WIN_MIN) return;
      var better = {}; KIDS.forEach(function (k) { var v = +sc[k] || 0; if (v > me) better[v] = 1; }); var r = Object.keys(better).length + 1;
      if (r <= 2) out.push({ wk: w, r: r, s: me });
    });
    return out;
  }
  function xpParts(kid) {
    var o = { en: 0, sub: 0, chest: 0, good: 0, streak: 0, week: 0 }, vd = D.vd[kid], sj = D.sj[kid];
    o.chestXu = 0; Object.keys(vd).forEach(function (k) { if (vd[k] && vd[k].chest) { o.chest++; o.chestXu += chestXu(kid, k); } });
    var ed = {}; Object.keys(vd).concat(EN_BU[kid] || []).forEach(function (k) { if (!ed[k] && enOk(kid, k)) { ed[k] = 1; o.en++; } });
    var sd = {}; Object.keys(sj).concat(SUB_BU[kid] || []).forEach(function (k) { if (!sd[k] && subOk(kid, k)) { sd[k] = 1; o.sub++; } });
    var gd = goodDays(kid); o.first = 0; Object.keys(gd).forEach(function (d) { if (d >= START) { o.good += goodN(gd[d]); o.first += gd[d].first; } });
    var days = Object.keys(ed).sort(), run = 0, prev = null;
    days.forEach(function (d) { run = prev && addD(prev, 1) === d ? run + 1 : 1; prev = d; if (run % 7 === 0) o.streak++; });
    Object.keys(D.lg).forEach(function (w) {
      var L = D.lg[w], sc = (L && L.s) || {}, me = +sc[kid] || 0; if (!L) return;
      var pv = D.lg[addD(w, -7)];   // 🌱 tiến bộ nhất so với tuần trước (tăng từ XU.progMin điểm)
      if (pv && pv.s) { var dl = function (k) { return (+sc[k] || 0) - (+pv.s[k] || 0); }, best = Math.max.apply(null, KIDS.map(dl)); if (best >= XU.progMin && dl(kid) === best) o.week += XU.prog; }
      if (KIDS.reduce(function (a, k) { return a + (+sc[k] || 0); }, 0) >= XU.teamMin) o.week += XU.team;   // 🤝 mục tiêu chung cả nhóm
      if (me >= WIN_MIN) { var better = {}; KIDS.forEach(function (k) { var v = +sc[k] || 0; if (v > me) better[v] = 1; }); var r = Object.keys(better).length; if (r < XU.rank.length) o.week += XU.rank[r]; }
    });
    o.mast = mastMiles(kid).length;
    o.xp = o.en * XU.en + o.sub * XU.sub + o.chestXu + o.good * XU.good + o.first * XU.first + o.streak * XU.streak + o.week + o.mast * XU.mast; return o;
  }
  function xpToday(kid) { var t = today(), r = D.vd[kid][t], g = goodDays(kid)[t]; return (enOk(kid, t) ? XU.en : 0) + (subOk(kid, t) ? XU.sub : 0) + (r && r.chest ? chestXu(kid, t) : 0) + goodN(g) * XU.good + (g ? g.first : 0) * XU.first + mastMiles(kid).filter(function (x) { return ymdOf(x.t) === t; }).length * XU.mast; }
  function pet(kid) {
    /* không chờ tải dữ liệu học: vẽ ngay thú đã lưu trên máy, khỏi chớp hình mặc định khi mở trang */
    var tc = tcOf(kid), xp = (+tc.base || 0) + (+tc.grow || 0), L = petsOf(kid), i = 0;  // thú lớn nhờ được cho ăn (🐾 Nuôi thú)
    for (var j = 0; j < L.length; j++) if (xp >= L[j][0]) i = j;
    return { i: i, n: L.length, e: L[i][1], name: L[i][2], acc: L[i][3], xp: xp, from: L[i][0], next: L[i + 1] || null };
  }

  /* ---------- 📋 Nhật ký toàn diện: so số liệu hiện tại của từng bạn với lần ghi trước (nhatky/<bé>.last), có thay đổi thì ghi một dòng
     (mã cố định theo "trường + số cũ + số mới + ngày" nên nhiều máy cùng thấy một thay đổi chỉ thành một dòng).
     Số giảm bất thường (ngày học, bài luyện, câu đã làm, điểm lớn thú giảm; xu giảm hơn 30; sao giảm hơn 60) → dòng ĐỎ "tụt" và báo ở Góc bố mẹ.
     Số giảm phải thấy lại ở lần kiểm tra sau (cách ≥ 1 phút) mới ghi, tránh báo nhầm khi một lần tải dữ liệu bị thiếu. ---------- */
  var SNAP_AT = 0;
  function balXu(kid) { var tc = tcOf(kid) || {}; if (famOf(kid) && !tc.rs1121) return 0; var xp = xpParts(kid).xp; if (tc.xu0 == null) return xp; return Math.max(0, xp - tc.xu0 - (+tc.xuSpent || 0) + (+tc.xuWin || 0)); }
  function snapOf(kid) {
    var vd = D.vd[kid] || {}, pl = D.pl[kid] || [], sj = D.sj[kid] || {}, tc = tcOf(kid) || {}, o = {};
    /* sửa 0062: tách xu kiếm được / xu đã tiêu, sao cộng / sao trừ — tiêu xu mua thức ăn, bố mẹ cho đổi sao là bình thường, không báo tụt */
    o.xu = balXu(kid);
    if (tc.xu0 != null) { o.xuk = xpParts(kid).xp + (+tc.xuWin || 0); o.xut = +tc.xuSpent || 0; }
    if (famOf(kid) && window.BANK && BANK.total && BANK.vocabBal(kid) != null) {
      o.sao = BANK.total(kid);
      var led = (BANK.vocabLed ? BANK.vocabLed(kid) : []).concat(BANK.extList ? BANK.extList(kid) : []);
      o.saoc = led.reduce(function (a, e) { return a + (+e.v > 0 ? +e.v : 0); }, 0); o.saot = led.reduce(function (a, e) { return a + (+e.v < 0 ? -e.v : 0); }, 0);
    }   // sao Từ vựng chưa tải xong thì bỏ qua, tránh ghi nhầm
    o.en = Object.keys(vd).filter(function (d) { return dayDone(vd[d]); }).length;
    o.lt = pl.filter(function (e) { return e && e.total > 0 && e.done >= e.total; }).length;
    o.cau = Object.keys(sj).reduce(function (a, d) { return a + (+sj[d].q || 0); }, 0);
    if (tc.sp) o.g = (+tc.base || 0) + (+tc.grow || 0);
    return o;
  }
  var SNAP_F = { xu: ['🪙', 'Xu còn lại', 1e9], xuk: ['🪙', 'Xu đã kiếm được', 30], xut: ['🛒', 'Xu đã tiêu', 0], sao: ['⭐', 'Tổng sao', 1e9], saoc: ['⭐', 'Sao đã cộng', 60], saot: ['➖', 'Sao đã trừ / đã đổi', 60], en: ['📘', 'Ngày học xong tiếng Anh', 0], lt: ['🎯', 'Bài luyện thêm / nghe nói làm trọn', 0], cau: ['🧮', 'Câu môn lớp đã làm', 0], g: ['🌱', 'Điểm lớn của thú', 0] };
  async function snapLog() {
    var db = BANK.db; if (!db || !D || !window.BANK || !BANK.log || Date.now() - SNAP_AT < 60000) return; SNAP_AT = Date.now();
    var day = today();
    for (var i = 0; i < KIDS.length; i++) {
      var kid = KIDS[i], ref = db.doc('nhatky/' + kid), head = {};
      try { var sn = await ref.get(); if (sn.exists) head = sn.data() || {}; } catch (e) { continue; }
      var cur = snapOf(kid), last = head.last || null, pend = head.pend || {}, ch = false;
      if (!last) { await ref.set({ last: cur, pend: {}, t: Date.now() }).catch(function () { }); continue; }   // lần đầu: chỉ ghi mốc
      Object.keys(SNAP_F).forEach(function (f) {
        if (cur[f] == null || last[f] == null || cur[f] === last[f]) { if (pend[f]) { delete pend[f]; ch = true; } return; }
        var F = SNAP_F[f], d = cur[f] - last[f], bad = d < 0 && (-d > F[2]);
        if (d < 0) { var p = pend[f]; if (!(p && p.to === cur[f] && Date.now() - p.t >= 60000)) { if (!p || p.to !== cur[f]) { pend[f] = { to: cur[f], t: Date.now() }; ch = true; } return; } delete pend[f]; }
        BANK.log(kid, bad ? 'tut' : 'doi', F[0] + ' ' + F[1] + ': ' + last[f] + ' → ' + cur[f] + ' (' + (d > 0 ? '+' : '') + d + ')' + (bad ? ' ⚠️ giảm bất thường, cần xem lại' : ''),
          { id: ('s' + f + '_' + last[f] + '_' + cur[f] + '_' + day).replace(/[^a-z0-9_\-]/gi, ''), v: d, bal: cur[f], app: 'tong', x: { f: f } });
        last[f] = cur[f]; ch = true;
      });
      Object.keys(cur).forEach(function (f) { if (last[f] == null && cur[f] != null) { last[f] = cur[f]; ch = true; } });
      if (ch) await ref.set({ last: last, pend: pend, t: Date.now() }).catch(function () { });
    }
  }

  /* ---------- giao diện ---------- */
  var CSS = '.lg-x{margin:8px 0 2px;display:grid;gap:6px;font-size:14.5px;color:#334155}.lg-x>div{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:7px 10px}.lg-tb{display:block;height:7px;border-radius:9px;background:#E2E8F0;margin-top:5px;overflow:hidden}.lg-tb i{display:block;height:100%;background:linear-gradient(90deg,#34D399,#059669)}' +
    '.td-card{background:#fff;border:2px solid #E2E8F0;border-radius:22px;padding:14px 16px;margin-top:16px}' +
    '.td-card h3{margin:0 0 8px;font-size:18px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.td-card h3 small{font-weight:600;color:#64748B;font-size:13px}' +
    '.lg-rows{display:grid;grid-template-columns:max-content minmax(90px,1fr) auto;gap:10px 14px;align-items:center;margin:8px 0}.lg-row{display:contents}.lg-row .np{max-width:none}.lg-row .np .npB{display:inline}' +
    '.lg-bar{height:16px;border-radius:99px;background:#F1F5F9;overflow:hidden;position:relative}.lg-bar i{display:block;height:100%;border-radius:99px;transition:width .6s}' +
    '.lg-bar i.anhphong{background:linear-gradient(90deg,#FDBA74,#EA580C)}.lg-bar i.thanhnghi{background:linear-gradient(90deg,#86EFAC,#15803D)}' +
    '.lg-pt{font-weight:800;font-size:18px;min-width:64px;text-align:right}.lg-pt small{font-size:12px;color:#64748B;font-weight:600}' +
    '.lg-lead{font-size:12px;font-weight:800;color:#B45309;background:#FEF3C7;border-radius:99px;padding:2px 8px;margin-left:4px}' +
    '.lg-meta{font-size:13.5px;color:#475569;margin-top:6px;line-height:1.5}' +
    '.lg-today{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.lg-today span{font-size:13px;border-radius:12px;padding:5px 9px;background:#F8FAFC;border:1.5px solid #E2E8F0;color:#475569}' +
    '.lg-today span.ok{background:#ECFDF5;border-color:#86EFAC;color:#166534;font-weight:700}' +
    '.lg-last{margin-top:10px;font-size:14px;background:linear-gradient(90deg,#FEF3C7,#FFF7ED);border-radius:14px;padding:8px 12px}' +
    '.td-card details{margin-top:10px;font-size:14px;color:#334155}.td-card summary{cursor:pointer;font-weight:700}.td-card ul{margin:6px 0;padding-left:20px;line-height:1.6}' +
    '.lg-hist{width:100%;border-collapse:collapse;font-size:14px;margin-top:8px}.lg-hist td,.lg-hist th{border-top:1px solid #F1F5F9;padding:6px 4px;text-align:left}' +
    '.pet{display:flex;gap:14px;align-items:center}.pet-scene{position:relative;width:118px;height:118px;flex:none;border-radius:24px;display:grid;place-items:center;overflow:hidden;box-shadow:inset 0 -10px 20px rgba(0,0,0,.08)}' +
    '.pet-e{line-height:1;animation:petBob 2.4s ease-in-out infinite;filter:drop-shadow(0 4px 4px rgba(0,0,0,.2))}.pet-a{position:absolute;font-size:24px;animation:petTw 2s ease-in-out infinite}' +
    '.pet-a.a1{top:6px;right:8px}.pet-a.a2{bottom:6px;left:8px;animation-delay:1s}.pet-scene.top{box-shadow:0 0 0 3px #FBBF24,0 0 18px rgba(251,191,36,.8)}' +
    '.pet-info{flex:1;min-width:0}.pet-lv{font-size:13px;color:#64748B;font-weight:700}.pet-nm{font-size:20px;font-weight:800;margin:2px 0 6px}' +
    '.pet-bar{height:14px;border-radius:99px;background:#F1F5F9;overflow:hidden}.pet-bar i{display:block;height:100%;background:linear-gradient(90deg,#FDE047,#F59E0B);border-radius:99px}' +
    '.pet-nx{font-size:13.5px;color:#475569;margin-top:5px}.pet-td{display:inline-block;margin-top:6px;font-size:13px;font-weight:700;color:#B45309;background:#FFFBEB;border-radius:99px;padding:2px 10px}' +
    '@keyframes petBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}@keyframes petTw{0%,100%{opacity:.4;transform:scale(.85)}50%{opacity:1;transform:scale(1.1)}}' +
    '.td-pop{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:rgba(15,23,42,.5);padding:20px}' +
    '.td-box{background:#fff;border-radius:26px;max-width:420px;width:100%;padding:24px 20px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.3);border:3px solid #F59E0B;position:relative;overflow:hidden}' +
    '.td-box .big{font-size:84px;line-height:1.1;animation:petBob 1.6s ease-in-out infinite}.td-box b.t{display:block;font-size:24px;color:#B45309;margin:8px 0 4px}.td-box p{color:#334155;font-size:16px;margin:6px 0}' +
    '.td-box button{margin-top:14px;font-size:18px;font-weight:700;padding:12px 30px;border-radius:14px;border:0;background:#F59E0B;color:#fff;cursor:pointer}' +
    '.td-cf{position:fixed;top:-30px;z-index:100000;pointer-events:none;animation:tdFall linear forwards}@keyframes tdFall{to{transform:translateY(110vh) rotate(540deg)}}' +
    '@media (max-width:520px){.lg-rows{display:block}.lg-row{display:grid;grid-template-columns:1fr auto;gap:6px 10px;align-items:center;margin:10px 0}.lg-row .lg-bar{grid-column:1/-1;grid-row:2}.pet-scene{width:96px;height:96px}}' +
    '.lg-c>summary{list-style:none;cursor:pointer}.lg-c>summary::-webkit-details-marker{display:none}.lg-sum{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:15px;color:#334155;margin-top:4px}' +
    '.lg-more{font-weight:700;color:#2563EB;font-size:14px;margin-left:auto}.lg-c[open] .lg-more{display:none}.lg-mini h3{margin-bottom:2px}' +
    '.pet-line{margin-top:8px}.pet-line>summary{list-style:none;cursor:pointer;display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px}.pet-line>summary::-webkit-details-marker{display:none}' +
    '.pl-n{font-weight:800;font-size:16px}.pl-n small{font-weight:600;opacity:.85}.pl-bar{flex:1;min-width:120px;max-width:260px;height:10px;border-radius:99px;background:rgba(255,255,255,.35);overflow:hidden}.pl-bar i{display:block;height:100%;background:#FDE047;border-radius:99px}' +
    '.pl-x{font-size:13.5px;opacity:.95}.pl-how{margin-top:8px;background:rgba(255,255,255,.18);border-radius:12px;padding:8px 12px;font-size:14px;line-height:1.6}' +
    '.lg-meta{font-size:15px!important}.lg-today span{font-size:14.5px!important}.lg-self{margin-top:8px;font-size:15px;background:#ECFDF5;border-radius:12px;padding:7px 12px;color:#14532D}' +
    '.pl-x{font-size:15px!important;background:rgba(0,0,0,.22);border-radius:99px;padding:3px 10px}.pl-n{font-size:17px!important;text-shadow:0 1px 2px rgba(0,0,0,.25)}' +
    '.ms{padding:16px 18px}.ms-h{display:flex;align-items:center;gap:14px}.ms-ht{flex:1;min-width:0}.ms-ht h3{margin:0 0 2px;font-size:21px}.ms-sub{font-size:16px;color:#334155}' +
    '.ms-ring{--p:0;width:64px;height:64px;flex:none;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#22C55E calc(var(--p)*1%),#E2E8F0 0)}.ms-ring b{width:50px;height:50px;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:17px}' +
    '.ms-say{flex:none;width:56px;height:56px;border-radius:16px;border:2px solid #E2E8F0;background:#fff;font-size:26px;cursor:pointer;box-shadow:0 3px 0 #E2E8F0;touch-action:manipulation}.ms-say:active{transform:translateY(2px);box-shadow:0 1px 0 #E2E8F0}' +
    '.ms-list{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}' +
    '.ms-it{display:flex;align-items:center;gap:10px;min-height:60px;padding:8px 14px;border-radius:16px;border:2px solid #E2E8F0;background:#fff;text-align:left;font-family:inherit;color:#1E293B;cursor:pointer;box-shadow:0 3px 0 #E2E8F0;touch-action:manipulation}' +
    '.ms-it:active{transform:translateY(2px);box-shadow:0 1px 0 #E2E8F0}.ms-ck{width:30px;height:30px;flex:none;border-radius:50%;border:3px solid #CBD5E1;display:grid;place-items:center;font-weight:900;color:#fff;font-size:16px}' +
    '.ms-it.ok{background:#F0FDF4;border-color:#86EFAC;box-shadow:0 3px 0 #86EFAC}.ms-it.ok .ms-ck{background:#22C55E;border-color:#22C55E}.ms-it.ok .ms-t{color:#166534}' +
    '.ms-ic{font-size:26px;flex:none}.ms-t{flex:1;font-size:17px;font-weight:700;line-height:1.25}.ms-t small{display:block;font-weight:600;font-size:13.5px;color:#64748B}.ms-n{font-weight:800;font-size:16px;color:#475569;flex:none}' +
    '.ms-it.bonus{grid-column:1/-1;background:linear-gradient(135deg,#FFFBEB,#FEF3C7);border-color:#FCD34D;box-shadow:0 3px 0 #FCD34D}.ms-it.lock{opacity:.75}.ms-it.lock .ms-ck{border:0;font-size:18px}' +
    '.al h3{margin-bottom:10px}.al-it{display:flex;gap:8px;align-items:flex-start;font-size:15.5px;line-height:1.5;padding:8px 12px;border-radius:12px;margin-top:6px}.al-it.warn{background:#FEF2F2;color:#7F1D1D}.al-it.info{background:#EFF6FF;color:#1E3A8A}.al-it.good{background:#F0FDF4;color:#14532D}' +
    '.td-box p .pm-row{display:flex;gap:12px;align-items:center;text-align:left;background:#FFFBEB;border-radius:14px;padding:8px 12px}.pm-ic{font-size:34px;flex:none}.td-box p small{font-size:14px;color:#475569}' +
    '@media (max-width:640px){.ms-list{grid-template-columns:1fr}}' +
    '@media (prefers-reduced-motion:reduce){.pet-e,.pet-a,.td-box .big{animation:none}}';
  function css() { if (document.getElementById('tdCss')) return; var st = document.createElement('style'); st.id = 'tdCss'; st.textContent = CSS; document.head.appendChild(st); }

  function nameOf(kid) { var k = BANK.kid(kid); return k ? k.name : kid; }
  function plate(kid) { return BANK.nameplate ? BANK.nameplate(kid, 'S', null, { av: true }) : esc(nameOf(kid)); }

  function petHtml(kid) {
    var p = D && pet(kid); if (!p) return ''; css();
    var pct = p.next ? Math.round((p.xp - p.from) / (p.next[0] - p.from) * 100) : 100, td = xpToday(kid);
    return '<div class="td-card"><div class="pet"><div class="pet-scene' + (p.i === p.n - 1 ? ' top' : '') + '" style="background:linear-gradient(160deg,' + sceneOf(kid, p.i) + ')">' +
      '<span class="pet-e" style="font-size:' + (46 + p.i * 4) + 'px">' + picOf(p.e, '1.6em') + '</span>' + (p.acc ? '<span class="pet-a a1">' + p.acc + '</span><span class="pet-a a2">' + (p.i >= 6 ? '✨' : '') + '</span>' : '') + '</div>' +
      '<div class="pet-info"><div class="pet-lv">Linh vật · Cấp ' + (p.i + 1) + '/' + p.n + ' · 🌱 ' + p.xp + ' điểm lớn</div><div class="pet-nm">' + esc(p.name) + '</div>' +
      '<div class="pet-bar"><i style="width:' + Math.max(3, pct) + '%"></i></div>' +
      '<div class="pet-nx">' + (p.next ? 'Còn <b>' + (p.next[0] - p.xp) + ' điểm lớn</b> nữa để thành <b>' + esc(p.next[2]) + '</b>' : 'Linh vật đã lớn hết cỡ. Con thật tuyệt vời! 👑') + '</div>' +
      '<span class="pet-td">' + (td ? 'Hôm nay +' + td + ' 🪙 xu' : 'Học hôm nay để có xu mua thức ăn cho thú nhé!') + '</span></div></div>' +
      '<details><summary>🪙 Linh vật lớn lên thế nào?</summary><ul><li>Học đủ bài tiếng Anh: <b>+15 xu</b></li><li>Đạt mục tiêu ' + subN(kid, 1) + ' trong ngày (' + D.goal[kid] + ' câu): <b>+10 xu</b></li><li>Mở rương báu: <b>+5 đến +10 xu</b> (ngẫu nhiên)</li><li>Mỗi bài làm tốt: <b>+2 xu</b> (mỗi ngày tối đa 3 bài tiếng Anh và 2 bài ' + subN(kid, 0) + ')</li><li>Lần đầu làm tốt một bài ' + subN(kid, 0) + ': <b>+2 xu</b></li><li>Học liền 7 ngày: <b>+20 xu</b></li><li>🏆 Thuộc chắc thêm 50 từ tiếng Anh: <b>+150 xu</b>' + (MAST_XU_FROM[kid] ? ' (tính từ từ thứ ' + (MAST_XU_FROM[kid] + 1) + ' trở đi)' : '') + '</li><li>Xếp hạng tuần (từ ' + WIN_MIN + ' điểm), hạng 1 đến 6: <b>+50/+40/+30/+20/+20/+20 xu</b>; đạt từ ' + GOOD_MIN + ' điểm tuần: <b>+10 xu</b></li><li>⚔️ Đấu trường thú (tối đa 5 trận/ngày): thắng thú của bạn <b>+2 xu</b>, thắng quái <b>+1 xu</b></li><li>Vào 🐾 Nuôi thú, dùng xu mua thức ăn, cho thú ăn để thú lớn.</li></ul>' +
      '<div>' + petsOf(kid).map(function (x, i) { return '<span style="opacity:' + (i <= p.i ? 1 : .35) + '">' + (i <= p.i ? picOf(x[1], '1.4em') : '❔') + '</span>'; }).join(' → ') + '</div></details></div>';
  }

  function petScene(kid, px) {
    var p = pet(kid); if (!p) return ''; css(); px = px || 140;
    return '<div class="pet-scene' + (p.i === p.n - 1 ? ' top' : '') + '" style="width:' + px + 'px;height:' + px + 'px;background:linear-gradient(160deg,' + sceneOf(kid, p.i) + ')">' +
      '<span class="pet-e" style="font-size:' + Math.round(px * (0.42 + p.i * 0.03)) + 'px">' + picOf(p.e, Math.round(px * 0.86) + 'px') + '</span>' + (p.acc ? '<span class="pet-a a1">' + p.acc + '</span>' + (p.i >= 6 ? '<span class="pet-a a2">✨</span>' : '') : '') + '</div>';
  }
  function petLine(kid) {
    var p = D && pet(kid); if (!p) return ''; css();
    var pct = p.next ? Math.round((p.xp - p.from) / (p.next[0] - p.from) * 100) : 100, td = xpToday(kid);
    return '<details class="pet-line"><summary><span class="pl-n">' + picOf(p.e, '1.5em') + ' ' + esc(p.name) + ' <small>· cấp ' + (p.i + 1) + '/' + p.n + '</small></span>' +
      '<span class="pl-bar"><i style="width:' + Math.max(3, pct) + '%"></i></span><span class="pl-x">' + (p.next ? 'còn ' + (p.next[0] - p.xp) + ' điểm nữa để lớn' : 'đã lớn hết cỡ 👑') + (td ? ' · hôm nay +' + td + ' 🪙' : '') + ' ⓘ</span></summary>' +
      '<div class="pl-how"><b>Học được xu 🪙, xu mua thức ăn, cho ăn thì thú lớn</b><br>Học đủ bài tiếng Anh +15 xu · Đạt mục tiêu ' + subN(kid, 1) + ' +10 · Mở rương báu +5…+10 · Mỗi bài làm tốt +2 (3 tiếng Anh + 2 ' + subN(kid, 0) + '/ngày) · Lần đầu làm tốt một bài +2 · Học liền 7 ngày +20 · Xếp hạng tuần +50/+40/+30/+20/+20/+20 · Thắng thú của bạn +2, thắng quái +1<br>' +
      petsOf(kid).map(function (x, i) { return '<span style="opacity:' + (i <= p.i ? 1 : .35) + '">' + (i <= p.i ? picOf(x[1], '1.6em') : '❔') + '</span>'; }).join(' → ') + '</div></details>';
  }

  var TODAY_LBL = { en: ['📘', 'Học đủ bài tiếng Anh', 5], sub: ['🧮', 'Đạt mục tiêu môn chính', 4], acc: ['🎯', 'Chính xác từ 90%', 2], chest: ['🎁', 'Đủ điều kiện rương báu', 2], more: ['💪', 'Học vượt gấp đôi mục tiêu', 2] };
  function leagueHtml(focus, withHist, mode) {
    if (!D) return ''; css();
    var t = today(), wk = monday(t), left = 6 - Math.round((parse(t) - parse(wk)) / 864e5);
    var s = {}; KIDS.forEach(function (k) { s[k] = weekPts(k, wk); });
    var top = Math.max.apply(null, KIDS.map(function (k) { return s[k] || 0; })), nTop = KIDS.filter(function (k) { return s[k] === top; }).length;
    var rows = KIDS.slice().sort(function (a, b) { return (s[b] || 0) - (s[a] || 0); }).map(function (k) {
      var kk = BANK.kid(k) || {};
      var lead = top > 0 && s[k] === top;
      return '<div class="lg-row"><div style="min-width:0">' + plate(k) + '</div>' +
        '<div class="lg-bar"><i class="' + k + '" style="width:' + Math.min(100, s[k] / 105 * 100) + '%;background:linear-gradient(90deg,' + (kk.light || '#94A3B8') + ',' + (kk.color || '#475569') + ')"></i></div><div class="lg-pt">' + (lead ? '<span title="' + (nTop > 1 ? 'Ngang điểm' : 'Đang dẫn') + '">👑</span> ' : '') + s[k] + ' <small>/105</small></div></div>';
    }).join('');
    var sum = KIDS.reduce(function (a, k) { return a + (s[k] || 0); }, 0), pw = D.lg[addD(wk, -7)], pg = '';
    if (pw && pw.s) { var dl = function (k) { return (s[k] || 0) - (+pw.s[k] || 0); }, bst = Math.max.apply(null, KIDS.map(dl)), who = KIDS.filter(function (k) { return dl(k) === bst; });
      pg = bst >= XU.progMin ? '🌱 Tiến bộ nhất (so với tuần trước): <b>' + who.map(function (k) { return (BANK.kid(k) || {}).name || k; }).join(', ') + '</b> +' + bst + ' điểm → <b>+' + XU.prog + ' 🪙</b>' : '🌱 Tiến bộ nhất tuần: bạn nào tăng nhiều điểm nhất so với tuần trước (từ ' + XU.progMin + ' điểm) được <b>+' + XU.prog + ' 🪙</b>'; }
    var extra = '<div class="lg-x"><div>🤝 Cả nhóm: <b>' + sum + '/' + XU.teamMin + '</b> điểm' + (sum >= XU.teamMin ? ' ✅ mỗi bạn <b>+' + XU.team + ' 🪙</b>' : ' · đạt thì mỗi bạn <b>+' + XU.team + ' 🪙</b>') + '<span class="lg-tb"><i style="width:' + Math.min(100, sum / XU.teamMin * 100) + '%"></i></span></div>' + (pg ? '<div>' + pg + '</div>' : '') + '</div>';
    var head = '<h3>🏆 Đấu trường tuần <small>' + dm(wk) + ' – ' + dm(addD(wk, 6)) + '</small></h3><div class="lg-rows">' + rows + '</div>' + extra;
    var meta = '<div class="lg-meta">' + (left > 0 ? 'Còn <b>' + left + ' ngày</b> nữa (tính cả hôm nay là ' + (left + 1) + ')' : '<b>Hôm nay là ngày cuối!</b>') + ' · Hạng 1–6 (từ ' + WIN_MIN + ' điểm): <b>+' + XU.rank.join('/+') + ' 🪙</b> · Hạng 1: <b>🎁 rương đồ từ Hiếm</b>, hạng 2: <b>🎁 rương đồ Thường</b>' + (focus && famOf(focus) ? ' · Con nhất nhà: <b>+' + CUP + ' ⭐</b>' : '') + ' · Từ ' + SHIELD_MIN + ' điểm: <b>+1 🛡️</b></div>';
    if (mode === 'mini') return '<div class="td-card lg-mini">' + head + meta + '</div>';
    var h;
    if (mode === 'compact') {
      var tp = focus ? dayPts(focus, t).t : 0;
      h = '<details class="td-card lg-c"><summary>' + head + '<div class="lg-sum"><span>' + (focus ? 'Hôm nay con được <b>' + tp + '/15</b> điểm' : '') + '</span><span class="lg-more">Xem chi tiết ▾</span></div></summary>' + meta;
    } else h = '<div class="td-card">' + head + meta;
    if (focus) {
      var p = dayPts(focus, t);
      h += '<div class="lg-today">' + Object.keys(TODAY_LBL).map(function (key) {
        var L = TODAY_LBL[key], got = p[key], hint = '';
        if (!got) {
          if (key === 'sub' || key === 'more') hint = ' (' + p.sq + '/' + (key === 'more' ? p.goal * 2 : p.goal) + ' câu)';
          if (key === 'acc') hint = p.q >= 20 ? ' (đang ' + p.pct + '%)' : ' (cần làm từ 20 câu)';
          if (key === 'chest') hint = ' (' + Math.min(p.ch.nw, p.ch.need) + '/' + p.ch.need + ' từ · ' + (p.ch.rv ? 'ôn ✓' : 'chưa ôn') + ' · ' + Math.min(p.ch.pr, 2) + '/2 luyện · ' + Math.min(p.ch.ls, 1) + '/1 nói)';
        }
        return '<span class="' + (got ? 'ok' : '') + '">' + (got ? '✅ ' : '') + L[0] + ' ' + L[1] + ' <b>' + (got ? '+' + got : '+' + L[2]) + '</b>' + hint + '</span>';
      }).join('') + '</div>' + (mode === 'compact' ? '' : '<div class="lg-meta">Hôm nay con đã được <b>' + p.t + '/15</b> điểm.</div>');
      var prev = D.lg[addD(wk, -7)], pv = prev ? (prev.s[focus] || 0) : null;
      if (pv != null) { var nowS = s[focus], diff = nowS - pv; h += '<div class="lg-self">' + (diff >= 0 ? '🔥 Con đã hơn cả tuần trước của chính mình (' + pv + ' điểm) <b>+' + diff + '</b>!' : '📈 Tuần trước con được <b>' + pv + '</b> điểm, còn <b>' + (-diff) + '</b> điểm nữa là bằng.') + '</div>'; }
    }
    var lw = addD(wk, -7), L = D.lg[lw];
    if (L) {
      var w = L.win || [];
      h += '<div class="lg-last">Tuần trước: ' + KIDS.map(function (k) { return esc(nameOf(k)) + ' <b>' + (L.s[k] || 0) + '</b>'; }).join(' – ') + ' · ' +
        (w.length ? '🏆 ' + w.map(nameOf).map(esc).join(' và ') + ' vô địch (+' + CUP + ' ⭐)' : 'chưa ai đạt ' + WIN_MIN + ' điểm để nhận cúp') +
        ((L.good || []).length ? ' · 💪 ' + L.good.map(nameOf).map(esc).join(', ') + ' làm tốt (+' + GOOD + ' ⭐)' : '') +
        ((L.sh || []).length ? ' · 🛡️ ' + L.sh.map(nameOf).map(esc).join(', ') + ' được 1 khiên' : '') + '</div>';
    }
    h += '<div class="lg-meta">Tủ cúp: ' + KIDS.map(function (k) { return esc(nameOf(k)) + ' ' + (cupsOf(k) ? '🏆×' + cupsOf(k) : '—') + ' · khiên 🛡️ ' + shieldHave(k); }).join(' &nbsp;|&nbsp; ') + '</div>';
    if (withHist) {
      var ws = Object.keys(D.lg).sort().reverse().slice(0, 8);
      if (ws.length) h += '<div style="overflow-x:auto"><table class="lg-hist"><tr><th>Tuần</th>' + KIDS.map(function (k) { return '<th>' + esc(nameOf(k)) + '</th>'; }).join('') + '<th>Kết quả</th></tr>' + ws.map(function (x) {
        var d = D.lg[x]; return '<tr><td>' + dm(x) + '–' + dm(addD(x, 6)) + '</td>' + KIDS.map(function (k) { return '<td>' + (d.s[k] || 0) + '</td>'; }).join('') + '<td>' + ((d.win || []).length ? '🏆 ' + d.win.map(nameOf).map(esc).join(', ') : '—') + ((d.good || []).length ? ' · 💪 ' + d.good.map(nameOf).map(esc).join(', ') : '') + ((d.sh || []).length ? ' · 🛡️ ' + d.sh.map(nameOf).map(esc).join(', ') : '') + '</td></tr>';
      }).join('') + '</table></div>';
    }
    h += '<details><summary>📜 Luật đấu trường</summary><ul>' +
      '<li>Mỗi bạn được chấm theo <b>mục tiêu riêng của mình</b>, nên bạn lớn hay bạn nhỏ đều có cơ hội như nhau.</li>' +
      '<li>Mỗi ngày tối đa <b>15 điểm</b>: 📘 học đủ bài tiếng Anh +5 · 🧮 đạt mục tiêu môn chính (Toán/Tiếng Việt hoặc Toán/Ngữ văn ' + D.goal.anhphong + ' câu; bạn chưa có bài Toán/Tiếng Việt thì làm đủ 4 việc tiếng Anh) +4 · 🎯 đúng từ 90% (từ 80%: +1) +2 · 🎁 đủ điều kiện rương báu +2 · 💪 làm gấp đôi mục tiêu (hoặc 4 bài luyện thêm tiếng Anh) +2.</li>' +
      '<li>Tuần chốt hết Chủ nhật. Bạn đạt từ ' + WIN_MIN + ' điểm: hạng 1 đến 6 lần lượt <b>+' + XU.rank.join(' / +') + ' xu</b>; hạng 1 được thêm <b>🎁 1 rương đồ từ Hiếm trở lên</b>, hạng 2 được <b>🎁 1 rương đồ Thường</b> (mở trong 🐾 Nuôi thú). Bạn tăng điểm nhiều nhất so với tuần trước (từ ' + XU.progMin + ' điểm) được <b>+' + XU.prog + ' xu</b>. Cả nhóm cộng lại từ ' + XU.teamMin + ' điểm: mỗi bạn <b>+' + XU.team + ' xu</b>.</li>' +
      (focus && famOf(focus) ? '<li>Riêng trong nhà: con nhiều điểm hơn (từ ' + WIN_MIN + ' điểm) nhận <b>cúp +' + CUP + ' sao</b>; không vô địch nhưng từ ' + GOOD_MIN + ' điểm được <b>+' + GOOD + ' sao</b>.</li>' : '') +
      '<li>Tuần nào đạt từ <b>' + SHIELD_MIN + ' điểm</b> được thưởng <b>1 khiên 🛡️</b> (giữ tối đa ' + SHIELD_MAX + '). Lỡ nghỉ một ngày, khiên tự giữ chuỗi ngày học 🔥.</li></ul></details>' + (mode === 'compact' ? '</details>' : '</div>');
    return h;
  }

  /* ---------- Nhiệm vụ hôm nay ---------- */
  function tasks(kid) {
    var t = today(), r = D.vd[kid][t] || {}, ch = chestCheck(r, D.pl[kid], t, kid), sj = D.sj[kid][t] || { q: 0 }, g = D.goal[kid];
    var subApp = appOf(kid), sub = subApp === 'lop2' ? 'Toán / Tiếng Việt lớp 2' : subApp === 'lop3' ? 'Toán / Tiếng Việt lớp 3' : subApp === 'lop1' ? 'Toán / Tiếng Việt lớp 1' : subApp === 'lop5' ? 'Toán / Tiếng Việt lớp 5' : subApp === 'lop7' ? 'Toán / Ngữ văn lớp 7' : 'Toán / Ngữ văn lớp 6';
    return [
      { ic: '📘', t: 'Học ' + ch.need + ' từ mới', sub: ch.part ? 'Còn bước kiểm tra từ mới, làm nốt nhé!' : '', n: Math.min(ch.nw, ch.need), of: ch.need, app: 'tuvung' },
      { ic: '🔁', t: 'Ôn tập từ cũ', n: ch.rv ? 1 : 0, of: 1, app: 'tuvung' },
      { ic: '🎯', t: '2 bài luyện thêm', n: Math.min(ch.pr, 2), of: 2, app: 'tuvung' },
      { ic: '🗣️', t: '1 bài nghe & nói', n: Math.min(ch.ls, 1), of: 1, app: 'tuvung' },
      subApp ? { ic: subIc(kid), t: g + ' câu ' + sub, n: Math.min(sj.q, g), of: g, app: subApp } : null,
      { ic: r.chest ? '🪙' : '🎁', t: 'Mở rương báu', n: r.chest ? 1 : 0, of: 1, app: 'tuvung', bonus: true, lock: !ch.ok && !r.chest }
    ].filter(Boolean);
  }
  function missionHtml(kid) {
    if (!D) return ''; css();
    var L = tasks(kid), main = L.filter(function (x) { return !x.bonus; }), done = main.filter(function (x) { return x.n >= x.of; }).length;
    var pct = Math.round(done / main.length * 100);
    return '<div class="td-card ms"><div class="ms-h"><div class="ms-ring" style="--p:' + pct + '"><b>' + done + '/' + main.length + '</b></div><div class="ms-ht"><h3>🎯 Nhiệm vụ hôm nay</h3><div class="ms-sub">' +
      (done === main.length ? 'Con đã làm xong hết! Giỏi quá! 🎉' : 'Còn <b>' + (main.length - done) + ' việc</b> nữa. Bấm vào việc nào là làm việc đó nhé!') + '</div></div>' +
      '<button class="ms-say" type="button" aria-label="Đọc to nhiệm vụ">🔊</button></div><div class="ms-list">' +
      L.map(function (x) {
        var ok = x.n >= x.of;
        return '<button class="ms-it' + (ok ? ' ok' : '') + (x.bonus ? ' bonus' : '') + (x.lock ? ' lock' : '') + '" data-app="' + x.app + '"><span class="ms-ck">' + (ok ? '✓' : x.lock ? '🔒' : '') + '</span><span class="ms-ic">' + x.ic + '</span><span class="ms-t">' + x.t + (x.sub && !ok ? ' <small>' + x.sub + '</small>' : '') +
          (x.bonus ? ' <small>' + (ok ? 'đã mở' : x.lock ? 'làm xong 4 việc tiếng Anh để mở' : (famOf(kid) ? 'đã mở được rồi, vào lấy sao nào!' : 'đã mở được rồi, vào lấy xu nào!')) + '</small>' : '') + '</span><span class="ms-n">' + (x.of > 1 ? x.n + '/' + x.of : ok ? 'Xong' : '') + '</span></button>';
      }).join('') + '</div></div>';
  }
  function missionSpeech(kid) {
    var L = tasks(kid).filter(function (x) { return !x.bonus && x.n < x.of; });
    var nm = nameOf(kid);
    if (!L.length) return 'Chào ' + nm + '. Hôm nay con đã làm xong hết nhiệm vụ rồi. Giỏi quá!';
    return 'Chào ' + nm + '. Hôm nay con còn ' + L.length + ' việc: ' + L.map(function (x) { return x.t.replace('/', ' và '); }).join('. ') + '.';
  }
  function say(text) {
    try {
      var ss = window.speechSynthesis; if (!ss) return; ss.cancel();
      var u = new SpeechSynthesisUtterance(text); u.lang = 'vi-VN'; u.rate = 0.95;
      var v = (ss.getVoices() || []).filter(function (x) { return /^vi/i.test(x.lang); })[0]; if (v) u.voice = v;
      ss.speak(u);
    } catch (e) { }
  }

  /* ---------- Cảnh báo cho bố mẹ ---------- */
  function alerts() {
    if (!D) return []; var out = [], t = today();
    KIDS.forEach(function (k) {
      var nm = nameOf(k), vd = D.vd[k], sj = D.sj[k], g = D.goal[k], sub = subN(k, 1);
      function lastDay(f) { for (var i = 0; i < 30; i++) { var d = addD(t, -i); if (f(d)) return i; } return 30; }
      var en = lastDay(function (d) { return dayDone(vd[d]); }), sb = lastDay(function (d) { return sj[d] && sj[d].q > 0; });
      if (en >= 2) out.push(['warn', nm + ' đã <b>' + (en >= 30 ? 'hơn 30' : en) + ' ngày</b> chưa học đủ bài tiếng Anh' + (en >= 30 ? '' : ' (lần gần nhất: ' + dm(addD(t, -en)) + ')') + '.']);
      if (sb >= 3) out.push(['warn', nm + ' đã <b>' + (sb >= 30 ? 'hơn 30' : sb) + ' ngày</b> chưa làm bài ' + sub + '.']);
      // độ chính xác 3 ngày gần nhất
      var q = 0, c = 0; for (var i = 1; i <= 3; i++) { var d = addD(t, -i), r = vd[d] || {}, x = sj[d] || { q: 0, c: 0 }; q += (+r.q || 0) + x.q; c += (+r.ok || 0) + x.c; }
      if (q >= 30 && c / q < 0.8) out.push(['warn', nm + ' làm đúng <b>' + Math.round(c / q * 100) + '%</b> trong 3 ngày qua, thấp hơn mức 80%. Nên cùng con xem lại các câu sai.']);
      // bài làm dở
      var part = (D.pl[k] || []).filter(function (e) { return e && e.t && e.total > 0 && e.done < e.total && (Date.now() - e.t) < 3 * 864e5; }).length;
      if (part >= 2) out.push(['info', nm + ' bỏ dở <b>' + part + ' bài</b> luyện tập trong 3 ngày qua (bài làm dở không được tính).']);
      // từ hay sai 7 ngày
      var wl = WORDS && (WORDS.filter(function (x) { return x.id === k; })[0] || {}).words, cnt = {};
      (D.pl[k] || []).forEach(function (e) { if (e && e.t && (Date.now() - e.t) < 7 * 864e5 && e.wrong) Object.keys(e.wrong).forEach(function (n) { cnt[n] = (cnt[n] || 0) + e.wrong[n]; }); });
      var top = Object.keys(cnt).filter(function (n) { return cnt[n] >= 2; }).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 6);
      if (top.length && wl) out.push(['info', nm + ' hay sai các từ: ' + top.map(function (n) { var w = wl[n - 1]; return w ? '<b>' + esc(w[0]) + '</b> (' + esc(w[1]) + ') ×' + cnt[n] : ''; }).filter(Boolean).join(', ') + '.']);
      // so tuần trước (cùng số ngày)
      var wk = monday(t), lw = addD(wk, -7), di = Math.round((parse(t) - parse(wk)) / 864e5), a = 0, b = 0;
      for (var j = 0; j <= di; j++) { a += dayPts(k, addD(wk, j)).t; b += dayPts(k, addD(lw, j)).t; }
      if (b >= 10 && a < b * 0.7) out.push(['warn', nm + ' tuần này được <b>' + a + ' điểm</b>, thấp hơn cùng kỳ tuần trước (' + b + ' điểm).']);
      if (en === 0 && lastDay(function (d) { return !dayDone(vd[d]); }) >= 5) out.push(['good', nm + ' học tiếng Anh đều đặn nhiều ngày liền. 👍']);
    });
    return out;
  }
  function alertsHtml() {
    if (!D) return ''; css(); var A = alerts();
    var nW = A.filter(function (a) { return a[0] === 'warn'; }).length;
    var sm = nW ? '<b class="pc-w">⚠️ ' + nW + ' việc cần chú ý</b>' : A.length ? A.length + ' ghi chú' : '✅ Mọi thứ đều ổn';
    return '<details class="td-card al pcol" data-k="al"' + (OPEN.al ? ' open' : '') + '><summary><h3>🔔 Cần bố mẹ để ý</h3><span class="pc-s">' + sm + '<span class="pc-m"></span></span></summary>' + (A.length ? A.map(function (a) { return '<div class="al-it ' + a[0] + '">' + (a[0] === 'warn' ? '⚠️' : a[0] === 'good' ? '✅' : 'ℹ️') + ' <span>' + a[1] + '</span></div>'; }).join('') : '<div class="al-it good">✅ <span>Mọi thứ đều ổn, hai con đang học đều.</span></div>') + '</details>';
  }

  /* ---------- chúc mừng ---------- */
  function confetti() { var em = ['🎉', '⭐', '✨', '🎊', '🌟', '🏆']; for (var i = 0; i < 40; i++) { var s = document.createElement('span'); s.className = 'td-cf'; s.textContent = em[i % em.length]; s.style.left = Math.random() * 100 + 'vw'; s.style.fontSize = (16 + Math.random() * 20) + 'px'; s.style.animationDuration = (2 + Math.random() * 1.6) + 's'; s.style.animationDelay = Math.random() * .8 + 's'; document.body.appendChild(s); (function (x) { setTimeout(function () { x.remove(); }, 4600); })(s); } }
  var Q = [];
  function pop(big, title, lines) { Q.push([big, title, lines]); if (Q.length === 1) showPop(); }
  /* nhiều thành tích cùng lúc: một bảng tổng kết duy nhất */
  function popMany(items) {
    if (!items.length) return; if (items.length === 1) { pop(items[0][0], items[0][1], items[0][2]); return; }
    pop('🎉', 'Con vừa đạt được ' + items.length + ' điều tuyệt vời!', items.map(function (x) { return '<span class="pm-row"><span class="pm-ic">' + x[0] + '</span><span><b>' + x[1] + '</b><br><small>' + x[2].join(' ') + '</small></span></span>'; }));
  }
  function showPop() {
    if (!Q.length) return; css(); var x = Q[0], el = document.createElement('div'); el.className = 'td-pop';
    el.innerHTML = '<div class="td-box"><div class="big">' + x[0] + '</div><b class="t">' + x[1] + '</b>' + x[2].map(function (l) { return '<p>' + l + '</p>'; }).join('') + '<button>Tuyệt vời! 🎉</button></div>';
    el.querySelector('button').onclick = function () { el.remove(); Q.shift(); setTimeout(showPop, 250); };
    document.body.appendChild(el); confetti();
  }
  /* gọi khi bé vào trang của mình: báo linh vật lớn, cúp/khiên tuần trước */
  function celebrate(kid) {
    if (!D) return;
    var seen = lsGet('td_seen_v1', {}), me = seen[kid] || (seen[kid] = {}), p = pet(kid), changed = false;
    var items = [];
    if (me.pet == null) { me.pet = p.i; changed = true; }
    else if (p.i !== me.pet) { me.pet = p.i; changed = true; }  // lễ lên cấp đã có trong 🐾 Nuôi thú, không báo lại ở đây
    var lw = addD(monday(today()), -7), L = D.lg[lw];
    if (L && me.wk !== lw) {
      me.wk = lw; changed = true;
      var won = (L.win || []).indexOf(kid) >= 0, gd = (L.good || []).indexOf(kid) >= 0, sh = (L.sh || []).indexOf(kid) >= 0;
      if (won) items.push(['🏆', 'Con vô địch tuần!', ['Tuần ' + dm(lw) + '–' + dm(addD(lw, 6)) + ': <b>' + L.s[kid] + ' điểm</b>, thưởng <b>+' + CUP + ' sao</b>.']]);
      if (gd) items.push(['💪', 'Con làm tốt tuần qua!', ['Con đạt <b>' + L.s[kid] + ' điểm</b>, thưởng <b>+' + GOOD + ' sao</b>.']]);
      if (sh) items.push(['🛡️', 'Con nhận được 1 khiên!', ['Khiên tự giữ chuỗi ngày học nếu con lỡ nghỉ một ngày.']]);
    }
    if (changed) { seen[kid] = me; lsSet('td_seen_v1', seen); }
    popMany(items);
  }

  /* ---------- chuỗi ngày học (tính cả ngày đã dùng khiên) ---------- */
  function streak(kid) {
    if (!D) return 0; var vd = D.vd[kid] || {}, u = (D.sh[kid] && D.sh[kid].used) || {};
    var ok = function (d) { return dayDone(vd[d]) || !!u[d]; }, d = today(), n = 0;
    if (!ok(d)) d = addD(d, -1);
    while (ok(d) && n < 3650) { n++; d = addD(d, -1); }
    return n;
  }

  function leadTxt(kid) {
    if (!D) return ''; var wk = monday(today()), me = weekPts(kid, wk), o = KIDS.filter(function (k) { return k !== kid; })[0], ot = weekPts(o, wk);
    if (!me && !ot) return ''; if (me > ot) return '👑 đang dẫn'; if (me === ot) return 'đang ngang điểm'; return 'kém ' + (ot - me) + ' điểm';
  }

  /* ---------- Cách chơi ---------- */
  var HOW_CSS = '.hw{max-width:980px;margin:0 auto}.hw-h{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:4px 0 6px}.hw-h h1{margin:0;font-size:28px;flex:1}' +
    '.hw-lead{font-size:18px;color:#334155;margin:0 0 14px;line-height:1.5}' +
    '.hw-main{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.hw-c{background:#fff;border:2px solid #E2E8F0;border-radius:22px;padding:16px 18px;box-shadow:0 4px 0 #E2E8F0}' +
    '.hw-c .ic{font-size:48px;line-height:1}.hw-c h3{margin:8px 0 6px;font-size:21px}.hw-c p{margin:4px 0;font-size:16.5px;line-height:1.5;color:#1E293B}' +
    '.hw-c ul{margin:6px 0 0;padding-left:20px;font-size:16px;line-height:1.6;color:#1E293B}.hw-c li b{color:#B45309}' +
    '.hw-c.s1{background:#FFFBEB;border-color:#FCD34D;box-shadow:0 4px 0 #FCD34D}.hw-c.s2{background:#FFF1F2;border-color:#FDA4AF;box-shadow:0 4px 0 #FDA4AF}.hw-c.s3{background:#EFF6FF;border-color:#93C5FD;box-shadow:0 4px 0 #93C5FD}' +
    '.hw-sub{font-size:20px;margin:22px 2px 10px}.hw-ex{display:grid;grid-template-columns:1fr 1fr;gap:12px}.hw-x{display:flex;gap:12px;align-items:flex-start;background:#fff;border:2px solid #E2E8F0;border-radius:18px;padding:12px 14px}' +
    '.hw-x .ic{font-size:36px;line-height:1;flex:none}.hw-x b{display:block;font-size:17.5px;margin-bottom:2px}.hw-x span{font-size:15.5px;line-height:1.5;color:#334155}' +
    '.hw-day{margin-top:16px;background:#ECFDF5;border:2px solid #86EFAC;border-radius:18px;padding:12px 16px;font-size:17px;line-height:1.5;color:#14532D}' +
    '.hw details{margin-top:14px;background:#fff;border:2px solid #E2E8F0;border-radius:18px;padding:10px 16px;font-size:15.5px}.hw summary{cursor:pointer;font-weight:800;font-size:16.5px}' +
    '@media (max-width:860px){.hw-main{grid-template-columns:1fr}.hw-ex{grid-template-columns:1fr}}@media (max-width:480px){.hw-h h1{font-size:23px}.hw-lead{font-size:16.5px}.hw-c{padding:14px}.hw-c .ic{font-size:40px}}';
  function howHtml(kid) {
    css(); if (!document.getElementById('hwCss')) { var st = document.createElement('style'); st.id = 'hwCss'; st.textContent = HOW_CSS; document.head.appendChild(st); }
    var sub = subN(kid, 2), g = D ? D.goal[kid] : 20;
    var SP = SPECIES[spOf(kid)], mas = SP.e, mn = spOf(kid) === 'egg' ? 'Quả trứng' : SP.n;
    return '<div class="hw"><p class="hw-lead">Con chỉ cần nhớ <b>3 điều chính</b> dưới đây. Mỗi ngày làm hết <b>🎯 Nhiệm vụ hôm nay</b> là con có đủ cả ba!</p>' +
      '<div class="hw-main">' +
      '<div class="hw-c s1"><div class="ic">⭐</div><h3>1. Sao thưởng</h3><p>Sao dùng để <b>đổi quà</b> với bố mẹ. Con nhận sao khi:</p><ul>' +
        '<li>Học từ vựng tiếng Anh, làm đúng nhiều</li><li>Làm bài ' + sub + ' đúng từ 90%</li><li>Mở 🎁 rương báu: <b>5–10 sao</b></li>' +
        '<li>Thắng đấu trường tuần: <b>+' + CUP + ' sao</b></li><li>Làm việc tốt ở nhà: bố mẹ thưởng</li></ul><p style="font-size:15px;color:#64748B">Chưa ngoan thì bố mẹ có thể trừ sao.</p></div>' +
      '<div class="hw-c s2"><div class="ic">🔥</div><h3>2. Chuỗi ngày học</h3><p>Mỗi ngày con học <b>đủ bài tiếng Anh</b> (' + newN(kid) + ' từ mới và ôn tập), chuỗi tăng thêm 1 ngày.</p>' +
        '<p>Nghỉ một ngày thì chuỗi về 0, <b>trừ khi con có khiên 🛡️</b>.</p><p>Chuỗi càng dài, con càng giỏi!</p></div>' +
      '<div class="hw-c s3"><div class="ic">🏆</div><h3>3. Đấu trường tuần</h3><p>Mỗi ngày con được tối đa <b>15 điểm</b>:</p><ul>' +
        '<li>📘 Học đủ bài tiếng Anh: <b>5</b></li><li>' + subIc(kid) + ' Làm ' + g + ' câu ' + subN(kid, 0) + ': <b>4</b> (gấp đôi: thêm <b>2</b>)</li>' +
        '<li>🎯 Làm đúng nhiều: <b>1–2</b></li><li>🎁 Đủ việc mở rương: <b>2</b></li></ul>' +
        '<p>Hết Chủ nhật, ai nhiều điểm hơn (từ ' + WIN_MIN + ' điểm) được <b>cúp +' + CUP + ' sao</b>. Không thắng nhưng đạt từ ' + GOOD_MIN + ' điểm vẫn được <b>+' + GOOD + ' sao</b>.</p></div>' +
      '</div>' +
      '<h2 class="hw-sub">🎈 Quà thêm cho con chăm chỉ</h2><div class="hw-ex">' +
      '<div class="hw-x"><span class="ic">🎁</span><div><b>Rương báu mỗi ngày</b><span>Làm xong 4 việc tiếng Anh (' + newN(kid) + ' từ mới, ôn tập, 2 bài luyện thêm, 1 bài nghe và nói) thì mở được rương, nhận ngẫu nhiên 5 đến 10 sao.</span></div></div>' +
      '<div class="hw-x"><span class="ic">🛡️</span><div><b>Khiên giữ chuỗi</b><span>Tuần nào đạt từ ' + SHIELD_MIN + ' điểm, con được 1 khiên (giữ tối đa ' + SHIELD_MAX + '). Lỡ nghỉ một ngày, khiên tự giữ chuỗi ngày học cho con.</span></div></div>' +
      '<div class="hw-x"><span class="ic">' + mas + '</span><div><b>Nuôi thú</b><span>Học được xu 🪙: học đủ tiếng Anh +15, đạt mục tiêu ' + subN(kid, 0) + ' +10, mở rương +5…+10, mỗi bài làm tốt +2, lần đầu làm tốt một bài +2, học liền 7 ngày +20, xếp hạng tuần +50/+40/+30/+20/+20/+20, thắng thú của bạn +2, thắng quái +1. Vào 🐾 Nuôi thú dùng xu mua thức ăn, cho ăn thì ' + mn + ' lớn lên (9 cấp). Học xong Nhiệm vụ hôm nay được chơi 5 lượt trò chơi cùng thú.</span></div></div>' +
      '<div class="hw-x"><span class="ic">🏅</span><div><b>Huy hiệu và danh hiệu</b><span>Học từ vựng chăm sẽ mở khóa huy hiệu. Đủ điểm huy hiệu thì con lên cấp danh hiệu (7 cấp) và được trang trí khung tên.</span></div></div>' +
      '</div>' +
      '<div class="hw-day">💡 <b>Mẹo:</b> mỗi ngày mở trang của con, xem <b>🎯 Nhiệm vụ hôm nay</b> và bấm vào từng việc để làm. Xong hết là con có sao, chuỗi ngày và điểm thi đua!</div>' +
      (window.BANK && BANK.rulesHtml ? '<details><summary>⭐ Bảng sao chi tiết của môn ' + sub + '</summary><div style="margin-top:8px">' + BANK.rulesHtml(kid) + '</div></details>' : '') +
      '</div>';
  }
  function howSpeech(kid) {
    return 'Cách chơi. Con chỉ cần nhớ 3 điều. Một: sao thưởng, dùng để đổi quà với bố mẹ. Con nhận sao khi học bài, làm đúng, mở rương báu và thắng đấu trường. ' +
      'Hai: chuỗi ngày học. Mỗi ngày học đủ bài tiếng Anh thì chuỗi tăng thêm một ngày. ' +
      'Ba: đấu trường tuần. Mỗi ngày được tối đa 15 điểm. Hết Chủ nhật, ai nhiều điểm hơn được cúp và 30 sao. ' +
      'Mỗi ngày con chỉ cần làm hết nhiệm vụ hôm nay là có đủ cả ba.';
  }

  /* ---------- Báo cáo tuần cho bố mẹ ---------- */
  function weekRange(wk) { var t = today(), out = []; for (var i = 0; i < 7; i++) { var k = addD(wk, i); if (k > t) break; out.push(k); } return out; }
  function kidWeek(kid, wk) {
    var days = weekRange(wk), vd = D.vd[kid], sj = D.sj[kid], g = D.goal[kid], inW = function (t) { return t && days.indexOf(dayOf(t)) >= 0; };
    var o = { days: days.length, act: 0, en: 0, newW: [], vq: 0, vc: 0, sec: 0, pr: 0, ls: 0, part: 0, sq: 0, sc: 0, goalDays: 0, wrong: {}, lessons: {}, tests: [], pts: weekPts(kid, wk) };
    var pl = (D.pl[kid] || []).filter(function (e) { return e && inW(e.t); });
    days.forEach(function (k) {
      var r = vd[k], s = sj[k], any = false;
      if (r) { if (dayDone(r)) o.en++; (r.new || []).forEach(function (n) { if (o.newW.indexOf(n) < 0) o.newW.push(n); }); o.vq += +r.q || 0; o.vc += +r.ok || 0; o.sec += +r.sec || 0; if ((r.new || []).length || r.q || r.reviewDone) any = true; }
      if (s && s.q) { o.sq += s.q; o.sc += s.c; any = true; if (s.q >= g) o.goalDays++; }
      if (pl.some(function (e) { return dayOf(e.t) === k; })) any = true;
      if (any) o.act++;
    });
    pl.forEach(function (e) {
      var full = e.total > 0 && e.done >= e.total;
      if (!full && e.total > 0) o.part++; else if (e.type === 'ls') o.ls++; else o.pr++;
      if (e.wrong) Object.keys(e.wrong).forEach(function (n) { o.wrong[n] = (o.wrong[n] || 0) + e.wrong[n]; });
    });
    var vv = vvDoc(kid);
    if (vv) {
      (vv.rounds || []).forEach(function (r) { if (!Array.isArray(r) || !inW(r[0])) return; var x = o.lessons[r[2]] || (o.lessons[r[2]] = { c: 0, n: 0, x: 0 }); x.c += +r[3] || 0; x.n += +r[4] || 0; x.x++; });
      (vv.tests || []).forEach(function (r) { if (Array.isArray(r) && inW(r[0])) o.tests.push({ s: r[2] === 'toan' ? 'Toán' : 'Tiếng Việt', c: +r[4] || 0, n: +r[3] || 0, d: dayOf(r[0]) }); });
    }
    if (appOf(kid) === 'lop6' && D.l6) {
      Object.keys(D.l6.items || {}).forEach(function (sid) { var it = D.l6.items[sid]; if (!it || !inW(it.u)) return; var lid = sid.split(':')[0], x = o.lessons[lid] || (o.lessons[lid] = { c: 0, n: 0, x: 0 }); x.n++; });
      (D.l6.tests || []).forEach(function (t) { if (t && inW(t.at)) o.tests.push({ s: t.subj === 'toan' ? 'Toán' : 'Ngữ văn', c: +t.c || 0, n: +t.n || 0, d: dayOf(t.at) }); });
    }
    // sao trong tuần
    var a = parse(wk).getTime(), b = parse(addD(wk, 7)).getTime(), plus = 0, minus = 0;
    function addS(e) { if (!e || !(e.t >= a && e.t < b) || /^📌/.test(String(e.r))) return; if (e.v > 0) plus += e.v; else if (e.v < 0) minus += e.v; }
    try { BANK.vocabLed(kid).forEach(addS); BANK.extList(kid).forEach(addS); } catch (e) { }
    o.plus = plus; o.minus = minus;
    return o;
  }
  function pctTxt(c, n) { return n ? Math.round(c / n * 100) + '%' : '–'; }
  function weekReportHtml(wk, nameFns) {
    if (!D) return ''; css(); nameFns = nameFns || {};
    var cur = monday(today()); wk = wk || cur;
    var isCur = wk === cur, L = D.lg[wk];
    var cards = KIDS.map(function (k) {
      var o = kidWeek(k, wk), wl = WORDS && (WORDS.filter(function (x) { return x.id === k; })[0] || {}).words, sub = subN(k, 1);
      var words = o.newW.slice().sort(function (x, y) { return x - y; }).map(function (n) { var w = wl && wl[n - 1]; return w ? esc(w[0]) : '#' + n; });
      var wr = Object.keys(o.wrong).sort(function (x, y) { return o.wrong[y] - o.wrong[x]; }).slice(0, 6).map(function (n) { var w = wl && wl[n - 1]; return w ? '<b>' + esc(w[0]) + '</b> (' + esc(w[1]) + ') ×' + o.wrong[n] : ''; }).filter(Boolean);
      var ap = appOf(k), nm = ap === 'lop2' ? nameFns.l2 : ap === 'lop6' ? nameFns.l6 : ap === 'lop3' ? nameFns.l3 : null;
      var les = Object.keys(o.lessons).map(function (id) { var x = o.lessons[id]; return '<li>' + (nm ? nm(id) : esc(id)) + ' <span class="wr-mu">(' + (L2F[ap] ? (x.x > 1 ? x.x + ' lượt, ' : '') + x.c + '/' + x.n : x.n + ' câu') + ')</span></li>'; });
      var res = L ? ((L.win || []).indexOf(k) >= 0 ? '🏆 Vô địch (+' + CUP + ' ⭐)' : (L.good || []).indexOf(k) >= 0 ? '💪 Làm tốt (+' + GOOD + ' ⭐)' : '') + ((L.sh || []).indexOf(k) >= 0 ? ' · 🛡️ +1 khiên' : '') : '';
      // nhận xét tự động
      var vp = o.vq ? o.vc / o.vq : null, spp = o.sq ? o.sc / o.sq : null, good = [], need = [];
      if (o.en >= Math.max(1, o.days - 1)) good.push('học tiếng Anh đều (' + o.en + '/' + o.days + ' ngày)'); else if (o.days >= 3 && o.en <= o.days / 2) need.push('học tiếng Anh chưa đều (' + o.en + '/' + o.days + ' ngày đủ bài)');
      if (o.goalDays >= Math.max(1, o.days - 1)) good.push('đạt mục tiêu ' + sub + ' ' + o.goalDays + ' ngày'); else if (o.days >= 3 && o.goalDays <= o.days / 2) need.push('làm ' + sub + ' còn ít (' + o.goalDays + '/' + o.days + ' ngày đạt mục tiêu)');
      if (vp != null && o.vq >= 20) { if (vp >= 0.9) good.push('tiếng Anh đúng ' + pctTxt(o.vc, o.vq)); else if (vp < 0.8) need.push('tiếng Anh mới đúng ' + pctTxt(o.vc, o.vq) + ', nên ôn lại các từ hay sai'); }
      if (spp != null && o.sq >= 20) { if (spp >= 0.9) good.push(sub + ' đúng ' + pctTxt(o.sc, o.sq)); else if (spp < 0.8) need.push(sub + ' mới đúng ' + pctTxt(o.sc, o.sq) + ', nên cùng con xem lại câu sai'); }
      if (o.part >= 2) need.push('bỏ dở ' + o.part + ' bài luyện');
      return '<div class="wr-k ' + k + '"><div class="wr-hd">' + plate(k) + '<span class="wr-pt">🏆 ' + o.pts + '<small>/105 điểm</small></span></div>' +
        (res ? '<div class="wr-res">' + res + '</div>' : '') +
        '<div class="wr-stats"><div><b>' + o.act + '/' + o.days + '</b><small>ngày có học</small></div><div><b>' + o.en + '</b><small>ngày đủ tiếng Anh</small></div><div><b>' + o.newW.length + '</b><small>từ mới</small></div>' +
        '<div><b>' + (o.plus ? '+' + o.plus : 0) + (o.minus ? ' / ' + o.minus : '') + '</b><small>sao trong tuần</small></div></div>' +
        '<h4>📘 Tiếng Anh</h4><ul><li>' + (o.vq ? o.vq + ' câu, đúng <b>' + pctTxt(o.vc, o.vq) + '</b>' + (o.sec ? ', khoảng ' + Math.round(o.sec / 60) + ' phút' : '') : 'Chưa làm câu nào') + '</li>' +
        '<li>Luyện thêm <b>' + o.pr + '</b> bài · Nghe và nói <b>' + o.ls + '</b> bài' + (o.part ? ' · <span class="wr-warn">làm dở ' + o.part + ' bài</span>' : '') + '</li>' +
        (words.length ? '<li>Từ mới: ' + words.join(', ') + '</li>' : '') + (wr.length ? '<li>Hay sai: ' + wr.join(', ') + '</li>' : '') + '</ul>' +
        '<h4>' + subIc(k) + ' ' + sub + '</h4><ul><li>' + (o.sq ? o.sq + ' câu, đúng <b>' + pctTxt(o.sc, o.sq) + '</b> · đạt mục tiêu ' + D.goal[k] + ' câu: <b>' + o.goalDays + '/' + o.days + '</b> ngày' : 'Chưa làm bài') + '</li>' +
        (o.tests.length ? '<li>Kiểm tra: ' + o.tests.map(function (t) { return t.s + ' ' + t.c + '/' + t.n + ' (' + dm(t.d) + ')'; }).join(' · ') + '</li>' : '') + '</ul>' +
        (les.length ? '<details><summary>Các bài đã học (' + les.length + ')</summary><ul>' + les.join('') + '</ul></details>' : '') +
        '<div class="wr-nx">' + (good.length ? '<div class="g">👍 ' + good.join('; ') + '.</div>' : '') + (need.length ? '<div class="n">👉 Cần cố gắng: ' + need.join('; ') + '.</div>' : '') + (!good.length && !need.length ? '<div class="mu">Chưa đủ dữ liệu để nhận xét.</div>' : '') + '</div></div>';
    }).join('');
    var canPrev = addD(wk, -7) >= addD(cur, -56), canNext = !isCur;
    var sm = KIDS.map(function (k) { return '<span class="pc-k">' + esc(nameOf(k)) + ' <b>' + weekPts(k, wk) + '</b> điểm</span>'; }).join('');
    return '<details class="td-card wr pcol" data-k="wr"' + (OPEN.wr ? ' open' : '') + '><summary><h3>📅 Báo cáo tuần <small>' + dm(wk) + ' – ' + dm(addD(wk, 6)) + (isCur ? ' · tuần này, tính đến hôm nay' : '') + '</small></h3><span class="pc-s">' + sm + '<span class="pc-m"></span></span></summary><div class="wr-top">' +
      '<span class="wr-nav"><button type="button" data-wk="' + addD(wk, -7) + '"' + (canPrev ? '' : ' disabled') + '>◀ Tuần trước</button><button type="button" data-wk="' + addD(wk, 7) + '"' + (canNext ? '' : ' disabled') + '>Tuần sau ▶</button></span></div>' +
      '<div class="wr-grid">' + cards + '</div></details>';
  }
  /* Góc bố mẹ: các thẻ rút gọn, bấm vào mới mở; nhớ thẻ đang mở khi vẽ lại */
  var OPEN = { al: false, wr: false };
  document.addEventListener('toggle', function (e) { var t = e.target; if (t && t.classList && t.classList.contains('pcol')) OPEN[t.dataset.k] = t.open; }, true);
  CSS += '.pcol>summary{list-style:none;cursor:pointer;display:flex;align-items:center;flex-wrap:wrap;gap:4px 12px;min-height:44px;touch-action:manipulation}.pcol>summary::-webkit-details-marker{display:none}' +
    '.pcol>summary h3{margin:0;flex:1 1 220px}.pc-s{display:flex;align-items:center;flex-wrap:wrap;gap:4px 14px;font-size:15px;color:#334155}.pc-k{white-space:nowrap}.pc-m,.pc-w{white-space:nowrap}.pc-w{color:#B45309}' +
    '.pc-m::after{content:"Xem chi tiết ▾";font-weight:700;color:#2563EB;font-size:14px;white-space:nowrap}.pcol[open] .pc-m::after{content:"Thu gọn ▴"}.pcol[open]>summary{margin-bottom:8px}.wr .wr-top{justify-content:flex-end}';
  CSS += '.wr-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.wr-top h3{flex:1 1 240px;margin:0}.wr-nav{display:flex;gap:8px}.wr-nav button{min-height:44px;padding:0 14px;border-radius:12px;border:2px solid #E2E8F0;background:#fff;font-weight:700;font-size:15px;font-family:inherit;color:#1E293B;touch-action:manipulation}.wr-nav button:disabled{opacity:.4}' +
    '.wr-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px}.wr-k{border:2px solid #E2E8F0;border-radius:18px;padding:12px 14px;font-size:15px;line-height:1.5}.wr-k.anhphong{border-color:#FDBA74}.wr-k.thanhnghi{border-color:#86EFAC}' +
    '.wr-hd{display:flex;align-items:center;justify-content:space-between;gap:8px}.wr-pt{font-weight:800;font-size:18px;white-space:nowrap}.wr-pt small{font-size:12px;color:#64748B;font-weight:600}.wr-res{margin-top:6px;font-weight:700;color:#B45309}' +
    '.wr-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0 4px}.wr-stats div{background:#F8FAFC;border-radius:12px;padding:6px;text-align:center}.wr-stats b{display:block;font-size:19px}.wr-stats small{display:block;font-size:12px;color:#64748B;line-height:1.25}' +
    '.wr-k h4{margin:10px 0 2px;font-size:16px}.wr-k ul{margin:2px 0;padding-left:20px}.wr-mu{color:#64748B}.wr-warn{color:#B45309;font-weight:700}.wr-k details{margin-top:6px}' +
    '.wr-nx{margin-top:10px}.wr-nx div{border-radius:12px;padding:6px 10px;margin-top:6px}.wr-nx .g{background:#ECFDF5;color:#14532D}.wr-nx .n{background:#FFF7ED;color:#7C2D12}.wr-nx .mu{color:#64748B}' +
    '@media (max-width:760px){.wr-grid{grid-template-columns:1fr}}@media (max-width:480px){.wr-nav{width:100%}.wr-nav button{flex:1}.wr-stats b{font-size:17px}.wr-k{padding:10px 12px}}';

  window.THIDUA = {
    load: load, onUpdate: function (f) { subs.push(f); }, data: function () { return D; },
    chestXu: chestXu, rankChests: rankChests, pet: pet, xu: function (k) { return D ? xpParts(k).xp : 0; }, picOf: picOf, SPECIES: SPECIES, spOf: spOf, tcOf: tcOf, tasks: function (k) { return D ? tasks(k) : []; }, petHtml: petHtml, petScene: petScene, petLine: petLine, missionHtml: missionHtml, missionSpeech: missionSpeech, say: say, alertsHtml: alertsHtml, leagueHtml: leagueHtml, celebrate: celebrate, shieldHave: function (k) { return D ? shieldHave(k) : 0; },
    weekPts: function (k) { return D ? weekPts(k, monday(today())) : 0; }, chestCheck: chestCheck,
    streak: streak, leadTxt: leadTxt, howHtml: howHtml, howSpeech: howSpeech, weekReportHtml: weekReportHtml, monday: function () { return monday(today()); },
    RULE: { RK_FROM: RK_FROM, START: START, CUP: CUP, WIN_MIN: WIN_MIN, SHIELD_MIN: SHIELD_MIN, SHIELD_MAX: SHIELD_MAX, NEWW: NEWW }
  };
})();
