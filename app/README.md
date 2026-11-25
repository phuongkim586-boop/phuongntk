# Tra cứu chứng từ kho – giao diện React

Ngăn xếp: React 18 + Vite + TypeScript, Tailwind CSS, React Router, TanStack Query, Supabase (Auth Google, Postgres, RLS).
Phần xử lý dữ liệu: Python (`../tools/sap_sync.py`).

## Chạy thử
```
cd app
cp .env.example .env
npm install
npm run dev
```

## Đưa lên GitHub Pages
```
npm run build      # tạo thư mục dist/
```
Sau đó đưa nội dung `dist/` vào thư mục `tra-cuu/` của trang (base đã đặt `/phuongntk/tra-cuu/`).

## Trạng thái
- Các mục đã có: đăng nhập Google, tra cứu theo số phiếu / PO / số yêu cầu / lệnh xuất, thống kê, làm mới dữ liệu, duyệt tài khoản.
- Chưa chuyển: trình xem PDF có xoay trang, xuất PDF/Excel gộp, mục hướng dẫn. Trang HTML cũ (`tra-cuu/index.html`) vẫn chạy cho đến khi các mục này được chuyển xong.
- Mã này được viết nhưng chưa biên dịch thử: máy tạo mã không tải được gói npm. Chạy `npm install && npm run build` để kiểm tra.
