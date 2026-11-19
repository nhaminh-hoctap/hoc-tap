/* ============================================================
   THI ĐUA: Đấu trường tuần · Linh vật lớn lên · Khiên giữ chuỗi
   - Mỗi bé được chấm theo MỤC TIÊU RIÊNG của mình (tối đa 15 điểm/ngày, 105 điểm/tuần)
   - Tuần chốt vào hết Chủ nhật; trang chính tự chốt khi mở vào tuần sau:
       ghi league/<thứ Hai>, trao cúp (+30 sao) cho bé thắng, +1 khiên cho bé đạt từ 75 điểm
   - Linh vật lớn lên theo năng lượng ⚡ tích lũy từ các ngày học
   ============================================================ */
(function () {
  'use strict';
  if (window.THIDUA) return;
  var START = '2026-11-16', CUP = 30, WIN_MIN = 50, SHIELD_MIN = 75, SHIELD_MAX = 2, NEWW = 5;
  var GOOD = 15, GOOD_MIN = 60; // bé không vô địch nhưng đạt từ 60 điểm: +15 sao
  var KIDS = ['anhphong', 'thanhnghi'];
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

  /* Rương báu: đủ 5 từ mới + ôn tập + 2 bài luyện thêm trọn vẹn + 1 bài nghe & nói trọn vẹn */
  function chestCheck(r, plog, k) {
    var lg = (plog || []).filter(function (e) { return e && e.t && dayOf(e.t) === k && e.total > 0 && e.done >= e.total; });
    var nw = (r && r.new || []).length, rv = !!(r && (r.reviewDone || r.done));
    var pr = lg.filter(function (e) { return e.type !== 'ls'; }).length, ls = lg.filter(function (e) { return e.type === 'ls'; }).length;
    return { nw: nw, rv: rv, pr: pr, ls: ls, ok: nw >= NEWW && rv && pr >= 2 && ls >= 1 };
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
      await BANK.ready; var db = BANK.db; if (!db) { LOADING = null; return D; }
      var R = await Promise.all([
        readDoc(db, 'sync/vocab_daily_v1.anhphong'), readDoc(db, 'sync/vocab_practice_log_v1.anhphong'),
        readDoc(db, 'sync/vocab_daily_v1.thanhnghi'), readDoc(db, 'sync/vocab_practice_log_v1.thanhnghi'),
        readDoc(db, 'data/users/gia-dinh/sync'), readDoc(db, 'tien-do/hoc-sinh'),
        readDoc(db, 'sync/vocab_shield_v1.anhphong'), readDoc(db, 'sync/vocab_shield_v1.thanhnghi'),
        db.collection('league').get().catch(function () { return null; }),
        WORDS || fetch('words.json').then(function (r) { return r.json(); }).catch(function () { return null; })]);
      if (R[9]) WORDS = R[9];
      var lg = {}; if (R[8]) R[8].docs.forEach(function (d) { var x = d.data(); if (x && x.wk) lg[x.wk] = x; });
      var n = {
        vd: { anhphong: (R[0] && R[0].days) || {}, thanhnghi: (R[2] && R[2].days) || {} },
        pl: { anhphong: R[1] || [], thanhnghi: R[3] || [] }, l2: R[4], l6: R[5], lg: lg,
        sh: { anhphong: R[6] || {}, thanhnghi: R[7] || {} }
      };
      n.sj = { anhphong: subjDays('anhphong', n), thanhnghi: subjDays('thanhnghi', n) };
      n.goal = { anhphong: 20, thanhnghi: (n.l6 && n.l6.cfg && +n.l6.cfg.goal) || 20 };
      D = n; AT = Date.now(); LOADING = null;
      try { await finalize(); } catch (e) { console.error(e); }
      subs.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
      return D;
    })();
    return LOADING;
  }
  /* số câu Toán/TV/Văn mỗi ngày {ngày: {q, c}} */
  function subjDays(kid, n) {
    var o = {};
    function put(k, q, c) { var x = o[k] || (o[k] = { q: 0, c: 0 }); x.q += q; x.c += c; }
    if (kid === 'anhphong') {
      var doc = n.l2; if (!doc) return o;
      (doc.rounds || []).forEach(function (r) { if (Array.isArray(r)) put(dayOf(r[0]), +r[4] || 0, +r[3] || 0); });
      (doc.tests || []).forEach(function (r) { if (Array.isArray(r)) put(dayOf(r[0]), +r[3] || 0, +r[4] || 0); });
    } else {
      var S = n.l6; if (!S || !S.days) return o;
      Object.keys(S.days).forEach(function (k) { var dd = S.days[k] || {}; Object.keys(dd).forEach(function (s) { if (dd[s] && typeof dd[s] === 'object') put(k, +dd[s].q || 0, +dd[s].c || 0); }); });
    }
    return o;
  }

  /* ---------- điểm ngày / tuần ---------- */
  function dayPts(kid, k) {
    var r = D.vd[kid][k], sj = D.sj[kid][k] || { q: 0, c: 0 }, goal = D.goal[kid], ch = chestCheck(r, D.pl[kid], k);
    var p = { en: dayDone(r) ? 5 : 0, sub: sj.q >= goal ? 4 : 0, more: sj.q >= goal * 2 ? 2 : 0, acc: 0, chest: ch.ok ? 2 : 0, sq: sj.q, goal: goal, ch: ch };
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
        var top = Math.max(s.anhphong, s.thanhnghi);
        var win = top >= WIN_MIN ? KIDS.filter(function (k) { return s[k] === top; }) : [];
        doc = { wk: wk, s: s, win: win, good: KIDS.filter(function (k) { return win.indexOf(k) < 0 && s[k] >= GOOD_MIN; }), sh: KIDS.filter(function (k) { return s[k] >= SHIELD_MIN; }), at: Date.now() };
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
  var PETS = {
    anhphong: [[0, '🥚', 'Quả trứng bí ẩn', ''], [40, '🥚', 'Trứng đang nứt', '💥'], [100, '🦎', 'Khủng long sơ sinh', '🌱'], [200, '🦖', 'Khủng long con', '🌿'],
      [350, '🦖', 'Khủng long nhanh nhẹn', '💨'], [550, '🦖', 'Khủng long chiến binh', '🛡️'], [800, '🦕', 'Khủng long khổng lồ', '🌴'], [1100, '🐉', 'Rồng khủng long', '🔥'], [1500, '🐲', 'Vua khủng long', '👑']],
    thanhnghi: [[0, '📐', 'Bản thiết kế tên lửa', ''], [40, '🔧', 'Xưởng lắp ráp', '⚙️'], [100, '🚀', 'Tên lửa thử nghiệm', '💨'], [200, '🚀', 'Bay qua tầng mây', '☁️'],
      [350, '🛰️', 'Vệ tinh quỹ đạo', '🌍'], [550, '🚀', 'Đáp xuống Mặt Trăng', '🌙'], [800, '🪐', 'Thám hiểm sao Thổ', '✨'], [1100, '🛸', 'Phi thuyền liên sao', '🌟'], [1500, '🛸', 'Chinh phục thiên hà', '👑']]
  };
  function xpParts(kid) {
    var o = { en: 0, sub: 0, chest: 0, cup: 0 }, vd = D.vd[kid], sj = D.sj[kid], g = D.goal[kid];
    Object.keys(vd).forEach(function (k) { if (dayDone(vd[k])) o.en++; if (vd[k] && vd[k].chest) o.chest++; });
    Object.keys(sj).forEach(function (k) { if (sj[k].q >= g) o.sub++; });
    o.cup = cupsOf(kid); o.xp = o.en * 10 + o.sub * 5 + o.chest * 3 + o.cup * 20; return o;
  }
  function xpToday(kid) { var t = today(), r = D.vd[kid][t], s = D.sj[kid][t]; return (dayDone(r) ? 10 : 0) + (s && s.q >= D.goal[kid] ? 5 : 0) + (r && r.chest ? 3 : 0); }
  function pet(kid) {
    if (!D) return null; var xp = xpParts(kid).xp, L = PETS[kid], i = 0;
    for (var j = 0; j < L.length; j++) if (xp >= L[j][0]) i = j;
    return { i: i, n: L.length, e: L[i][1], name: L[i][2], acc: L[i][3], xp: xp, from: L[i][0], next: L[i + 1] || null };
  }

  /* ---------- giao diện ---------- */
  var CSS = '.td-card{background:#fff;border:2px solid #E2E8F0;border-radius:22px;padding:14px 16px;margin-top:16px}' +
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
  var SCENE = {
    anhphong: ['#FEF3C7,#FDE68A', '#FEF3C7,#FCD34D', '#DCFCE7,#86EFAC', '#D9F99D,#65A30D', '#BEF264,#4D7C0F', '#A7F3D0,#047857', '#6EE7B7,#065F46', '#FDBA74,#9A3412', '#FDE047,#B45309'],
    thanhnghi: ['#E0F2FE,#BAE6FD', '#E2E8F0,#94A3B8', '#BAE6FD,#38BDF8', '#E0F2FE,#7DD3FC', '#1E3A8A,#0F172A', '#334155,#0F172A', '#4C1D95,#1E1B4B', '#581C87,#0B1026', '#7C3AED,#020617']
  };
  function nameOf(kid) { var k = BANK.kid(kid); return k ? k.name : kid; }
  function plate(kid) { return BANK.nameplate ? BANK.nameplate(kid, 'S', null, { av: true }) : esc(nameOf(kid)); }

  function petHtml(kid) {
    var p = pet(kid); if (!p) return ''; css();
    var pct = p.next ? Math.round((p.xp - p.from) / (p.next[0] - p.from) * 100) : 100, td = xpToday(kid);
    return '<div class="td-card"><div class="pet"><div class="pet-scene' + (p.i === p.n - 1 ? ' top' : '') + '" style="background:linear-gradient(160deg,' + SCENE[kid][p.i] + ')">' +
      '<span class="pet-e" style="font-size:' + (46 + p.i * 4) + 'px">' + p.e + '</span>' + (p.acc ? '<span class="pet-a a1">' + p.acc + '</span><span class="pet-a a2">' + (p.i >= 6 ? '✨' : '') + '</span>' : '') + '</div>' +
      '<div class="pet-info"><div class="pet-lv">Linh vật · Cấp ' + (p.i + 1) + '/' + p.n + ' · ⚡ ' + p.xp + ' năng lượng</div><div class="pet-nm">' + esc(p.name) + '</div>' +
      '<div class="pet-bar"><i style="width:' + Math.max(3, pct) + '%"></i></div>' +
      '<div class="pet-nx">' + (p.next ? 'Còn <b>' + (p.next[0] - p.xp) + ' ⚡</b> nữa để thành <b>' + p.next[1] + ' ' + esc(p.next[2]) + '</b>' : 'Linh vật đã lớn hết cỡ. Con thật tuyệt vời! 👑') + '</div>' +
      '<span class="pet-td">' + (td ? 'Hôm nay +' + td + ' ⚡' : 'Học hôm nay để linh vật lớn thêm nhé!') + '</span></div></div>' +
      '<details><summary>⚡ Linh vật lớn lên thế nào?</summary><ul><li>Mỗi ngày học đủ bài tiếng Anh: <b>+10 ⚡</b></li><li>Đạt mục tiêu ' + (kid === 'anhphong' ? 'Toán/Tiếng Việt' : 'Toán/Ngữ văn') + ' trong ngày (' + D.goal[kid] + ' câu): <b>+5 ⚡</b></li><li>Mở rương báu: <b>+3 ⚡</b></li><li>Mỗi cúp vô địch tuần: <b>+20 ⚡</b></li></ul>' +
      '<div>' + PETS[kid].map(function (x, i) { return '<span style="opacity:' + (i <= p.i ? 1 : .35) + '">' + (i <= p.i ? x[1] : '❔') + '</span>'; }).join(' → ') + '</div></details></div>';
  }

  function petScene(kid, px) {
    var p = pet(kid); if (!p) return ''; css(); px = px || 140;
    return '<div class="pet-scene' + (p.i === p.n - 1 ? ' top' : '') + '" style="width:' + px + 'px;height:' + px + 'px;background:linear-gradient(160deg,' + SCENE[kid][p.i] + ')">' +
      '<span class="pet-e" style="font-size:' + Math.round(px * (0.42 + p.i * 0.03)) + 'px">' + p.e + '</span>' + (p.acc ? '<span class="pet-a a1">' + p.acc + '</span>' + (p.i >= 6 ? '<span class="pet-a a2">✨</span>' : '') : '') + '</div>';
  }
  function petLine(kid) {
    var p = pet(kid); if (!p) return ''; css();
    var pct = p.next ? Math.round((p.xp - p.from) / (p.next[0] - p.from) * 100) : 100, td = xpToday(kid);
    return '<details class="pet-line"><summary><span class="pl-n">' + p.e + ' ' + esc(p.name) + ' <small>· cấp ' + (p.i + 1) + '/' + p.n + '</small></span>' +
      '<span class="pl-bar"><i style="width:' + Math.max(3, pct) + '%"></i></span><span class="pl-x">' + (p.next ? 'còn ' + (p.next[0] - p.xp) + ' ⚡ nữa để lớn' : 'đã lớn hết cỡ 👑') + (td ? ' · hôm nay +' + td + ' ⚡' : '') + ' ⓘ</span></summary>' +
      '<div class="pl-how"><b>Linh vật lớn lên nhờ năng lượng ⚡</b><br>Học đủ bài tiếng Anh +10 · Đạt mục tiêu ' + (kid === 'anhphong' ? 'Toán/Tiếng Việt' : 'Toán/Ngữ văn') + ' +5 · Mở rương báu +3 · Cúp tuần +20<br>' +
      PETS[kid].map(function (x, i) { return '<span style="opacity:' + (i <= p.i ? 1 : .35) + '">' + (i <= p.i ? x[1] : '❔') + '</span>'; }).join(' → ') + '</div></details>';
  }

  var TODAY_LBL = { en: ['📘', 'Học đủ bài tiếng Anh', 5], sub: ['🧮', 'Đạt mục tiêu môn chính', 4], acc: ['🎯', 'Chính xác từ 90%', 2], chest: ['🎁', 'Đủ điều kiện rương báu', 2], more: ['💪', 'Học vượt gấp đôi mục tiêu', 2] };
  function leagueHtml(focus, withHist, mode) {
    if (!D) return ''; css();
    var t = today(), wk = monday(t), left = 6 - Math.round((parse(t) - parse(wk)) / 864e5);
    var s = {}; KIDS.forEach(function (k) { s[k] = weekPts(k, wk); });
    var top = Math.max(s.anhphong, s.thanhnghi);
    var rows = KIDS.map(function (k) {
      var lead = top > 0 && s[k] === top;
      return '<div class="lg-row"><div style="min-width:0">' + plate(k) + '</div>' +
        '<div class="lg-bar"><i class="' + k + '" style="width:' + Math.min(100, s[k] / 105 * 100) + '%"></i></div><div class="lg-pt">' + (lead ? '<span title="' + (s.anhphong === s.thanhnghi ? 'Ngang điểm' : 'Đang dẫn') + '">👑</span> ' : '') + s[k] + ' <small>/105</small></div></div>';
    }).join('');
    var head = '<h3>🏆 Đấu trường tuần <small>' + dm(wk) + ' – ' + dm(addD(wk, 6)) + '</small></h3><div class="lg-rows">' + rows + '</div>';
    var meta = '<div class="lg-meta">' + (left > 0 ? 'Còn <b>' + left + ' ngày</b> nữa (tính cả hôm nay là ' + (left + 1) + ')' : '<b>Hôm nay là ngày cuối!</b>') + ' · Vô địch: <b>+' + CUP + ' ⭐</b> · Từ ' + GOOD_MIN + ' điểm: <b>+' + GOOD + ' ⭐</b> · Từ ' + SHIELD_MIN + ' điểm: <b>+1 🛡️</b></div>';
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
          if (key === 'chest') hint = ' (' + Math.min(p.ch.nw, NEWW) + '/' + NEWW + ' từ · ' + (p.ch.rv ? 'ôn ✓' : 'chưa ôn') + ' · ' + Math.min(p.ch.pr, 2) + '/2 luyện · ' + Math.min(p.ch.ls, 1) + '/1 nói)';
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
      if (ws.length) h += '<table class="lg-hist"><tr><th>Tuần</th><th>' + esc(nameOf('anhphong')) + '</th><th>' + esc(nameOf('thanhnghi')) + '</th><th>Kết quả</th></tr>' + ws.map(function (x) {
        var d = D.lg[x]; return '<tr><td>' + dm(x) + '–' + dm(addD(x, 6)) + '</td><td>' + (d.s.anhphong || 0) + '</td><td>' + (d.s.thanhnghi || 0) + '</td><td>' + ((d.win || []).length ? '🏆 ' + d.win.map(nameOf).map(esc).join(', ') : '—') + ((d.good || []).length ? ' · 💪 ' + d.good.map(nameOf).map(esc).join(', ') : '') + ((d.sh || []).length ? ' · 🛡️ ' + d.sh.map(nameOf).map(esc).join(', ') : '') + '</td></tr>';
      }).join('') + '</table>';
    }
    h += '<details><summary>📜 Luật đấu trường</summary><ul>' +
      '<li>Mỗi con được chấm theo <b>mục tiêu riêng của mình</b>, nên anh và em có cơ hội thắng như nhau.</li>' +
      '<li>Mỗi ngày tối đa <b>15 điểm</b>: 📘 học đủ bài tiếng Anh +5 · 🧮 đạt mục tiêu ' + 'Toán/Tiếng Việt hoặc Toán/Ngữ văn (' + D.goal.anhphong + ' / ' + D.goal.thanhnghi + ' câu) +4 · 🎯 đúng từ 90% (từ 80%: +1) +2 · 🎁 đủ điều kiện rương báu +2 · 💪 làm gấp đôi mục tiêu môn chính +2.</li>' +
      '<li>Tuần chốt hết Chủ nhật. Con nhiều điểm hơn (ít nhất ' + WIN_MIN + ' điểm) nhận <b>cúp vô địch +' + CUP + ' sao</b>. Bằng điểm thì cả hai cùng nhận.</li>' +
      '<li>Con không vô địch nhưng đạt từ <b>' + GOOD_MIN + ' điểm</b> vẫn được <b>+' + GOOD + ' sao</b> vì đã làm tốt.</li>' +
      '<li>Tuần nào đạt từ <b>' + SHIELD_MIN + ' điểm</b> được thưởng <b>1 khiên 🛡️</b> (giữ tối đa ' + SHIELD_MAX + '). Lỡ nghỉ một ngày, khiên tự giữ chuỗi ngày học 🔥 cho con.</li></ul></details>' + (mode === 'compact' ? '</details>' : '</div>');
    return h;
  }

  /* ---------- Nhiệm vụ hôm nay ---------- */
  function tasks(kid) {
    var t = today(), r = D.vd[kid][t] || {}, ch = chestCheck(r, D.pl[kid], t), sj = D.sj[kid][t] || { q: 0 }, g = D.goal[kid];
    var sub = kid === 'anhphong' ? 'Toán / Tiếng Việt lớp 2' : 'Toán / Ngữ văn lớp 6', subApp = kid === 'anhphong' ? 'lop2' : 'lop6';
    return [
      { ic: '📘', t: 'Học ' + NEWW + ' từ mới', n: Math.min(ch.nw, NEWW), of: NEWW, app: 'tuvung' },
      { ic: '🔁', t: 'Ôn tập từ cũ', n: ch.rv ? 1 : 0, of: 1, app: 'tuvung' },
      { ic: '🎯', t: '2 bài luyện thêm', n: Math.min(ch.pr, 2), of: 2, app: 'tuvung' },
      { ic: '🗣️', t: '1 bài nghe & nói', n: Math.min(ch.ls, 1), of: 1, app: 'tuvung' },
      { ic: kid === 'anhphong' ? '🧮' : '📐', t: g + ' câu ' + sub, n: Math.min(sj.q, g), of: g, app: subApp },
      { ic: r.chest ? '🪙' : '🎁', t: 'Mở rương báu', n: r.chest ? 1 : 0, of: 1, app: 'tuvung', bonus: true, lock: !ch.ok && !r.chest }
    ];
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
        return '<button class="ms-it' + (ok ? ' ok' : '') + (x.bonus ? ' bonus' : '') + (x.lock ? ' lock' : '') + '" data-app="' + x.app + '"><span class="ms-ck">' + (ok ? '✓' : x.lock ? '🔒' : '') + '</span><span class="ms-ic">' + x.ic + '</span><span class="ms-t">' + x.t +
          (x.bonus ? ' <small>' + (ok ? 'đã mở' : x.lock ? 'làm xong 4 việc tiếng Anh để mở' : 'đã mở được rồi, vào lấy sao nào!') + '</small>' : '') + '</span><span class="ms-n">' + (x.of > 1 ? x.n + '/' + x.of : ok ? 'Xong' : '') + '</span></button>';
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
      var nm = nameOf(k), vd = D.vd[k], sj = D.sj[k], g = D.goal[k], sub = k === 'anhphong' ? 'Toán/Tiếng Việt' : 'Toán/Ngữ văn';
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
    return '<div class="td-card al"><h3>🔔 Cần bố mẹ để ý</h3>' + (A.length ? A.map(function (a) { return '<div class="al-it ' + a[0] + '">' + (a[0] === 'warn' ? '⚠️' : a[0] === 'good' ? '✅' : 'ℹ️') + ' <span>' + a[1] + '</span></div>'; }).join('') : '<div class="al-it good">✅ <span>Mọi thứ đều ổn, hai con đang học đều.</span></div>') + '</div>';
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
    else if (p.i > me.pet) { me.pet = p.i; changed = true; items.push([p.e, 'Linh vật lớn rồi!', ['Linh vật của con đã thành <b>' + esc(p.name) + '</b> (cấp ' + (p.i + 1) + '/' + p.n + ').']]); }
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

  window.THIDUA = {
    load: load, onUpdate: function (f) { subs.push(f); }, data: function () { return D; },
    pet: pet, petHtml: petHtml, petScene: petScene, petLine: petLine, missionHtml: missionHtml, missionSpeech: missionSpeech, say: say, alertsHtml: alertsHtml, leagueHtml: leagueHtml, celebrate: celebrate, shieldHave: function (k) { return D ? shieldHave(k) : 0; },
    weekPts: function (k) { return D ? weekPts(k, monday(today())) : 0; }, chestCheck: chestCheck,
    RULE: { START: START, CUP: CUP, WIN_MIN: WIN_MIN, SHIELD_MIN: SHIELD_MIN, SHIELD_MAX: SHIELD_MAX, NEWW: NEWW }
  };
})();
