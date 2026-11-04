# Staging HTTPS nội bộ và backup/restore

Môi trường để QA đo NFR-05 và NFR-07 ([ADR 0002](../adr/0002-internal-https-staging.md)). Chỉ chứa dữ liệu giả. Đây không phải production và không truy cập được từ ngoài máy chủ.

## Thông số

| Mục | Giá trị |
| --- | --- |
| URL | `https://nutritrack-staging.localhost:8443` |
| HTTP (redirect 301 sang HTTPS) | `http://nutritrack-staging.localhost:8480` |
| Mailpit (đọc email reset mật khẩu) | `http://127.0.0.1:8026` |
| CA để kiểm chứng chỉ | `.staging/ca-root.crt` |
| SHA đang chạy | `.staging/STAGING_SHA`, đối chiếu với nhãn `org.opencontainers.image.revision` của image |
| Worktree vận hành | `/Users/justminh/Documents/ChatGPT/QLDA_PM-ci`, không đổi nhánh ở đây khi QA đang đo |

Build là production thật: `next build` + `next start`, `NODE_ENV=production`, cookie `Secure`, không đặt `DISABLE_RATE_LIMIT`. Rate limit đang bật nên kịch bản đăng ký hàng loạt có thể bị chặn đúng thiết kế.

## Khởi động

```bash
bash scripts/staging/up.sh   # từ chối chạy nếu working tree bẩn, vì SHA sẽ không mô tả đúng bản build
```

Container dùng `restart: unless-stopped`. Lệnh chạy lần đầu sinh mật khẩu DB và passphrase backup vào `.staging/` (quyền `700`/`600`, đã gitignore). Không chép các file này vào comment, tài liệu hay log.

## Kiểm HTTPS

```bash
curl --cacert .staging/ca-root.crt -I https://nutritrack-staging.localhost:8443/dang-nhap
```

Chứng chỉ do CA cục bộ của Caddy cấp, và CA này không được cài vào trust store của máy. Vì vậy:

- Dùng `curl --cacert` hoặc `openssl s_client -CAfile` để kiểm chứng chỉ hợp lệ.
- Browser sẽ báo cert không tin cậy nếu không có cờ bỏ qua. `ignoreHTTPSErrors` chỉ để chạy luồng, không phải bằng chứng cert hợp lệ.
- Chromium và Firefox tự phân giải `*.localhost`. Công cụ khác (có thể gồm Safari) cần ánh xạ host về `127.0.0.1`; việc đó sửa cấu hình máy nên phải hỏi trước.

Hostname riêng được dùng vì app gửi HSTS `includeSubDomains`: nếu dùng `localhost`, HSTS có thể ảnh hưởng mọi app dev khác trên máy.

Chạy E2E qua HTTPS (mỗi project đăng ký một user):

```bash
pnpm exec playwright test -c scripts/staging/playwright.staging.config.ts --project=desktop-light
```

## Backup và restore

```bash
bash scripts/staging/backup.sh
bash scripts/staging/restore.sh "$PWD/.staging/backups/<tên>.dump.gpg" [--drop-after]
```

- **Backup:** `pg_dump -Fc`, mã hóa đối xứng AES-256 bằng GnuPG (có kiểm toàn vẹn), kèm file `.sha256` và `.fingerprint` (số dòng + MD5 nội dung từng bảng).
- **Điều kiện:** không ghi vào DB khi backup, vì fingerprint và dump là hai lần đọc riêng. Có ghi đồng thời thì restore sẽ báo sai khác.
- **Restore:** kiểm checksum, tạo DB mới `nutritrack_restore_<thời gian>`, khôi phục, rồi so fingerprint. Script không bao giờ ghi đè DB `nutritrack`. Nếu sai khác, DB được giữ lại để chẩn đoán và script thoát với mã khác 0.
- **Quản lý khóa:** passphrase nằm ở `.staging/backup.passphrase`, cùng máy với backup. Như vậy đủ cho staging, không đủ cho production.

Bằng chứng một lần chạy: [`evidence/qld-31-backup-restore.log`](evidence/qld-31-backup-restore.log).

## Giới hạn khi đọc kết quả đo

- **Hạ tầng:** Docker Desktop trên một máy Mac dùng chung (aarch64, khoảng 5 GB RAM cho Docker). Số đo TTI/dashboard không đại diện cho hạ tầng production, kể cả khi đã giả lập 4G và CPU phía client.
- **Thiết bị thật:** iPhone hoặc máy khác không vào được vì mọi cổng chỉ bind `127.0.0.1`. Mở ra LAN hoặc tunnel là quyết định riêng.
- **CSP:** app chưa gửi header `Content-Security-Policy`, trong khi NFR-07 yêu cầu. Phải ghi là Fail cho đến khi có bản sửa.
- **Backup:** đây là quy trình chạy tay, chưa có lịch tự động, chưa lưu ngoài máy, chưa đặt RPO/RTO.

## Dọn dẹp

```bash
docker compose --env-file .staging/secrets.env -f scripts/staging/compose.yml down      # giữ dữ liệu
docker compose --env-file .staging/secrets.env -f scripts/staging/compose.yml down -v   # xóa cả dữ liệu staging
```
