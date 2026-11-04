# QLD-53 — Biên bản triển khai NutriTrack MVP lên VPS Oracle

- Thời điểm: 2026-11-04 19:30–20:01 UTC (2026-11-05 giờ Việt Nam).
- Người thực hiện: DevOps Engineer, theo yêu cầu trực tiếp của Board trên QLD-53.
- Phạm vi: deploy MVP lên VPS Oracle, reverse proxy + HTTPS + domain, kiểm tra nhanh.

## 1. Bản triển khai

| Mục | Giá trị |
| --- | --- |
| Commit release | `7321f97d4a67dd272d4e18b037c9ec0d2e96c61d` (`ops/qld-51-vps-deploy`, QLD-53) |
| MVP code gốc | `9c59002ee21bf37512c3dde78b8a488042ff8518` (PR #1, main `9b0c755`) |
| Image | `nutritrack:7321f97d4a67`, digest `sha256:715d303f…1117907`, `linux/arm64` |
| Kích thước | 655 MB trên đĩa, 156 MB khi nén để truyền |
| URL | https://nutritrack.khuatminh.com |
| VPS | Oracle `129.221.247.213`, user `ubuntu`, Ubuntu 22.04.5, `aarch64`, 4 vCPU / 23 GB |

Khác biệt so với MVP `9c59002`: chỉ thay đổi ops — build standalone ARM64, Caddy reverse
proxy, cấu hình `APP_URL`, script deploy/rollback. Không sửa code ứng dụng.

## 2. Kiến trúc đã dựng

```
Internet → Cloudflare (TLS) → cloudflared (VPS, outbound) → Caddy 127.0.0.1:8080
        → Next.js 127.0.0.1:3200 → Postgres volume vps_db
```

- Docker Engine 29.9.3 + Compose v5.7.0 cài mới trên VPS, enable cùng boot.
- Stack Compose `nutritrack_vps`: `db`, `mailpit`, `app`, `web` (Caddy). Mọi cổng bind loopback.
- Tunnel `nutritrack-vps` = `0571bc51-1ed4-459e-93af-d18b3ae21f8d`, systemd
  `cloudflared-nutritrack` (enabled), config `/etc/cloudflared/config.yml`.
- DNS: CNAME `nutritrack.khuatminh.com` → tunnel, proxy bật (Cloudflare cấp TLS).
- Inbound VPS: chỉ 22/tcp. Không mở 80/443; không cần sửa Oracle VCN/security list.

## 3. Kết quả kiểm chứng

### 3.1 Health check ngay sau deploy

```
healthcheck: OK (http://127.0.0.1:3200/dang-nhap → 200) after 1 attempt(s)
healthcheck: OK (http://127.0.0.1:8080/dang-nhap → 200) after 1 attempt(s)
```

### 3.2 HTTPS công khai

```
$ curl -sS -o /dev/null -w '%{http_code} %{ssl_verify_result} %{remote_ip}\n' \
    https://nutritrack.khuatminh.com/dang-nhap
200 0 172.67.167.40
```

Header trả về có `strict-transport-security`, `content-security-policy` (nonce), `via: 1.1 Caddy`.

### 3.3 Smoke test chức năng

- `e2e/smoke.spec.ts` chạy qua origin VPS (tunnel SSH, không qua Cloudflare):
  **1 passed (27.6s)** — đăng ký → onboarding → tạo món → ghi bữa → dashboard →
  báo cáo tuần/tháng; không có CSP violation.
- Chạy qua URL thật `https://nutritrack.khuatminh.com`: toàn bộ luồng chức năng pass;
  chỉ assertion NFR-07 báo 2 CSP violation do Cloudflare chèn
  `cdn-cgi/scripts/.../email-decode.min.js` (Email Address Obfuscation) và bị CSP nonce chặn.
- Smoke bổ sung qua URL thật (script tạm, đã xoá): đăng ký → onboarding → ghi "Bánh mì thịt"
  → thấy trong nhật ký → **đăng xuất → đăng nhập lại** → dữ liệu vẫn còn.
  Cookie phiên: `nt_session secure=true httpOnly=true`.

### 3.4 Dữ liệu và khởi động lại

Trước reboot: `users=2, foods=291, food_logs=4` (289 món seed + 2 món do test tạo).

Sau `sudo systemctl reboot`:

```
SERVICE   STATUS
app       Up (healthy)
db        Up (healthy)
mailpit   Up (healthy)
web       Up (healthy)

users=2  foods=291  food_logs=4
public https=200 tls=0
```

Docker service và `cloudflared-nutritrack` đều `active` sau reboot; app/DB tự chạy lại,
volume `vps_db` giữ dữ liệu, tunnel tự kết nối lại.

## 4. Vận hành

Xem `docs/ops/vps-deploy.md` (§7 backup/restore, §6 rollback, §9 vận hành). Tóm tắt:

```bash
ssh oracle-vps 'cd /opt/nutritrack && docker compose ps && ./healthcheck.sh'
ssh oracle-vps 'cd /opt/nutritrack && ./backup.sh'
bash scripts/vps/rollback.sh          # về releases/previous
```

## 5. Việc còn hoãn / cần Board quyết

1. **SMTP thật**: đang dùng Mailpit nội bộ, nên email đặt lại mật khẩu không tới hộp thư
   người dùng. Cần thông tin SMTP (host/port/user/password/from) để cấu hình production.
2. **Cloudflare Email Address Obfuscation**: tắt trong dashboard (Speed → Optimization)
   để NFR-07 sạch; hiện chỉ là cảnh báo console, không ảnh hưởng chức năng.
3. **CI workflow** `.github/workflows/deploy-vps.yml` vẫn build `linux/amd64`; cần đổi
   sang `linux/arm64` nếu dùng CI thay vì `deploy.sh`.
4. **Backup chưa mã hoá at-rest**; chưa có monitoring/alert tự động.
5. **Tài khoản test** `e2e-*@example.test` và `qld53-*@example.test` còn trong DB (dữ liệu
   thử). Có thể xoá khi bàn giao cho người dùng thật.

## 6. Lệnh đã dùng (rút gọn)

```bash
# Build + ship + migrate + seed + start (lần đầu)
TMPDIR=/tmp VPS_SSH_HOST=oracle-vps PLATFORM=linux/arm64 \
  APP_URL=https://nutritrack.khuatminh.com bash scripts/vps/deploy.sh

# Cloudflare
cloudflared tunnel create nutritrack-vps
cloudflared tunnel route dns --overwrite-dns 0571bc51-… nutritrack.khuatminh.com
scp ~/.cloudflared/0571bc51-….json oracle-vps:/tmp/
ssh oracle-vps 'sudo install -m600 /tmp/0571bc51-….json /etc/cloudflared/ \
  && sudo systemctl enable --now cloudflared-nutritrack'

# Kiểm chứng
E2E_BASE_URL=https://nutritrack.khuatminh.com pnpm exec playwright test \
  e2e/smoke.spec.ts --project=desktop-light
ssh oracle-vps 'sudo systemctl reboot'
```
