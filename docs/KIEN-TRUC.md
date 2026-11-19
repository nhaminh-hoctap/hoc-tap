# Kiến trúc Góc học tập

Tài liệu cho người sửa mã (thường là Claude). Cập nhật lần cuối: 19/11/2026, mã ở phiên bản v19 (sau patch 0019).

## Tóm tắt

- **Trang web tĩnh** trên GitHub Pages: `https://nhaminh-hoctap.github.io/hoc-tap/`. Không có bước build: sửa tệp nào thì trang chạy đúng tệp đó.
- **Dữ liệu học** trên Firebase Firestore, dự án `hoc-tap-c8925`, đăng nhập ẩn danh. Mọi dữ liệu nằm dưới `families/<mã gia đình>/…`.
- **Mã gia đình** chỉ có trong đường link `…/#ma=<mã>` mở một lần trên mỗi máy, được lưu vào `localStorage` (`hoc_family_code`). Mã này **không bao giờ** được ghi vào kho (kho công khai).
- Ba ứng dụng học vốn được viết để chạy trên Claude. `claude-shim.js` giả lập đúng các hàm `claude.use('db' | 'user' | 'downloads')` nên ba ứng dụng chạy trên web mà gần như không phải sửa.
- Hai bé: `anhphong` (Anh Phong, lớp 2, màu cam, linh vật khủng long) và `thanhnghi` (Thanh Nghị, lớp 6, màu xanh lá, linh vật tên lửa).

## Các tệp

| Tệp | Vai trò |
|---|---|
| `index.html` | Trang chính (khung chung): chọn bé, trang của bé, Góc bố mẹ, Cách chơi, báo cáo tuần, sao lưu; tải và "gắn" từng ứng dụng con vào cùng trang; thanh trên cùng chung `#pbar`. |
| `claude-shim.js` | Cầu nối Firebase: đọc mã gia đình từ link, đăng nhập ẩn danh, bọc Firestore để mọi đường dẫn tự thêm tiền tố `families/<mã>/`. `user.id()` luôn trả `gia-dinh`. |
| `bank.js` | `window.BANK`: kho Sao thưởng chung, quy tắc sao Toán / Tiếng Việt / Ngữ văn (`RULES`), khung tên & danh hiệu (`nameplate`), cửa sổ chúc mừng nhận sao. |
| `thidua.js` | `window.THIDUA`: đấu trường tuần, điểm ngày/tuần, linh vật lớn lên, khiên giữ chuỗi, rương báu, nhiệm vụ hôm nay, cảnh báo bố mẹ, Cách chơi, báo cáo tuần. |
| `tuvung.html` | Ứng dụng Học từ vựng tiếng Anh (cả 2 bé). Cũng là nơi chạy **Sao thưởng**, **Huy hiệu** và các mục bố mẹ: chấm sao, báo cáo, cài đặt từ vựng. |
| `words.json` | Danh sách 3.000 từ của mỗi bé, đúng thứ tự học. |
| `lop2.html` | "Vở Vui Lớp 2": Toán 2 và Tiếng Việt 2 (SGK Kết nối tri thức), bài giảng, luyện tập, kiểm tra, cộng trừ nhanh, bảng cửu chương. |
| `lop6.html` | "Vở ôn luyện lớp 6": Toán 6 và Ngữ văn 6 (SGK Kết nối tri thức), bài giảng, Hỏi thầy, luyện tập, sổ lỗi sai, ôn đến hạn, luyện viết, kiểm tra. |
| `sw.js` | Service worker: chạy như ứng dụng trên iPad, mở được khi mạng yếu. |
| `manifest.json`, `icon.png` | Thông tin "Thêm vào màn hình chính". |
| `.github/workflows/apply-patches.yml` | Tự áp dụng bản sửa trong `patches/`, xoá tệp patch, commit và yêu cầu GitHub Pages cập nhật. |
| `tools/hoctap.py` | Công cụ kiểm tra, nâng phiên bản, tạo bản sửa, thử trên trình duyệt. Xem `QUY-TRINH-SUA.md`. |

## Trang chạy như thế nào

1. `index.html` nạp Firebase compat 10.14.1 từ `www.gstatic.com`, rồi `claude-shim.js`, `bank.js`, `thidua.js` (cùng số `?v=N`).
2. Chưa có mã gia đình trên máy → hiện màn nhập mã (`#pFam`). Có mã → `BANK.ready` kết nối Firestore; trạng thái `BANK.state`: `loading` → `ok` (đã đồng bộ) / `off` (chỉ trên máy này) / `err`.
3. Các màn của trang chính (chỉ một màn hiện, hàm `show(id)`):
   - `#pWho` chọn bé · `#pKid` trang của bé (linh vật, 3 ô: sao / chuỗi ngày / điểm tuần, nhiệm vụ hôm nay, ô vào học, đấu trường)
   - `#pPin` nhập mã bố mẹ · `#pPar` Góc bố mẹ · `#pHow` Cách chơi
4. Bấm vào một ô học → `go(app)` → `mount(app, kid, mode)`:
   - tải tệp ứng dụng bằng `fetch(…, {cache:'no-cache'})`, tách bằng `DOMParser`, chép `<style>` vào `<head>`, thay toàn bộ `<body>`, chạy lại từng `<script>`;
   - tạm "giả" sự kiện `DOMContentLoaded`/`load` để mã khởi động của ứng dụng chạy ngay;
   - chèn thanh chung `#pbar` lên đầu trang.
5. `window.PORTAL = {kid, app, mode, parent, home(), homeBtnHtml()}` cho ứng dụng con biết đang mở cho bé nào, ở chế độ nào. Về trang chính = `PORTAL.home()`: ghi `portal_nav_v1` rồi tải lại trang (sạch bộ nhớ).

| Ô bấm | Tệp | `PORTAL.mode` |
|---|---|---|
| Học từ vựng | `tuvung.html` | `learn` |
| Lớp 2 / Lớp 6 | `lop2.html` / `lop6.html` | `learn` |
| Sao thưởng | `tuvung.html` | `sao` |
| Huy hiệu | `tuvung.html` | `badges` |
| Bố mẹ: Thưởng · Phạt · Tiêu sao | `tuvung.html` | `parent-sao` |
| Bố mẹ: Báo cáo học từ vựng | `tuvung.html` | `parent-report` |
| Bố mẹ: Cài đặt Học từ vựng | `tuvung.html` | `parent-set` |
| Bố mẹ: Cài đặt Lớp 2 / Lớp 6 | `lop2.html` / `lop6.html` | `parent` |

### Thanh trên cùng chung và nút Quay lại

- `BAR_CSS` trong `index.html` ẩn những phần trùng của từng ứng dụng (thanh tiêu đề, huy hiệu đồng bộ, nút thoát gốc) bằng bộ chọn `html.pbar …`.
- Nút **⬅ Quay lại** trên thanh chung bấm hộ nút quay lại gốc của ứng dụng. Hàm `backTarget()` liệt kê bộ chọn cho từng ứng dụng (ví dụ `#flash [data-exit]`, `#app .pagehead > .icon-btn:first-child`, `[data-act="quit"]`).
- ⚠️ **Đổi id/class/`data-act` của nút quay lại hay thanh tiêu đề trong một ứng dụng thì phải sửa cả `backTarget()` và `BAR_CSS`**, nếu không nút Quay lại sẽ biến mất hoặc thanh cũ hiện lại.

### Chạy như ứng dụng (sw.js)

- Trang và ứng dụng cùng nguồn: lấy bản mới từ mạng; quá 4 giây hoặc mất mạng thì dùng bản đã lưu.
- Thư viện Firebase (gstatic): dùng bản đã lưu, cập nhật ngầm. Dữ liệu Firestore không đi qua service worker.
- Chỉ đăng ký khi trang chạy qua `https:`.

## Số phiên bản

Ba tệp `claude-shim.js`, `bank.js`, `thidua.js` được nạp kèm `?v=N`; `sw.js` có `V = 'hoc-tap-vN'` và danh sách `CORE` cùng số đó. **Mỗi bản sửa nâng N lên 1** (lệnh `python3 -I tools/hoctap.py nangban`) để iPad bỏ bản cũ và tải bản mới. Các tệp `.html` luôn tải `no-cache` nên không cần số phiên bản.

## Bản đồ dữ liệu Firestore (dưới `families/<mã>/`)

| Đường dẫn | Ai ghi | Nội dung |
|---|---|---|
| `sync/<khóa>` hoặc `sync/<khóa>.<bé>` | Từ vựng | Mỗi khóa `localStorage` trong `SYNC_KEYS` là một tài liệu `{v: "<json>", t, d}`. Dữ liệu theo bé tách `.anhphong` / `.thanhnghi`. Quá 60.000 ký tự thì chia mảnh: tài liệu chính `{c: số mảnh}` và các mảnh `sync/<id>~0`, `~1`… `{p: "…"}`. |
| `bankx/<bé>/e/<id>` | `bank.js` | Mỗi lần nhận sao Toán / Tiếng Việt / Ngữ văn / cúp tuần là **một tài liệu riêng** `{id, t, v, r, src, k, key, day, void?}` để nhiều máy ghi cùng lúc không đè nhau. Huỷ một dòng = đặt `void: true`. |
| `league/<thứ Hai yyyy-mm-dd>` | `thidua.js` | Kết quả tuần `{wk, s:{bé: điểm}, win, good, sh, at}`; tự chốt khi mở trang vào tuần sau. |
| `data/users/gia-dinh/sync` | Lớp 2 | Tiến độ Lớp 2 (các lượt luyện, bài kiểm tra, luyện nhanh, cài đặt). `…/progress` là bản cũ. |
| `tien-do/hoc-sinh` | Lớp 6 | Tiến độ Lớp 6. `data/users/gia-dinh/tien-do` là vị trí cũ, chỉ đọc. |

Các khóa Từ vựng quan trọng: `vocab_progress_v1` (đã học đến từ số mấy), `vocab_srs_v1` (lịch ôn, **khóa theo số thứ tự từ**), `vocab_daily_v1` (nhật ký từng ngày), `vocab_practice_log_v1` (các bài luyện thêm, nghe nói), `vocab_stars_v1` (sổ sao Từ vựng + sao bố mẹ chấm + `paidB` các khối đã thưởng), `vocab_badges_v1`, `vocab_title_v1` (danh hiệu, khung tên), `vocab_shield_v1` (khiên đã dùng), `vocab_pin` (mã bố mẹ).

**Tổng sao của một bé** = `vocab_stars_v1.<bé>.bal` + tổng các dòng `bankx/<bé>/e` chưa huỷ (`BANK.total(kid)`).

## Dữ liệu trên từng máy (localStorage)

`hoc_family_code` (mã gia đình) · `portal_nav_v1`, `portal_last_kid`, `portal_backup_at` · `bank_ext_cache_v1` (bản sao kho sao) · `title_show_v1` · `lesson_titles_v1` (tên bài để hiện báo cáo) · `vocab_*` (Từ vựng) · `vovui-lop2-sync-v4` (Lớp 2) · `vo-on-luyen-lop6-v1` (Lớp 6). `sessionStorage.portal_pin` nhớ mã bố mẹ trong phiên.

## Sao lưu

Góc bố mẹ → **Sao lưu**: gom mọi tài liệu `sync`, `league`, `bankx/*/e`, tiến độ Lớp 2, Lớp 6 thành tệp `sao-luu-hoc-tap-YYYY-MM-DD.json` (`{app:'goc-hoc-tap', ver:1, at, docs:{đường dẫn: dữ liệu}}`). Chưa có nút khôi phục toàn bộ; nếu cần, viết công cụ đọc tệp này rồi ghi lại từng `docs[đường dẫn]`.

## An toàn

- Kho là **công khai**. Không đưa vào kho: mã gia đình, đường link có `#ma=`, ảnh hay thông tin riêng ngoài tên và lớp đã có. `tools/hoctap.py kiemtra` tự dò mã gia đình bị lộ.
- `apiKey` Firebase để công khai là bình thường; dữ liệu được bảo vệ bằng luật Firestore (đặt trong Firebase console, không nằm trong kho) và mã gia đình dài.
- Mã bố mẹ chỉ là khoá cho trẻ nhỏ, không phải bảo mật thật. Mã mặc định nằm trong mã nguồn; bố mẹ đổi mã trong Cài đặt Học từ vựng (đồng bộ qua `vocab_pin`).
