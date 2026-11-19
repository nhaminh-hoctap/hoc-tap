# Quy trình sửa và cập nhật trang

Áp dụng cho mọi thay đổi mã. Các bước đã chạy ổn từ patch 0006 đến 0019.

## Vì sao đi đường "bản sửa" (patches/)

Các tệp ứng dụng rất lớn (`lop6.html` ~560 KB, `lop2.html` ~400 KB, `tuvung.html` ~250 KB, có dòng dài 44.000 ký tự). Gửi lại cả tệp qua kết nối GitHub vừa nặng vừa dễ hỏng. Vì vậy Claude chỉ gửi **phần thay đổi** (`git diff`) vào thư mục `patches/`; quy trình GitHub Actions **"Ap dung ban sua"** tự áp dụng, xoá tệp patch, commit với lời nhắn `Ap dung ban sua tu Claude` và yêu cầu GitHub Pages cập nhật.

## Các bước

```bash
# 1. Lấy mã mới nhất (đọc qua git; công cụ đọc tệp của kết nối GitHub đôi khi lỗi)
git clone https://github.com/nhaminh-hoctap/hoc-tap.git && cd hoc-tap      # lần đầu
git pull --rebase                                                           # các lần sau

# 2. Sửa mã (xem KIEN-TRUC.md, SUA-NOI-DUNG.md)

# 3. Nâng số phiên bản (mỗi bản sửa một lần)
python3 -I tools/hoctap.py nangban

# 4. Kiểm tra tĩnh: cú pháp JS, JSON, số phiên bản, lộ mã gia đình
python3 -I tools/hoctap.py kiemtra

# 5. Thử trên Chrome: mở trang chính (iPad ngang, iPad dọc, iPhone), 6 màn học, 5 màn bố mẹ;
#    bắt lỗi JavaScript, chụp ảnh vào /tmp/hoc-tap-anh — mở ảnh ra xem chỗ vừa sửa
python3 -I tools/hoctap.py trinhduyet

# 6. Đóng gói bản sửa (tự đánh số tiếp theo, tự thử áp dụng lên bản sạch trên GitHub)
python3 -I tools/hoctap.py taopatch ten-ngan-khong-dau
#    bản sửa lớn (> 300 KB): chia theo tệp
python3 -I tools/hoctap.py taopatch ten --so 0021a --tep index.html sw.js
python3 -I tools/hoctap.py taopatch ten --so 0021b --tep lop6.html
```

7. **Đẩy lên GitHub** bằng kết nối GitHub (`create_or_update_file`): owner `nhaminh-hoctap`, repo `hoc-tap`, branch `main`, path `patches/NNNN-ten.patch`, nội dung = toàn bộ tệp patch, lời nhắn `patch NNNN: <mô tả ngắn tiếng Việt>`. Nhiều phần thì đẩy theo thứ tự `a`, `b`… (Action áp dụng theo thứ tự tên tệp).
   - Tệp **mới hoàn toàn** (một `.js` mới, một tài liệu) có thể tạo thẳng bằng `create_or_update_file` / `push_files`. Việc nối tệp đó vào `index.html` / `sw.js` vẫn đi bằng patch.
8. **Xác nhận** sau 30–90 giây: `list_commits` phải có commit `Ap dung ban sua tu Claude` mới hơn commit patch, và `patches/` trên GitHub không còn tệp. Rồi `git pull` để bản trên máy khớp GitHub (lần `taopatch` sau tự dọn các tệp patch đã lên GitHub).
9. GitHub Pages cập nhật trong 1–2 phút. Trên iPad: đóng hẳn ứng dụng rồi mở lại (lần mở đầu có thể còn bản cũ, lần sau sẽ là bản mới).
10. Ghi một dòng vào `docs/NHAT-KY.md` (và sửa tài liệu nếu cấu trúc đổi) — tốt nhất gói chung trong cùng bản sửa.

## Khi bản sửa không được áp dụng

Dấu hiệu: sau 2–3 phút không thấy commit `Ap dung ban sua tu Claude`, tệp vẫn nằm trong `patches/` (`kiemtra` cũng cảnh báo).

- ⚠️ **Một patch lỗi nằm lại sẽ chặn mọi bản sửa sau** (Action dừng ở tệp lỗi đầu tiên).
- Nguyên nhân thường gặp: kho đã thay đổi sau khi tạo patch (luôn `git pull` trước khi sửa); khoảng trắng / dòng cuối (patch 0019 từng lỗi vì thế, đã sửa bằng cách đẩy lại tệp đúng); sửa tay tệp patch.
- Cách xử lý: `git pull`, làm lại bản sửa, chạy `taopatch` với **cùng số**, rồi đẩy đè lên tệp lỗi (`create_or_update_file` kèm `sha` của tệp đang nằm trên GitHub). Hoặc xoá tệp lỗi (`delete_file`) rồi đẩy bản mới.
- Muốn xem nhật ký lỗi của Action: trang Actions của kho (chỉ người dùng mở được khi đăng nhập), hoặc gắn kho cho phiên với quyền ghi rồi dùng `gh run list` / `gh run view --log-failed`.

## Hoàn tác một bản sửa

```bash
git pull
git log --oneline -15                        # tìm commit "Ap dung ban sua tu Claude" ngay sau "patch NNNN"
git revert --no-commit <mã commit đó>
python3 -I tools/hoctap.py nangban
python3 -I tools/hoctap.py taopatch hoan-tac-NNNN
git revert --abort 2>/dev/null; git checkout -- . # trả bản trên máy về như GitHub, chờ Action áp dụng
```

## Nguyên tắc khi sửa

- **Sửa ít, đúng chỗ.** Giữ nguyên kiến trúc (tệp tĩnh, không bước build, không thêm thư viện ngoài). Theo phong cách sẵn có của từng tệp.
- Chữ trên giao diện và chú thích trong mã: **tiếng Việt có dấu**, lời lẽ khích lệ, dễ hiểu với bé lớp 2 và lớp 6.
- **Thiết kế cho iPad** (các con học chủ yếu trên iPad, cả ngang lẫn dọc), sau đó kiểm tra iPhone: nút chạm tối thiểu 44 px, `touch-action: manipulation`, chữ đủ to.
- **Không làm mất tiến độ:** đọc ba quy tắc ở đầu `SUA-NOI-DUNG.md`. Thay đổi cách lưu dữ liệu thì phải đọc được dữ liệu cũ.
- **Trước thay đổi có đụng tới dữ liệu đã lưu** (chuyển định dạng, tính lại sao, xoá dữ liệu): nhắc bố mẹ bấm **Sao lưu** trong Góc bố mẹ trước.
- Sao, quy tắc thưởng phạt, danh hiệu là thoả thuận của gia đình: chỉ đổi khi bố mẹ đã chốt.
- Không bao giờ ghi mã gia đình hay đường link `#ma=` vào kho, tài liệu hay lời nhắn commit.

## Thêm một máy mới cho các con

Mở đường link đầy đủ có `#ma=…` (bố mẹ giữ link này) một lần trên máy đó, rồi trong Safari chọn Chia sẻ → Thêm vào MH chính. Máy chưa có mã sẽ hiện ô nhập mã; dán cả đường link hay chỉ phần mã đều được.
