#!/usr/bin/env python3
"""Công cụ cho kho hoc-tap (Góc học tập của Anh Phong và Thanh Nghị).

Chạy ở bất kỳ đâu, công cụ tự tìm thư mục gốc của kho (thư mục cha của tools/).

  python3 -I tools/hoctap.py kiemtra          # kiểm tra tĩnh: cú pháp JS, JSON, số phiên bản, lộ mã gia đình
  python3 -I tools/hoctap.py nangban          # nâng số phiên bản ?v=N và hoc-tap-vN lên N+1
  python3 -I tools/hoctap.py taopatch TEN     # gom thay đổi thành patches/NNNN-TEN.patch và thử áp dụng
        [--so 0020a] [--tep index.html bank.js ...]
  python3 -I tools/hoctap.py trinhduyet       # mở thử từng ứng dụng trên Chrome (không mạng Firebase),
        [--anh /tmp/hoc-tap-anh]               #   bắt lỗi JavaScript và chụp ảnh khổ iPad / iPhone

Mã trả về khác 0 khi có lỗi, để quy trình dừng lại trước khi đẩy bản sửa.
"""
import argparse
import functools
import http.server
import json
import re
import shutil
import socketserver
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KIDS = ('anhphong', 'thanhnghi')
VERSIONED = ('claude-shim.js', 'bank.js', 'thidua.js')
HTML_APPS = ('index.html', 'tuvung.html', 'lop1.html', 'lop2.html', 'lop3.html', 'lop5.html', 'lop7.html', 'lop6.html', 'nuoithu.html')

OK, WARN, ERR = '✅', '⚠️ ', '❌'
problems = []


def say(mark, msg):
    print(f'{mark} {msg}')
    if mark == ERR:
        problems.append(msg)


def read(name):
    return (ROOT / name).read_text(encoding='utf-8')


def git(*args, cwd=None, check=True):
    r = subprocess.run(['git', *args], cwd=cwd or ROOT, capture_output=True, text=True)
    if check and r.returncode != 0:
        raise RuntimeError(f'git {" ".join(args)}: {r.stderr.strip()}')
    return r.stdout


# ------------------------------------------------------------------ kiểm tra tĩnh
def check_json():
    try:
        w = json.loads(read('words.json'))
    except Exception as e:  # noqa: BLE001
        say(ERR, f'words.json không đọc được: {e}')
        return
    ids = [k.get('id') for k in w] if isinstance(w, list) else []
    if ids != list(KIDS):
        say(ERR, f'words.json phải là danh sách 2 bé theo thứ tự {KIDS}, đang là {ids}')
        return
    for k in w:
        bad = [i + 1 for i, x in enumerate(k.get('words', []))
               if not (isinstance(x, list) and len(x) == 3 and isinstance(x[0], str) and x[0].strip()
                       and isinstance(x[1], str) and x[1].strip() and isinstance(x[2], int))]
        if bad:
            say(ERR, f'words.json/{k["id"]}: từ số {bad[:10]} sai dạng ["tiếng Anh", "nghĩa", mức 0–5]')
        seen, dup = set(), []
        for x in k['words']:
            key = str(x[0]).strip().lower()
            if key in seen:
                dup.append(x[0])
            seen.add(key)
        say(OK, f'words.json/{k["id"]}: {len(k["words"])} từ'
            + (f' (từ trùng chữ: {", ".join(dup[:6])} — kiểm tra nghĩa có khác nhau không)' if dup else ''))
    try:
        json.loads(read('manifest.json'))
        say(OK, 'manifest.json hợp lệ')
    except Exception as e:  # noqa: BLE001
        say(ERR, f'manifest.json lỗi: {e}')


def node_check(code, label, tmp):
    p = Path(tmp) / (re.sub(r'[^a-z0-9]+', '_', label.lower()) + '.js')
    p.write_text(code, encoding='utf-8')
    r = subprocess.run(['node', '--check', str(p)], capture_output=True, text=True)
    if r.returncode != 0:
        lines = [ln for ln in r.stderr.splitlines() if ln.strip()]
        say(ERR, f'Lỗi cú pháp JavaScript trong {label}:\n      ' + '\n      '.join(lines[:6]))
        return False
    return True


def check_js():
    if not shutil.which('node'):
        say(WARN, 'Không có node, bỏ qua kiểm tra cú pháp JavaScript')
        return
    with tempfile.TemporaryDirectory() as tmp:
        n_ok = 0
        for f in sorted(ROOT.glob('*.js')):
            n_ok += node_check(f.read_text(encoding='utf-8'), f.name, tmp)
        for name in HTML_APPS:
            html = read(name)
            blocks = re.findall(r'<script(?![^>]*\bsrc=)([^>]*)>(.*?)</script>', html, re.S | re.I)
            for i, (attrs, code) in enumerate(blocks):
                if 'json' in attrs.lower() or not code.strip():
                    continue
                line = html[:html.find(code)].count('\n') + 1
                n_ok += node_check(code, f'{name} (khối script {i + 1}, từ dòng {line})', tmp)
        say(OK, f'Cú pháp JavaScript: {n_ok} khối đạt')


def current_version():
    m = re.findall(r'(claude-shim|bank|thidua)\.js\?v=(\d+)', read('index.html'))
    return sorted({int(v) for _, v in m}), {n for n, _ in m}


def check_version():
    vs, names = current_version()
    sw = read('sw.js')
    swv = re.findall(r"hoc-tap-v(\d+)", sw)
    core = re.findall(r"\?v=(\d+)", sw)
    if len(vs) != 1 or names != {'claude-shim', 'bank', 'thidua'}:
        say(ERR, f'index.html: ba tệp {VERSIONED} phải cùng một số ?v=, đang là {vs}')
        return
    v = vs[0]
    if swv != [str(v)] or set(core) != {str(v)}:
        say(ERR, f'sw.js chưa khớp phiên bản {v} (V = hoc-tap-v{swv}, CORE ?v={sorted(set(core))}) — chạy: hoctap.py nangban')
    else:
        say(OK, f'Số phiên bản thống nhất: v{v}')
    m = re.search(r'const CORE = \[(.*?)\];', sw, re.S)
    for u in re.findall(r"'([^']+)'", m.group(1) if m else ''):
        f = u.split('?')[0]
        if f not in ('./', '') and not (ROOT / f).exists():
            say(ERR, f'sw.js lưu sẵn tệp không tồn tại: {f}')


def check_secrets():
    pat = re.compile(r'(?:[#&]ma=|families/)([a-z0-9]{16,64})', re.I)
    found = []
    for f in ROOT.rglob('*'):
        if '.git' in f.parts or not f.is_file() or f.suffix in ('.png', '.jpg', '.ico'):
            continue
        try:
            t = f.read_text(encoding='utf-8')
        except Exception:  # noqa: BLE001
            continue
        for m in pat.finditer(t):
            found.append(f'{f.relative_to(ROOT)}: …{m.group(0)[:12]}…')
    if found:
        say(ERR, 'Có vẻ lộ MÃ GIA ĐÌNH trong mã nguồn (kho công khai!):\n      ' + '\n      '.join(found[:5]))
    else:
        say(OK, 'Không thấy mã gia đình trong mã nguồn')


def check_pending():
    pend = sorted((ROOT / 'patches').glob('*.patch')) if (ROOT / 'patches').exists() else []
    if pend and git('ls-files', 'patches', check=False).strip():
        say(WARN, 'Trên GitHub còn bản sửa chưa áp dụng (patches/ đã được commit): '
            + ', '.join(p.name for p in pend) + ' — có thể quy trình "Ap dung ban sua" đã lỗi, xem Actions')


def cmd_kiemtra(_a):
    print(f'Kho: {ROOT}')
    check_json()
    check_js()
    check_version()
    check_secrets()
    check_pending()
    if problems:
        print(f'\n{ERR} Có {len(problems)} lỗi — sửa xong rồi mới tạo bản sửa.')
        return 1
    print(f'\n{OK} Mọi kiểm tra đều đạt.')
    return 0


# ------------------------------------------------------------------ nâng phiên bản
def cmd_nangban(_a):
    vs, _ = current_version()
    if len(vs) != 1:
        say(ERR, f'Số phiên bản trong index.html không thống nhất: {vs}. Sửa tay cho bằng nhau trước.')
        return 1
    v, n = vs[0], vs[0] + 1
    idx = read('index.html')
    for f in VERSIONED:
        idx = idx.replace(f'{f}?v={v}"', f'{f}?v={n}"')
    (ROOT / 'index.html').write_text(idx, encoding='utf-8')
    sw = read('sw.js').replace(f"'hoc-tap-v{v}'", f"'hoc-tap-v{n}'")
    sw = re.sub(r'\?v=' + str(v) + r"'", f"?v={n}'", sw)
    (ROOT / 'sw.js').write_text(sw, encoding='utf-8')
    print(f'{OK} Đã nâng phiên bản v{v} → v{n} (index.html, sw.js)')
    check_version()
    return 1 if problems else 0


# ------------------------------------------------------------------ tạo bản sửa
def next_number():
    nums = [int(x) for x in re.findall(r'^patch (\d{4})', git('log', '--format=%s'), re.M)]
    nums += [int(p.name[:4]) for p in (ROOT / 'patches').glob('[0-9][0-9][0-9][0-9]*.patch')] \
        if (ROOT / 'patches').exists() else []
    return f'{(max(nums) if nums else 0) + 1:04d}'


def clean_pushed():
    """Xoá trên máy các tệp patch đã đẩy lên GitHub (lời nhắn commit "patch NNNN…"), để không thử áp dụng lại."""
    done = set(re.findall(r'^patch (\d{4}[a-z]?)\b', git('log', 'origin/main', '--format=%s', check=False), re.M))
    for f in sorted((ROOT / 'patches').glob('*.patch')) if (ROOT / 'patches').exists() else []:
        m = re.match(r'(\d{4}[a-z]?)-', f.name)
        if m and m.group(1) in done:
            f.unlink()
            print(f'   (đã dọn {f.name}: bản này đã lên GitHub)')


def cmd_taopatch(a):
    ten = re.sub(r'[^a-z0-9-]+', '-', a.ten.lower()).strip('-') or 'ban-sua'
    git('fetch', '-q', 'origin', check=False)
    clean_pushed()
    so = a.so or next_number()
    head, remote = git('rev-parse', 'HEAD').strip(), git('rev-parse', 'origin/main', check=False).strip()
    if remote and head != remote:
        say(ERR, 'Kho trên GitHub đã có thay đổi mới hơn bản đang sửa. Chạy: git stash && git pull --rebase && git stash pop, '
            'rồi tạo lại bản sửa.')
        return 1
    paths = a.tep or ['.', ':!patches']
    git('add', '-A', '--', *paths)
    diff = git('diff', '--cached', '-U2', '--binary', '--no-color', '--', *paths)
    git('reset', '-q')
    if not diff.strip():
        say(ERR, 'Không có thay đổi nào để đóng gói.')
        return 1
    if not diff.endswith('\n'):
        diff += '\n'
    (ROOT / 'patches').mkdir(exist_ok=True)
    out = ROOT / 'patches' / f'{so}-{ten}.patch'
    out.write_text(diff, encoding='utf-8')
    files = re.findall(r'^diff --git a/(\S+) ', diff, re.M)
    # thử áp dụng mọi bản sửa đang chờ (theo thứ tự tên) lên bản sạch của GitHub
    wt = Path(tempfile.mkdtemp(prefix='hoc-tap-thu-'))
    try:
        git('worktree', 'add', '-q', '--detach', str(wt), remote or head)
        for p in sorted((ROOT / 'patches').glob('*.patch')):
            r = subprocess.run(['git', 'apply', '--whitespace=nowarn', str(p)], cwd=wt, capture_output=True, text=True)
            if r.returncode != 0:
                say(ERR, f'{p.name} KHÔNG áp dụng được lên bản trên GitHub:\n      {r.stderr.strip()[:600]}')
                return 1
    finally:
        git('worktree', 'remove', '--force', str(wt), check=False)
        shutil.rmtree(wt, ignore_errors=True)
    kb = len(diff.encode('utf-8')) / 1024
    print(f'{OK} Đã tạo {out.relative_to(ROOT)} ({kb:.0f} KB) — sửa {len(files)} tệp: {", ".join(files)}')
    print(f'{OK} Thử áp dụng lên bản sạch trên GitHub: đạt')
    if kb > 300:
        say(WARN, 'Bản sửa lớn. Nên chia theo tệp: taopatch ten --so NNNNa --tep index.html sw.js, '
            'rồi taopatch ten --so NNNNb --tep thidua.js …')
    print('Bước tiếp: đẩy tệp này vào patches/ trên GitHub (commit "patch ' + so + ': …").')
    return 0


# ------------------------------------------------------------------ thử trên trình duyệt
FLOWS = [('anhphong', 'tuvung'), ('anhphong', 'lop2'), ('anhphong', 'sao'), ('anhphong', 'huyhieu'),
         ('thanhnghi', 'tuvung'), ('thanhnghi', 'lop6'), ('anhphong', 'thu'), ('thanhnghi', 'thu')]
PARENT = ['p-sao', 'p-report', 'p-tuvung', 'p-lop2', 'p-lop6']
VIEWS = {'ipad-ngang': (1180, 820), 'ipad-doc': (820, 1180), 'iphone': (390, 844)}
IGNORE = ('gstatic', 'firebase', 'net::ERR', 'Failed to load resource', 'ERR_', 'favicon')


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve():
    handler = functools.partial(_Quiet, directory=str(ROOT))
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f'http://127.0.0.1:{httpd.server_address[1]}/'


def cmd_trinhduyet(a):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        say(ERR, 'Chưa có playwright: pip install playwright --break-system-packages')
        return 1
    shots = Path(a.anh)
    shots.mkdir(parents=True, exist_ok=True)
    pin = (re.search(r"var pin='(\d+)'", read('index.html')) or [None, ''])[1]
    httpd, base = serve()
    exe = next((p for p in ('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser') if Path(p).exists()), None)
    results = []
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path=exe) if exe else p.chromium.launch()

        def run(label, view, steps):
            ctx = br.new_context(viewport={'width': VIEWS[view][0], 'height': VIEWS[view][1]},
                                 service_workers='block', locale='vi-VN', has_touch=True)
            # chặn mọi địa chỉ ngoài máy (Firebase, gstatic…): thử ở chế độ "chỉ trên máy này"
            ctx.route('**/*', lambda r: r.continue_() if r.request.url.startswith(base) else r.abort())
            pg = ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append('Lỗi JS: ' + str(e)))
            pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and not any(x in m.text for x in IGNORE) else None)
            try:
                # mã gia đình giả (không có dữ liệu thật); thiếu Firebase nên trang chạy chế độ "chỉ trên máy này"
                pg.goto(base + 'index.html#ma=' + 'thu' * 6, wait_until='domcontentloaded')
                pg.wait_for_selector('.whoBtn', timeout=15000)
                steps(pg)
                pg.wait_for_timeout(2500)
                pg.screenshot(path=str(shots / f'{label}-{view}.png'), full_page=False)
            except Exception as e:  # noqa: BLE001
                errs.append('Không chạy hết các bước: ' + str(e).splitlines()[0])
            ctx.close()
            results.append((label, view, errs))
            print(('❌' if errs else '✅') + f' {label} ({view})' + ''.join('\n      ' + x[:300] for x in errs[:5]))

        for view in VIEWS:
            run('trang-chinh', view, lambda pg: None)
        for kid, app in FLOWS:
            def steps(pg, kid=kid, app=app):
                pg.click(f'.whoBtn.{kid}')
                pg.wait_for_selector(f'[data-app="{app}"]', timeout=10000)
                pg.click(f'[data-app="{app}"]')
                pg.wait_for_selector('#pbar', timeout=15000)
            run(f'{kid}-{app}', 'ipad-ngang', steps)
        if pin:
            for app in PARENT:
                def steps(pg, app=app):
                    pg.click('#pParBtn')
                    pg.fill('#pPinIn', pin)
                    pg.click('#pPinOk')
                    pg.wait_for_selector(f'#pPar [data-app="{app}"]', timeout=10000)
                    pg.click(f'#pPar [data-app="{app}"]')
                    pg.wait_for_selector('#pbar', timeout=15000)
                run(f'bo-me-{app}', 'ipad-ngang', steps)
        br.close()
    httpd.shutdown()
    bad = [r for r in results if r[2]]
    print(f'\nẢnh chụp: {shots}  ({len(results)} màn hình)')
    if bad:
        print(f'{ERR} {len(bad)} màn hình có lỗi.')
        return 1
    print(f'{OK} Mọi màn hình mở được, không có lỗi JavaScript (chạy không có Firebase).')
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('kiemtra').set_defaults(f=cmd_kiemtra)
    sub.add_parser('nangban').set_defaults(f=cmd_nangban)
    t = sub.add_parser('taopatch')
    t.add_argument('ten', help='tên ngắn không dấu, ví dụ: them-bai-doc')
    t.add_argument('--so', help='số bản sửa, mặc định tự tăng (ví dụ 0020 hoặc 0020a)')
    t.add_argument('--tep', nargs='+', help='chỉ gói các tệp này')
    t.set_defaults(f=cmd_taopatch)
    b = sub.add_parser('trinhduyet')
    b.add_argument('--anh', default='/tmp/hoc-tap-anh', help='thư mục lưu ảnh chụp')
    b.set_defaults(f=cmd_trinhduyet)
    a = ap.parse_args()
    sys.exit(a.f(a))


if __name__ == '__main__':
    main()
