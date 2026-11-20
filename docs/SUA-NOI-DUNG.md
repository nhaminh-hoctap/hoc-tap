# Sửa nội dung học và quy tắc sao

Tài liệu tra cứu khi cần thêm từ, thêm bài, sửa câu hỏi, đổi quy tắc sao / thi đua. Luôn kèm `docs/QUY-TRINH-SUA.md` (cách kiểm tra và đẩy bản sửa).

## ⚠️ Ba quy tắc không được phá (để không mất tiến độ của các con)

1. **Từ vựng: thứ tự trong `words.json` là thứ tự học, và lịch ôn lưu theo số thứ tự từ.** Chỉ được *thêm vào cuối* hoặc *sửa chữ / nghĩa tại chỗ*. Không chèn, không xoá, không đảo từ ở giữa danh sách — làm vậy các từ đã học sẽ bị gán nhầm lịch ôn, sao thuộc chắc theo khối cũng lệch.
2. **Lớp 6: câu hỏi được nhớ theo vị trí** (`<mã bài>:s<số thứ tự>` cho `qs`, `:g<số>` cho `gen`, `:c<số>` cho `cards`). Chỉ *thêm vào cuối* mảng; sửa lời câu hỏi tại chỗ được, nhưng không chèn / xoá / đảo.
3. **Mã bài là khoá của tiến độ**: Lớp 2 `t<số bài>`, `w<số tuần>`, `c<số chủ đề>`, `r<mã chủ điểm>`; Lớp 6 `t1`, `t2`…, `v1d`, `v1w`…. Không đổi số / mã của bài đã có.

## 1. Học từ vựng (`words.json`, `tuvung.html`)

`words.json` là danh sách 2 bé theo thứ tự `anhphong`, `thanhnghi`:

```json
{"id": "anhphong", "name": "Anh Phong", "note": "Lớp 2",
 "words": [["Red", "Màu đỏ", 0], ["Grey (Gray)", "Màu xám", 0], …]}
```

- Mỗi từ: `["tiếng Anh", "nghĩa tiếng Việt", mức]`. Mức `0` là danh sách gốc của bé (Thanh Nghị giữ nguyên thứ tự 1–700, Anh Phong 1–500), `1`→`5` là phần bổ sung xếp từ dễ đến khó. Ứng dụng hiện chưa dùng trường mức.
- Cách viết khác đặt trong ngoặc, cách nhau bởi `/` hoặc `,`: `"Grey (Gray)"` — bé nói hay gõ cách nào cũng được chấm đúng.
- Mỗi bé có 3.000 từ. Một số chữ trùng nhau có chủ ý vì khác nghĩa (`watch`: xem / đồng hồ).
- Hình minh hoạ: bảng `EMOJI` (mục `pictures & example sentences` trong `tuvung.html`). Bố mẹ có thể tự sửa nghĩa và hình ngay trong ứng dụng; phần sửa đó lưu ở `vocab_enrich_v1`, không cần sửa mã.
- Mặc định mỗi bé học **5 từ mới/ngày** (`l.per`); mỗi ngày đưa thêm tối đa `l.old` từ cũ chưa có lịch ôn vào bài ôn (đã chỉnh còn 10). Bố mẹ đổi trong Cài đặt Học từ vựng.
- **Đổi cài đặt đã lưu sẵn trên máy các con** (không chỉ giá trị mặc định): thêm một khối chạy một lần trong phần `INIT` của `tuvung.html` với cờ mới, theo mẫu `vocab_cfg_20261119`, và thêm tên cờ vào `SYNC_KEYS` để máy khác không chạy lại.
- Lịch ôn: `INTERVALS = [1, 3, 7, 14, 30, 60]` ngày. Từ "thuộc chắc" khi đi hết lịch (`srs[n].m`).
- Bốn bước của Từ vựng: ① Học từ mới ② Ôn tập ③ Luyện thêm theo ý mình (50 câu) ④ Luyện nghe & nói (máy chấm phát âm bằng nhận dạng giọng nói của trình duyệt). Anh Phong có thêm Phonics.

## 2. Vở Vui Lớp 2 (`lop2.html`)

Các khối chính (tìm theo tiêu đề chú thích `/* ===== … ===== */`):

| Khối | Nội dung |
|---|---|
| `LOP2_GIANG` (đầu tệp) | Bài giảng Toán: `B(số bài, [[tiêu đề, html], …])`. Dùng `eg('…')` cho ví dụ, `nho('…')` cho ô "Nhớ nhé". Mục "💡 Nhớ nhé" được tự lấy lại cho bài *Luyện tập chung*. |
| `LOP2_TV` | Phần giảng Tiếng Việt: `read` (cách đọc), `spell[cặp]` = `[quy tắc, ví dụ]`, `skill` = `[[biểu thức, tiêu đề, html]]` ghép theo mô tả tuần, `hoa(chữ)` cho chữ hoa. |
| `TIỆN ÍCH`, `các dạng câu hỏi` | Hàm dựng câu hỏi: `Q_choice`, `Q_number`, `Q_order`, `Q_match`, `Q_sort`, `Q_multi`, `Q_gaps` (điền dấu phẩy), `Q_pay` (trả tiền), `Q_clockset` (chỉnh kim đồng hồ). |
| `TOÁN`, `TIẾNG VIỆT` | Các hàm sinh câu `g_…` (mỗi lần gọi ra một câu ngẫu nhiên). `key` dùng để tránh lặp câu trong một lượt. |
| `BÀI ĐỌC` | `STORIES[s1…]` = `{theme, title, text, qs:[[câu hỏi, đáp án đúng, [đáp án sai…]], …]}`. |
| `DANH MỤC THEO SGK` | `CHAPTERS` (Toán, 14 chủ đề) và `UNITS` (Tiếng Việt, 35 tuần). |
| `GIAI ĐOẠN` | `PERIODS`: Giữa kì 1 · Học kì 1 · Giữa kì 2 · Học kì 2. |
| `LUYỆN TÍNH NHANH & BẢNG CỬU CHƯƠNG` | Cộng trừ nhanh, bảng nhân / chia 2–9, kỉ lục. |
| `GÓC PHỤ HUYNH` | Số câu mỗi lượt (10 / 20 / 30), tự đọc đề, kết quả. |

**Thêm một bài Toán**: trong `CHAPTERS`, thêm `L(số bài, 'Tên bài', [g_a, g_b, () => g_c(tham số)])` vào `lessons` của chủ đề. Bài ôn: `L(số, 'Ôn tập …', {from: [các số bài]})`. Rồi thêm bài giảng `B(số bài, [...])` vào `LOP2_GIANG`.

**Thêm một tuần Tiếng Việt**: `W(tuần, [số bài SGK], ['Bài đọc 1', 'Bài đọc 2'], 'Chữ hoa', ['cặp chính tả', …], 'Mô tả kĩ năng', [hàm sinh câu…])`. Mô tả kĩ năng được so với `LOP2_TV.skill` để tự ghép phần giảng.

**Thêm một dạng câu mới**: viết hàm `g_ten()` trả về một trong các `Q_…` ở trên, có `explain` (lời giải thích dễ hiểu cho bé lớp 2) và `speak` nếu cần đọc đề khác chữ hiện trên màn hình.

## 3. Vở ôn luyện lớp 6 (`lop6.html`)

Dữ liệu bài học nằm trong `DATA.toan` (Toán 6, chương I–IX) và `DATA.van` (Ngữ văn 6, bài 1–10), mỗi chương:

```js
C.push({ title: 'Chương I. …', vol: 1, lessons: [
  { id: 't1', no: 'Bài 1', vol: 1, title: 'Tập hợp',
    goal: 'mục tiêu của bài',
    sum: ['ý chính 1 (có thể dùng <b>…</b>)', …],
    tip: 'mẹo nhớ',
    ex: [['đề ví dụ', 'lời giải'], …],
    cards: [['câu hỏi thẻ', 'đáp án'], …],
    qs: [
      ['m', 'câu trắc nghiệm', ['đúng', 'sai 1', 'sai 2', 'sai 3'], 0, 'giải thích'],   // chỉ số đáp án đúng; thêm true ở cuối để giữ nguyên thứ tự phương án
      ['t', 'câu đúng / sai', true, 'giải thích'],
      ['i', 'câu điền số', 42, 'giải thích', 'gợi ý ô nhập']
    ],
    gen: [ function () { return inNum('…', đáp_số, 'giải thích'); }, … ]
  }, … ] });
```

- Hàm hỗ trợ khi viết `gen`: `ri(a,b)`, `pick`, `shuffle`, `gcd`, `lcm`, `isPrime`, `fmt` (viết số có dấu cách như SGK), `dec`, `F(tử, mẫu)` (phân số HTML), `Fr`, `mNum(câu, đáp án, [phương án nhiễu], giải thích)`, `inNum(câu, đáp án, giải thích, gợi ý)`.
- **`LOP6_PLUS`** (các khối `<script>` ở đầu tệp) bổ sung nội dung soạn sẵn cho từng mã bài mà không đụng vào dữ liệu gốc:
  - `g`: bài giảng `[[tiêu đề, html], …]` (🎒 Bắt đầu từ chuyện quen thuộc · 📖 Hiểu bài · ✍️ Làm mẫu từng bước · ⚠️ Lỗi hay gặp …)
  - `h`: Hỏi thầy `[[câu hỏi của bé, lời thầy], …]` · `k`: tự kiểm tra `[[câu, đáp án], …]`
  - `e`: giải thích bổ sung cho câu `qs` chưa có giải thích `{số thứ tự: 'giải thích'}`
  - `q`: câu hỏi thêm (được nối vào **cuối** `qs`) · `c`: thẻ thêm · `w`: bài mẫu, bảng chấm cho bố mẹ ở bài Viết
- Người dùng muốn bài giảng **chi tiết nhưng dễ hiểu**; đã bỏ gia sư AI của Thanh Nghị.

## 4. Sao thưởng

Sao của mọi môn dồn vào một kho chung (xem `KIEN-TRUC.md`). Các nơi đặt quy tắc:

| Quy tắc | Nằm ở | Giá trị hiện tại |
|---|---|---|
| Sao Toán / Tiếng Việt lớp 2 | `bank.js` → `RULES.anhphong` | Luyện 1 bài từ 10 câu: đúng hết +2, từ 90% +1 (tối đa 4 lần/ngày) · Lần đầu đạt từ 90% ở một bài +2 · Kiểm tra: từ 95% +5, từ 90% +3, từ 80% +1 (tối đa 2/ngày) · Phá kỉ lục tính nhẩm / cửu chương +1 (tối đa 2/ngày) |
| Sao Toán / Ngữ văn lớp 6 | `bank.js` → `RULES.thanhnghi` | Luyện 10 câu: 100% +2, từ 90% +1 (4/ngày) · Ôn đến hạn từ 10 câu, từ 90% +2 (1/ngày) · Sửa đúng từ 5 câu Sổ lỗi sai +1 (1/ngày) · Hoàn thành bài học lần đầu +3 · Kiểm tra từ 20 câu: từ 98% +5, 94% +3, 90% +1 (2/ngày) · Bài viết bố mẹ chấm +2 đến +10 |
| Sao Từ vựng hằng ngày | `tuvung.html` → `STAR`, `STAR2` | Học từ mới xong +2 (1 lần/ngày; đã bỏ "Học thêm" — mỗi ngày học đúng số từ quy định) · Ôn xong +1, đúng ngay từ 90% +1 · Chuỗi 7 ngày +10, 30 ngày +50 · Luyện thêm 50 câu (từ 20 từ khác nhau, 4 bài/ngày): 45–46 đúng +1, 47–48 +3, 49–50 +5 · Nghe & nói (2 bài/ngày): đúng 80–90% +3, 91–100% +5 · Mục tiêu tuần (5/7 ngày) +5. Đã bỏ "Kiểm tra từ cũ" (từ cũ vào dần bài Ôn tập theo cài đặt `l.old`) và Phonics (`PHON_ON = false`). |
| Thưởng thuộc chắc theo khối | `tuvung.html` → `BLOCK_SPLIT`, `blockOf`, `STAR.blockLow`, `STAR.blockStars` | (Chốt 19/11/2026) Anh Phong từ 1–400, Thanh Nghị từ 1–600: mỗi khối 50 từ thuộc chắc = 50 sao. Từ 401 / 601 trở đi: mỗi khối 50 từ = 150 sao. Khối nào đủ thì thưởng khối đó, mỗi khối một lần. Sao bố mẹ thưởng ngoài ứng dụng trước đây (theo số từ đã học) không ảnh hưởng đến quy tắc này. Từ "thuộc chắc" khi lên mức ôn 3 qua Ôn tập, Luyện thêm, Nghe & nói. |
| Quy tắc gia đình (việc nhà, phạt, đổi quà) | `tuvung.html` → `FAMILY` | Theo tệp "Quy tắc tích sao – V3" trên NotebookLM. `earn` thưởng, `pen` phạt (`both` trừ cả hai anh em), `spend` tiêu sao (1 sao = 1.000đ; game/TV 1 sao = 3 phút, tối đa `TIME_MAX` = 60 phút/ngày). Thưởng thêm tự nhập tối đa 100 sao/lần. |

Muốn đổi một mức thưởng: sửa đúng con số trong bảng trên; phần hiển thị quy tắc cho bé (`BANK.rulesHtml`, bảng quy tắc trong Sao thưởng, trang Cách chơi) tự lấy theo số mới. Kiểm tra lại câu chữ trong `THIDUA.howHtml` nếu quy tắc được nhắc bằng lời.

## 5. Thi đua (`thidua.js`)

Hằng số ở đầu tệp:

| Hằng số | Giá trị | Ý nghĩa |
|---|---|---|
| `START` | `2026-11-16` | Tuần đầu tiên tính đấu trường |
| điểm ngày | tối đa 15 | Tiếng Anh xong bài ngày +5 · Môn lớp đạt mục tiêu câu +4 · gấp đôi mục tiêu +2 · độ chính xác (từ 20 câu): từ 90% +2, từ 80% +1 · Rương báu +2 |
| `CUP` | 30 | Sao cho bé vô địch tuần (cần từ `WIN_MIN` = 50 điểm; hoà thì cả hai cùng nhận) |
| `GOOD`, `GOOD_MIN` | 15, 60 | Bé không vô địch nhưng đạt từ 60 điểm được +15 sao |
| `SHIELD_MIN`, `SHIELD_MAX` | 75, 2 | Tuần đạt từ 75 điểm được 1 khiên (nhận thứ Hai tuần sau, giữ tối đa 2); khiên giữ chuỗi khi lỡ một ngày |
| `NEWW` | 5 | Rương báu: học xong 5 từ mới (cả bước kiểm tra từ mới) + ôn tập + 2 bài luyện thêm trọn vẹn + 1 bài nghe & nói trọn vẹn → ngẫu nhiên 5–10 sao |
| `SPECIES`, `PNAMES` | 9 cấp | Linh vật = thú trong 🐾 Nuôi thú. Học được **xu** (= năng lượng cũ: ngày xong tiếng Anh +10, đạt mục tiêu môn lớp +5, rương báu +3, mỗi cúp +20; `THIDUA.xu`). Thú lớn theo **điểm lớn** từ việc cho ăn (`base`+`grow` trong `thu-cung/<bé>`), mốc 0, 40, 100, 200, 350, 550, 800, 1100, 1500. |

Danh hiệu và khung tên (7 cấp, khung `f1`→`f7`) do Từ vựng tính từ điểm huy hiệu và lưu ở `vocab_title_v1`; `bank.js` chỉ vẽ (`BANK.nameplate`).

## 6. Nuôi thú (`nuoithu.html`)

Bố mẹ chốt 20/11/2026 (số ở `CFG` đầu khối script):
- **Thức ăn**: mua bằng xu (phần ăn 5 xu, món đặc biệt 15 xu) hoặc bằng sao (3 ⭐ / 10 ⭐, tối đa 3 lần mua bằng sao/ngày). Ăn: phần ăn +5 điểm lớn, no bụng +20; món đặc biệt +15 điểm lớn, no bụng +35. No đầy 100 thì chờ đói bớt mới ăn tiếp; no bụng giảm 4/giờ, vui vẻ giảm 15/ngày. Thú không bao giờ lùi cấp.
- **Chuyển đổi lần đầu**: toàn bộ năng lượng các con đã có trở thành xu; thú bắt đầu lại từ trứng (`xu0 = 0`, `base = 0`).
- **Trò chơi**: chỉ mở khi xong các việc chính của 🎯 Nhiệm vụ hôm nay; tổng 5 lượt/ngày cho cả 4 trò (Hứng sao, Thú trốn ở đâu, Bắn bóng màu, Lật hình ghép đôi). Bắn bóng: Anh Phong 4 màu, có vòng chỉ chỗ bóng dính, bóng cầu vồng mỗi 5 lượt; Thanh Nghị 5 màu, cầu vồng mỗi 9 lượt. Chơi chỉ làm thú vui.
- **Phông nền** (`DECO.bg`): cần đủ cả số huy hiệu `b` và cấp danh hiệu `r` (Bãi biển 2/2, Rừng nấm 4/2, Vương quốc băng 6/3, Núi lửa 9/4, Đền trên mây 12/5, Vũ trụ 16/6, Lâu đài hoàng gia 20/7).
- **Không cộng sao hay điểm đấu trường.**
