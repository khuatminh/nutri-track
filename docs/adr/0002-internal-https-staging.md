# ADR 0002: Staging HTTPS nội bộ bằng Docker Compose + Caddy

- **Trạng thái:** Accepted
- **Task:** QLD-31
- **Người quyết định:** CTO

## Bối cảnh

QA cần URL HTTPS, build production đúng SHA và quy trình backup/restore để đo NFR-05 và NFR-07. Ràng buộc: không deploy production, không public, không phát sinh dịch vụ trả phí hay credential mới. Repo chưa có hạ tầng triển khai.

## Quyết định

- Chạy `db`, `mailpit`, `app`, `caddy` bằng một Compose project riêng (`nutritrack_staging`), mọi cổng publish đều bind `127.0.0.1`. DB không publish cổng.
- Caddy kết thúc TLS bằng CA nội bộ (`tls internal`) tại hostname riêng `nutritrack-staging.localhost`. CA không được cài vào trust store của máy.
- App chạy trong container với `restart: unless-stopped` để URL còn sống qua các heartbeat, thay vì tiến trình nền trên host.
- Backup bằng `pg_dump -Fc` mã hóa GnuPG AES-256. Restore luôn vào DB mới và so fingerprint từng bảng.

## Phương án đã loại

- **Cloudflare Tunnel, Tailscale Funnel:** có chứng chỉ công khai nhưng đưa dữ liệu và app ra ngoài, trái ràng buộc không public.
- **PaaS preview (Vercel và tương tự):** cần tài khoản hoặc credential mới, và vẫn cần thêm DB ngoài.
- **`mkcert`:** cert được browser tin cậy nhưng phải cài CA vào trust store, tức đổi cấu hình hệ thống của máy dùng chung.
- **`openssl enc` cho backup:** chế độ CBC không tự kiểm toàn vẹn.

## Hệ quả

- QA có môi trường production-build thật, cookie `Secure` hoạt động, không tốn chi phí.
- Browser không tin cert nếu không có cờ bỏ qua, nên độ hợp lệ của cert phải kiểm bằng `curl --cacert`.
- Không đo được trên thiết bị thật và số đo hiệu năng không đại diện production. Giới hạn nêu trong [runbook](../ops/staging-https-backup.md).
- Trước khi lên production cần ADR riêng về hạ tầng, chứng chỉ, lưu trữ backup ngoài máy, quản lý khóa và RPO/RTO.
