# Smart F&B Chain Platform — App tại quầy (Cashier + Barista)

Bản phác thảo giao diện **tablet** cho hai actor vận hành tại quầy trong đồ án
_Smart F&B Chain Platform (SP26SE123)_ — bám **Đặc tả v8.1**: chuỗi F&B **gọi món và trả tiền
trước tại quầy** (cà phê, trà sữa, đồ ăn nhanh), món xuống quầy pha chế sau khi thanh toán, gọi số
để khách nhận.

- **Cashier (Thu ngân)** — POS: tạo đơn có tuỳ chọn món, thu tiền mặt / QR, in bill + phiếu số, lịch sử đơn.
- **Barista (Pha chế)** — hàng đợi **gom mẻ**, cập nhật trạng thái, gọi số, báo hết món/topping.
- **Stack:** Expo SDK 54 · React Native · TypeScript · expo-router
- **UI:** `@ant-design/react-native` (ant-design-mobile-rn), theme **trắng–đen** (nền sáng, chỉ 1 chế độ)
- **Icon:** `lucide-react-native` (gom ở `src/components/ui/icon.tsx`)
- **Font:** HarmonyOS Sans — file `.ttf` trong `assets/fonts/`, phủ toàn cục qua `src/theme/global-font.ts`
- **HTTP client:** `axios` còn trong dependencies nhưng **chưa dùng** — mọi API cũ đã gỡ.
- **Dữ liệu:** hoàn toàn **mock** trong `src/data/` (chưa nối backend / Socket.IO / PayOS)

## Chạy thử

```bash
pnpm install
pnpm start        # rồi bấm a / i / w
# hoặc web trực tiếp:
pnpm web
```

### Cài Expo Go v54 trên Android (qua APKMirror)

Dự án dùng **Expo SDK 54**, nên máy Android test cần đúng bản **Expo Go 54** để quét
QR từ `pnpm start` chạy được. Nếu Play Store chỉ cho tải bản Expo Go mới hơn/khác SDK,
cài thủ công từ APKMirror như sau:

1. **Cài Universal Installer** (app hỗ trợ cài file `.apkm`/bundle từ APKMirror) từ Play Store:
   https://play.google.com/store/apps/details?id=app.pwhs.universalinstaller
2. Trên máy/máy ảo Android, mở link Expo Go 54.0.8 trên APKMirror và tải file `.apkm`:
   https://www.apkmirror.com/apk/expo-project/expo-go/expo-go-54-0-8-release/expo-go-54-0-8-android-apk-download/
3. Vì APKMirror trả về file `.apkm` (bundle nhiều APK theo kiến trúc CPU/ngôn ngữ, không cài
   trực tiếp như `.apk` thường), mở file `.apkm` vừa tải **bằng app Universal Installer** ở
   bước 1 (chọn Universal Installer trong hộp thoại "Open with" hoặc mở từ trong app) để nó
   giải nén và cài đúng bộ APK phù hợp với máy.
4. Cho phép "Cài ứng dụng không rõ nguồn gốc" (Install unknown apps) nếu Android yêu cầu.
5. Sau khi cài xong, mở Expo Go, quét QR hiển thị ở terminal khi chạy `pnpm start`.

> Lưu ý: chỉ tải APK/APKM từ nguồn chính chủ (APKMirror) và kiểm tra đúng version
> `54.0.8` khớp SDK 54 của dự án để tránh lỗi không tương thích khi load bundle.

## Màn hình

| Route                     | Use case      | Nội dung                                                                                         |
| ------------------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| `app/login.tsx`           | CM-01         | Đăng nhập **mô phỏng**: chọn tài khoản mẫu Thu ngân / Pha chế (chưa có backend)                    |
| `app/(cashier)/pos.tsx`   | CS-01…CS-04   | POS: chọn món + tuỳ chọn (size/đường/đá/topping), giỏ, thanh toán tiền mặt (xác nhận đã thu) hoặc QR; lọc "Tất cả" + tìm món |
| `app/(cashier)/orders.tsx`| CS-05         | Lịch sử đơn trong ngày, xem lại và in lại bill/phiếu số                                           |
| `app/(barista)/queue.tsx` | BA-01, BA-02  | Hàng đợi gom mẻ, Bắt đầu / Xong, gọi số, "Sẵn sàng nhận" → Đã giao                                |
| `app/(barista)/menu.tsx`  | BA-03         | Bật/tắt món và topping (hết hàng) — POS chặn bán ngay                                             |
| `app/(*)/account.tsx`     | CM-02         | Tài khoản, ngôn ngữ, đăng xuất                                                                    |

Điều hướng: **Navigation Rail** dọc bên trái (`src/components/nav-rail.tsx`),
thu gọn icon-only khi bề rộng < 820. Layout co giãn cho cả ngang lẫn dọc.

## Ghi chú

- **Thuật toán gom món** ở `src/data/batching.ts` (mục 8 đặc tả): cùng món + size, trong cửa sổ 5 phút,
  tối đa 4 ly một mẻ, mẻ đầu hàng đợi luôn chứa ly chờ lâu nhất. Hàm thuần, không phụ thuộc UI.
- `src/data/store.tsx` — toàn bộ luồng chạy trên mock: giỏ, chốt đơn (chụp giá lúc bán), thanh toán
  (tiền mặt / QR có đếm ngược, hết hạn thì huỷ đơn), cấp số gọi theo ngày, hàng đợi pha chế. Đơn và menu
  **giữ nguyên khi đăng xuất** để demo Cashier → đăng xuất → Barista trên cùng một máy.
- **In bill / phiếu số (CS-04, BR-21):** chưa in thật. Bản có backend dựng bill thành ảnh rồi gửi ESC/POS tới máy in nhiệt
  (Bluetooth/WiFi). App mô phỏng trạng thái in: in lỗi **không chặn** thanh toán và đơn vẫn xuống pha chế; POS hiện
  cảnh báo **In thất bại** + nút **In lại**, lịch sử đơn có nhãn. Bật công tắc **Giả lập: máy in lỗi** ở Tài khoản (Thu ngân) để thử.
- QR ở POS là mã giả (`SMARTFNB|mã đơn|số tiền`); nút **"Giả lập: khách đã chuyển khoản"** thay cho webhook PayOS.
- Chưa làm: màn hình phía khách, màn hình gọi số, ghép thiết bị, Socket.IO, Manager/Owner.
- Font HarmonyOS Sans được phủ lên **mọi** `<Text>` (kể cả bên trong component antd)
  bằng patch `Text.render` trong `src/theme/global-font.ts`.
- Lớp UI dùng chung ở `src/components/ui/` (`Btn`, `IconButton`, `Pill`, `Segmented`,
  `Stepper`, `Field`, `AppModal`, `Txt`) — Pressable/antd + token theme.
- Theme token trắng–đen: `src/theme/antd-theme.ts` (`lightTheme`).
