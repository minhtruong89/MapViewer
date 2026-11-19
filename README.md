# MapAnalyzer — Công cụ phân tích Nơi ở & Ăn uống từ Google Maps

Ứng dụng web cho phép chọn một điểm trung tâm trên bản đồ, điều chỉnh bán kính (0.5–30 km) và thu thập thông tin các địa điểm **Nơi ở** và **Ăn uống** từ Google Maps.

## Tính năng chính
- **Bản đồ tương tác (Leaflet + OpenStreetMap)**: Nhấp trực tiếp lên bản đồ để đặt tâm, tìm kiếm khu vực qua Nominatim, hoặc bấm **Đặt tâm** ngay trên thẻ kết quả để đặt điểm đó làm tâm mới và lưu vào danh sách **Điểm trung tâm** (có thể xóa từng điểm và tự động nhớ tâm cuối cùng đã chọn, mặc định fallback về **Chợ Đà Lạt**).
- **Hai nhóm địa điểm & tùy chọn mở rộng**: Quét **Nơi ở** (khách sạn, homestay, resort), **Ăn uống** (nhà hàng, quán ăn, cafe) hoặc **Tất cả**, hỗ trợ **Từ khóa thêm** (nhấn `Enter` để quét) và số lượng tối đa lên tới **200 điểm**.
- **Thông tin chi tiết**: Ảnh đại diện, bộ sưu tập ảnh trong modal (hỗ trợ phím `Esc`, `←`, `→`), số sao đánh giá, tổng lượt review, khoảng cách từ tâm, địa chỉ, số điện thoại (nhấp để gọi `tel:`), giờ mở cửa, website và liên kết mở nhanh Google Maps.
- **Tải ngầm danh sách dài**: Khi danh sách còn thẻ thiếu ảnh đại diện, hàng đợi tải ngầm chạy tuần tự mà không ảnh hưởng thao tác cuộn; tự tạm dừng khi rời tab **Tìm kiếm** và sắp xếp lại thứ tự ưu tiên theo bộ lọc / kiểu sắp xếp hiện tại.
- **Lọc & Sắp xếp**: Sắp xếp theo số sao cao/thấp nhất, nhiều/ít review nhất, gần tâm nhất; lọc theo loại địa điểm, số sao tối thiểu, số lượt review tối thiểu và từ khóa.
- **Quản lý Xem map**: Lưu địa điểm vào nhiều map tùy chỉnh, xem vị trí tương quan trên bản đồ kèm nhãn tên & điểm sao, **đổi tên map**, **xác nhận trước khi xóa**, lọc/sắp xếp trong từng map, nhấp 1 điểm làm **Điểm mốc** để xem khoảng cách tương đối tới các điểm còn lại, và **Xuất / Nhập file JSON** để sao lưu hoặc chuyển dữ liệu giữa các thiết bị.

## Cách chạy trên máy cá nhân
```bash
npm install
npm run dev
```
Sau đó mở trình duyệt tại `http://localhost:5173`.

### Đăng nhập hồ sơ Google (tùy chọn khi chạy local)
Nếu muốn sử dụng phiên đăng nhập Google cá nhân cho trình duyệt quét (lưu tại `.browser-profile`, không commit lên Git), có thể bấm nút **Đăng nhập Google** trên thanh header hoặc chạy:
```bash
npm run login
```
Đăng nhập xong rồi đóng cửa sổ trình duyệt vừa mở để lưu phiên.

## Triển khai với Docker / Railway
Dự án sử dụng `Dockerfile` (`node:22-bookworm-slim` + Playwright Chromium) và cấu hình trong `railway.json` (healthcheck tại `/api/health`). Khi build container:
```bash
npm ci
npx playwright-core install chromium --with-deps
npm run build
npm start
```
Server Express phục vụ cả API (`/api/*`) lẫn bản build frontend tĩnh trong `dist/` trên cổng `PORT` (mặc định `3001`).
