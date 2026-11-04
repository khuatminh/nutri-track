# Deploy NutriTrack lên VPS Oracle — runbook, rollback, vận hành

Tài liệu cho QLD-51 (đóng gói release) và QLD-53 (triển khai công khai lên VPS Oracle).
Cập nhật lần cuối: 2026-11-05.

## 0. Trạng thái hiện tại

| Mục | Giá trị |
| --- | --- |
| URL công khai | **https://nutritrack.khuatminh.com** (HTTPS, Cloudflare edge) |
| VPS | Oracle Cloud, `129.221.247.213`, user `ubuntu`, Ubuntu 22.04.5, **aarch64** |
| Thư mục deploy | `/opt/nutritrack` |
| Commit triển khai | `7321f97d4a67` (ops/QLD-53, dựa trên MVP `9c59002`) |
| Image | `nutritrack:7321f97d4a67` (`linux/arm64`, ~156 MB nén / 655 MB trên đĩa) |
| Reverse proxy | Caddy `web` container, `127.0.0.1:8080` |
| Public entrypoint | Cloudflare Tunnel `nutritrack-vps` (outbound, không mở cổng vào) |
| Cổng inbound | chỉ `22/tcp` (SSH). Không cần mở 80/443 ở VCN |

Lần deploy đầu ghi `releases/current` = `7321f97d4a67`, seed 289 món ăn, smoke test
đăng ký → onboarding → ghi bữa → dashboard → đăng xuất/đăng nhập lại đều pass.

## 1. Kiến trúc

```
Browser ──HTTPS──► Cloudflare edge (TLS, WAF)
                        │  outbound QUIC tunnel (không mở cổng vào)
                        ▼
VPS Oracle (aarch64)  cloudflared (systemd) ──► Caddy :8080 ──► Next.js :3000
                                                      │
                                                      └──► Postgres (volume vps_db)

/opt/nutritrack
├─ compose.yml           # project name: nutritrack_vps
├─ Caddyfile             # reverse proxy, loopback 8080
├─ .env                  # mode 600, sinh tự động
├─ postgres-init/*.sql   # extension cho volume mới
├─ backups/              # pg_dump -Fc, giữ 7 bản
└─ releases/{current,previous}
```

Mọi cổng container đều bind `127.0.0.1` trên VPS; chỉ cloudflared (outbound) và SSH là
đường vào. Stack độc lập project/network/volume, không chiếm 80/443 của host.

## 2. Máy chủ

| Mục | Giá trị |
| --- | --- |
| SSH alias | `oracle-vps` → `129.221.247.213:22`, user `ubuntu` |
| Key | `~/Desktop/Oracle/ssh-key-2026-11-04.key` (400), **không** copy vào repo |
| Kiến trúc | `aarch64` — build image `linux/arm64` |
| Tài nguyên | 4 vCPU / 23 GB RAM / 188 GB trống |
| Docker | Engine 29.9.3 + Compose v5.7.0, enable cùng boot |
| Firewall | iptables chỉ ACCEPT 22 + ICMP; rules lưu bằng `netfilter-persistent` |
| Sudo | `ubuntu` có passwordless sudo; deploy không cần root trực tiếp |

Không dùng alias `vps` (trỏ máy khác `180.93.38.185`).

## 3. Chuẩn bị lần đầu

```bash
# 1) SSH không hỏi mật khẩu
ssh -o BatchMode=yes oracle-vps true

# 2) Docker ARM64 + compose (chỉ lần đầu)
ssh oracle-vps 'curl -fsSL https://get.docker.com -o /tmp/get-docker.sh \
  && sudo sh /tmp/get-docker.sh && sudo usermod -aG docker ubuntu \
  && sudo systemctl enable --now docker'

# 3) Thư mục deploy thuộc user ubuntu
ssh oracle-vps 'sudo mkdir -p /opt/nutritrack/{postgres-init,releases,backups} \
  && sudo chown -R ubuntu:ubuntu /opt/nutritrack && chmod 700 /opt/nutritrack/backups'

# 4) Kiểm tra dung lượng (giữ > 1 GB trống)
ssh oracle-vps 'df -h /; docker system df'
```

### Cloudflare Tunnel + DNS (một lần)

Tunnel chạy **trên VPS**, không cần mở 80/443 ở Oracle VCN:

```bash
# Trên máy có quyền quản lý zone (~/.cloudflared/cert.pem)
cloudflared tunnel create nutritrack-vps
cloudflared tunnel route dns --overwrite-dns <tunnel-uuid> nutritrack.khuatminh.com

# Cài connector trên VPS (arm64)
ssh oracle-vps 'curl -fsSL -o /tmp/cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb \
  && sudo dpkg -i /tmp/cloudflared.deb'

# /etc/cloudflared/config.yml (credentials mode 600, root)
# tunnel: <tunnel-uuid>
# credentials-file: /etc/cloudflared/<tunnel-uuid>.json
# ingress:
#   - hostname: nutritrack.khuatminh.com
#     service: http://127.0.0.1:8080
#   - service: http_status:404
```

Service systemd: `/etc/systemd/system/cloudflared-nutritrack.service`
(`ExecStart=/usr/bin/cloudflared --no-autoupdate --config /etc/cloudflared/config.yml tunnel run`,
`Restart=always`, `WantedBy=multi-user.target`), sau đó
`sudo systemctl enable --now cloudflared-nutritrack`.

> Dùng **UUID** của tunnel khi route DNS. Nếu máy có `~/.cloudflared/config.yml` của tunnel
> khác, `cloudflared` có thể resolve nhầm tên tunnel sang tunnel trong config.

## 4. Deploy

Từ worktree sạch (`ALLOW_DIRTY=1` chỉ dùng khi chấp nhận SHA không mô tả đúng build):

```bash
cd ~/Documents/ChatGPT/QLDA_PM-ops-vps
pnpm install --frozen-lockfile          # lần đầu, để có prisma CLI cho bước migrate

TMPDIR=/tmp VPS_SSH_HOST=oracle-vps PLATFORM=linux/arm64 \
  APP_URL=https://nutritrack.khuatminh.com \
  bash scripts/vps/deploy.sh
```

`TMPDIR=/tmp` tránh lỗi `tsx` IPC pipe khi chạy trong sandbox có TMPDIR dài.

Script thực hiện:

1. Kiểm tra git sạch, SSH thông, lấy `SHA` (12 ký tự).
2. Build image `linux/arm64` từ `docker/app/Dockerfile` (Next.js standalone).
3. Sync `compose.yml`, `Caddyfile`, `backup.sh`, `healthcheck.sh`, `postgres-init/*.sql`.
4. Sinh `.env` nếu chưa có (mật khẩu DB random, mode 600); giữ nguyên nếu đã có.
5. `docker save | gzip | ssh docker load`.
6. `docker compose up -d --wait db mailpit` → backup trước migration.
7. Tunnel SSH tới Postgres, chạy `prisma migrate deploy`; lần đầu chạy thêm seed.
8. `docker compose up -d --wait app web`; health check `/dang-nhap` qua app **và** Caddy.
9. Health check fail → tự `rollback.sh --auto`; thành công → ghi `releases/current`,
   cập nhật `IMAGE_TAG` trong `.env`, dọn image cũ (giữ bản đang chạy + bản trước).

Biến tuỳ chọn: `VPS_SSH_HOST`, `REMOTE_DIR`, `APP_PORT`, `WEB_PORT`, `DB_TUNNEL_PORT`,
`IMAGE_REPO`, `PLATFORM`, `APP_URL`, `ALLOW_DIRTY=1`, `SKIP_MIGRATE=1`, `SKIP_BACKUP=1`.

## 5. Kiểm chứng sau deploy

```bash
# Trên VPS: container + health check + phiên bản
ssh oracle-vps 'cd /opt/nutritrack && docker compose ps && ./healthcheck.sh \
  && cat releases/current && docker compose exec -T db psql -U nutritrack -d nutritrack -tAc "select count(*) from foods"'

# Từ Internet: HTTPS thật
curl -sS -o /dev/null -w '%{http_code} %{ssl_verify_result}\n' \
  https://nutritrack.khuatminh.com/dang-nhap

# E2E smoke qua URL thật (Playwright)
E2E_BASE_URL=https://nutritrack.khuatminh.com \
  pnpm exec playwright test e2e/smoke.spec.ts --project=desktop-light
```

Lưu ý: Cloudflare **Email Address Obfuscation** chèn `email-decode.min.js` vào trang có
email; CSP nonce của app chặn script này nên bài test NFR-07 có thể báo 1 CSP violation
(không ảnh hưởng chức năng). Tắt *Email Address Obfuscation* trong Cloudflare dashboard
hoặc chạy smoke qua tunnel nội bộ để có kết quả sạch.

## 6. Rollback

| Tình huống | Hành động |
| --- | --- |
| Image mới lỗi, DB không đổi schema | `bash scripts/vps/rollback.sh` |
| Muốn về SHA cụ thể | `bash scripts/vps/rollback.sh --to <sha>` |
| Lỗi do migration phá dữ liệu | restore dump trước, rồi rollback image |
| Deploy fail | `deploy.sh` đã tự rollback |

Rollback đổi image rồi health check lại app + Caddy, cập nhật `releases/current`,
`releases/previous` và `IMAGE_TAG`. **Migration không tự revert**; xem §7 nếu cần restore.

## 7. Backup & restore

- `backup.sh` chạy trên VPS: `pg_dump -Fc` → gzip → sha256, giữ 7 bản trong
  `/opt/nutritrack/backups` (mode 700). Deploy gọi script này trước mỗi migration.
- Backup tay: `ssh oracle-vps 'cd /opt/nutritrack && ./backup.sh'`.
- Dữ liệu MVP là dữ liệu thử; chưa mã hoá at-rest. Trước khi có dữ liệu thật, chuyển sang
  GPG như `scripts/staging/backup.sh`.
- Restore (thao tác phá huỷ, cần người duyệt):
  ```bash
  ssh oracle-vps 'cd /opt/nutritrack && docker compose stop app web \
    && docker compose exec -T db dropdb -U nutritrack --force nutritrack \
    && docker compose exec -T db createdb -U nutritrack nutritrack \
    && gunzip -c backups/<dump>.dump.gz | docker compose exec -T db pg_restore -U nutritrack -d nutritrack --no-owner'
  ```
  Sau đó `IMAGE_TAG=$(head -1 releases/current) docker compose up -d --wait app web`.

## 8. CI/CD

`.github/workflows/deploy-vps.yml` chạy tay (`workflow_dispatch`) và hiện build
`linux/amd64` cho VPS cũ. Với Oracle ARM64, hoặc đổi `PLATFORM=linux/arm64` trong workflow,
hoặc dùng `scripts/vps/deploy.sh` (đường đã chạy thực tế cho QLD-53, không cần registry).
CI chất lượng (`.github/workflows/ci.yml`) vẫn là cổng lint/typecheck/test/build/e2e.

## 9. Vận hành

```bash
# Log
ssh oracle-vps 'cd /opt/nutritrack && docker compose logs -f --tail=100 app web'
sudo journalctl -u cloudflared-nutritrack -f

# Trạng thái
ssh oracle-vps 'cd /opt/nutritrack && docker compose ps; docker stats --no-stream'
ssh oracle-vps 'systemctl status cloudflared-nutritrack --no-pager | head -12'

# Restart không đổi image
ssh oracle-vps 'cd /opt/nutritrack && docker compose restart app web'

# Reboot: Docker + cloudflared tự bật lại (đã kiểm chứng 2026-11-05)
ssh oracle-vps 'sudo systemctl reboot'

# Disk / dọn cache (không xoá image đang chạy)
ssh oracle-vps 'df -h /; docker system df; docker builder prune -f'
```

Ngưỡng cảnh báo thủ công: health `/dang-nhap` phải 200; disk `/` < 85%; RAM available
> 500 MB; container restart không tăng; tunnel có connection trong `cloudflared tunnel info`.

## 10. Bảo mật

- Inbound chỉ 22; app/DB/mailpit bind `127.0.0.1`; Caddy `127.0.0.1:8080`.
- Public TLS do Cloudflare terminate; VPS không cần mở 80/443, không cần cert local.
- `.env` mode 600, không nằm trong git; credentials tunnel mode 600 root.
- `DISABLE_RATE_LIMIT` không được đặt; cookie `Secure` + `httpOnly` + `sameSite=lax`.
- Log deploy không in mật khẩu; script không `set -x`.
- Nếu chuyển sang reverse proxy trực tiếp (không Cloudflare): mở 80/443 ở cả iptables và
  Oracle VCN/NSG, cấp cert Let's Encrypt cho hostname trỏ về IP, giữ DB loopback.

## 11. Sự cố thường gặp

| Triệu chứng | Nguyên nhân | Xử lý |
| --- | --- | --- |
| `502` từ Cloudflare | Caddy/app down hoặc tunnel mất kết nối | `docker compose ps`, `journalctl -u cloudflared-nutritrack` |
| `healthcheck: FAILED` | app crash, thiếu env, DB chưa sẵn sàng | `docker compose logs app`, `docker compose ps` |
| `IMAGE_TAG is missing` | chạy compose tay ngoài deploy | `.env` phải có `IMAGE_TAG=<sha>` |
| App 500 ở trang đăng nhập | migration chưa chạy | chạy lại `deploy.sh` (không `SKIP_MIGRATE`) |
| `tsx ... EINVAL ... .pipe` | TMPDIR sandbox quá dài | chạy deploy với `TMPDIR=/tmp` |
| `no space left on device` | image/dump cũ | prune image/dump, `docker builder prune` |
| Tunnel không mở | cổng local bận | đổi `LOCAL_DB_PORT=55433` |
| DNS trỏ nhầm tunnel | CLI đọc `~/.cloudflared/config.yml` khác | route lại bằng UUID + `--overwrite-dns` |
| Container restart loop | OOM | `dmesg | grep -i oom`, giảm tải/nâng RAM |

## 12. Nhật ký QLD-53

Chi tiết bằng chứng: `docs/ops/evidence/qld-53-deploy.md`.
