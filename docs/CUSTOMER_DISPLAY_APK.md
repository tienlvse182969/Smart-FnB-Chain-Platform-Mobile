# Màn hình phụ thu ngân và APK

Ứng dụng Android dùng chung ba chế độ: Cashier, Barista và màn hình khách. Ở màn
đăng nhập, chọn **Dùng máy này làm màn hình khách**. Thiết bị tạo mã sáu số; Cashier
hoặc Branch Manager nhập mã đó khi ghép màn hình vào quầy.

Sau khi ghép, device token được lưu bằng Expo SecureStore. Ứng dụng tự lấy snapshot
hiện tại từ Backend và tiếp tục nhận giỏ hàng, QR, trạng thái thanh toán qua Socket.IO.
Manager thu hồi thiết bị thì socket bị ngắt và máy quay về bước thiết lập.

## Biến môi trường

```env
EXPO_PUBLIC_API_BASE_URL=https://smart-fnb-be.onrender.com/api/v1
EXPO_PUBLIC_REALTIME_PATH=/socket.io
EXPO_PUBLIC_DISPLAY_PAIRING_MOCK=false
```

Không đưa `PAYOS_MASTER_KEY`, Client ID, API Key hoặc Checksum Key vào ứng dụng.

## Xuất APK thử nghiệm

```bash
pnpm dlx eas-cli login
pnpm dlx eas-cli build --platform android --profile preview
```

Profile `preview` trong `eas.json` xuất APK cài trực tiếp. Profile `production` xuất
AAB để phát hành qua Google Play.
