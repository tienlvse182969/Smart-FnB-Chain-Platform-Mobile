# Smart F&B Chain Platform — App Phục vụ (Waiter)

Bản phác thảo giao diện **tablet** cho actor **Phục vụ (Waiter)** trong đồ án
_Smart F&B Chain Platform (SP26SE123)_ — bám **Phân tích nghiệp vụ v2**
(bỏ app khách, thanh toán trước qua QR, khái niệm **Table Session**, cơ chế **nhận việc bưng món**).

- **Stack:** Expo SDK 54 · React Native · TypeScript · expo-router
- **UI:** `@ant-design/react-native` (ant-design-mobile-rn), theme **trắng–đen** (nền sáng, chỉ 1 chế độ)
- **Icon:** `lucide-react-native` (gom ở `src/components/ui/icon.tsx`)
- **Font:** HarmonyOS Sans — file `.ttf` trong `assets/fonts/`, phủ toàn cục qua `src/theme/global-font.ts`
- **Dữ liệu:** hoàn toàn **mock** trong `src/data/` (chưa nối backend / Socket.IO)

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

## Màn hình (use case Waiter v2)

| Route                           | Use case          | Nội dung                                                                                            |
| ------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| `app/login.tsx`                 | WT-01             | Đăng nhập + check-in ca tại chi nhánh                                                               |
| `app/(waiter)/floor.tsx`        | WT-02, W03        | Sơ đồ bàn real-time; tap bàn Trống → mở phiên + kích hoạt QR; bàn Cần dọn → báo đã dọn              |
| `app/(waiter)/table/[id].tsx`   | WT-03,05,06,07,08 | Chi tiết **phiên bàn**: danh sách order (đọc), order thay khách, xử lý hết món, đổi bàn, đóng phiên |
| `app/(waiter)/ready.tsx`        | WT-04, W05        | Món **chờ bưng** — nhận việc (ai bấm trước thắng) rồi "Đã phục vụ"; leo thang khi chờ quá lâu       |
| `app/(waiter)/reservations.tsx` | backlog           | Danh sách đặt trước — **chỉ xem**                                                                   |
| `app/(waiter)/shift.tsx`        | WT-01             | Thông tin ca, phiên đang phụ trách, check-out                                                       |

Điều hướng: **Navigation Rail** dọc bên trái (`src/components/nav-rail.tsx`),
thu gọn icon-only khi bề rộng < 820. Layout co giãn cho cả ngang lẫn dọc.

## Ghi chú

- **Sơ đồ bàn** tô màu theo 4 trạng thái bàn để nhận diện nhanh — xanh lá (Trống), vàng (Đã đặt
  trước), xanh dương (Đang phục vụ), đỏ (Cần dọn) — bảng màu ở `src/theme/status-colors.ts`.
  Trạng thái món và phần còn lại của app vẫn đơn sắc trắng–đen (`src/components/status-badge.tsx`).
- `src/data/store.tsx` — mọi luồng nghiệp vụ v2 chạy trên mock: phiên bàn, order tự "xuống bếp"
  khi thanh toán (BR-03), backend sinh trạng thái "Chờ bưng" theo _chế độ ra món_ của danh mục
  (BR-07), khoá "nhận việc" theo waiter (BR-08), leo thang 3'/5' (BR-09). Mô phỏng bếp mỗi ~9s,
  tắt ở màn **Ca làm**.
- Font HarmonyOS Sans được phủ lên **mọi** `<Text>` (kể cả bên trong component antd)
  bằng patch `Text.render` trong `src/theme/global-font.ts`.
- Lớp UI dùng chung ở `src/components/ui/` (`Btn`, `IconButton`, `Pill`, `Segmented`,
  `Stepper`, `Field`, `AppModal`, `Txt`) — Pressable/antd + token theme.
- Theme token trắng–đen: `src/theme/antd-theme.ts` (`lightTheme`).
