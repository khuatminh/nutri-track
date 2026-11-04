# Deploy NutriTrack lên VPS Oracle (SSH) — CI, runbook, rollback

Tài liệu vận hành cho QLD-53 (kế thừa QLD-51). Môi trường này là **staging riêng tư trên
VPS Oracle**: app và database chỉ lắng nghe trên loopback của máy chủ, truy cập qua SSH
tunnel. Chưa mở hostname/TLS công khai — việc đó cần Board duyệt (xem [Mở công khai](#mở-công-khai)).

> **Kiến trúc đích: aarch64 (ARM64).** Image phải build `linux/arm64`. Deploy image
> `linux/amd64` lên VPS ARM64 sẽ `exec format error` hoặc phải chạy qemu rất chậm.
> Script `deploy.sh` tự đọc `uname -m` của VPS và từ chối `PLATFORM` không khớp.

## 1. Kiến trúc

```
Máy dev / CI runner                          VPS Oracle (aarch64, Docker)
┌────────────────────┐   SSH   ┌──────────────────────────────────────┐
│ docker buildx      │ ──────► │ /opt/nutritrack                      │
│ (linux/arm64)      │         │  ├─ compose.yml   (project:          │
│ docker save | ssh  │         │  │                 nutritrack_vps)   │
│ prisma migrate     │ ──tunnel─│  ├─ .env (600)                       │
│   (127.0.0.1:55432)│         │  ├─ postgres-init/*.sql              │
└────────────────────┘         │  ├─ backups/                         │
                               │  └─ releases/{current,previous}      │
                               │                                      │
                               │  app     127.0.0.1:3200 → :3000      │
                               │  web     127.0.0.1:8080 → :8080      │
                               │  db      127.0.0.1:55432 → :5432     │
                               │  mailpit 127.0.0.1:8026  → :8025     │
                               └──────────────────────────────────────┘
```

- Image là **Next.js standalone** (`docker/app/Dockerfile`, ~250 MB) để VPS còn dung lượng.
- `web` là Caddy reverse proxy nội bộ trước app; Cloudflare Tunnel (nếu dùng) nối vào
  `127.0.0.1:8080`, nên không cần mở 80/443 trên VPS.
- Stack độc lập: project name riêng, network riêng, volume riêng. **Không** chiếm cổng
  80/443 của host.
- Migration chạy từ máy deploy/CI qua tunnel, nên image runtime không cần Prisma CLI.
- `prisma generate` chạy trong build container `linux/arm64` → engine
  `linux-arm64-openssl-3.0.x`; build còn kiểm tra engine và package argon2 native
  (`@node-rs/argon2-linux-arm64-gnu`) khớp kiến trúc.

## 2. Máy chủ

| Mục | Giá trị |
| --- | --- |
| SSH alias | `oracle-vps` (khai báo trong `~/.ssh/config`) |
| IP / user | `129.221.247.213`, user `ubuntu`, port 22 |
| Key | `/Users/justminh/Desktop/Oracle/ssh-key-2026-11-04.key` (mode 400) — **không** copy vào repo/task |
| HĐH | Linux Oracle kernel, **aarch64 (ARM64)** |
| Docker | Engine + Compose v2 (kiểm tra ở §3) |
| Thư mục deploy | `/opt/nutritrack` |
| Cổng công khai | `22` (+ 80/443 sau khi Board duyệt reverse proxy/TLS). `3200/55432/8026` chỉ loopback |
| Ổ đĩa | **luôn kiểm tra `df -h /` trước khi deploy** (xem §8) |

> **Không dùng alias `vps`**: alias đó trỏ máy khác (`180.93.38.185`, x86_64), không phải
> VPS Oracle. Deploy nhầm host sẽ hỏng/không đúng môi trường.

Yêu cầu dung lượng tối thiểu còn trống: **1 GB** (image mới + image cũ để rollback + dump).

## 3. Chuẩn bị lần đầu

```bash
# 1) SSH vào được không (không hỏi mật khẩu) + xác nhận kiến trúc
ssh -o BatchMode=yes oracle-vps 'uname -m'          # phải in: aarch64

# 2) Docker + compose trên VPS
ssh oracle-vps 'docker version --format "{{.Server.Arch}}"; docker compose version'

# 3) Dung lượng
ssh oracle-vps 'df -h /; docker system df'

# 4) (khuyến nghị) dọn build cache cũ nếu < 1 GB trống — chỉ xoá cache, không xoá image
ssh oracle-vps 'docker builder prune -f'
```

Không cần tạo user riêng nếu key đã map vào user `ubuntu`; container chạy user `node`.

## 4. Deploy

Từ worktree sạch (script từ chối cây bẩn vì tag image phải mô tả đúng bản build):

```bash
cd /Users/justminh/Documents/ChatGPT/QLDA_PM-ops-vps
pnpm install --frozen-lockfile          # lần đầu, để có prisma CLI cho bước migrate
bash scripts/vps/deploy.sh              # tự nhận diện linux/arm64 từ oracle-vps
```

Script thực hiện tuần tự:

1. Kiểm tra git sạch, SSH thông, lấy `SHA` (12 ký tự) và `uname -m` của VPS.
2. `docker buildx build --platform linux/arm64` → image `nutritrack:<sha>` (platform suy ra
   từ kiến trúc VPS; `PLATFORM` lệch kiến trúc bị từ chối).
3. Đồng bộ `compose.yml`, `backup.sh`, `healthcheck.sh`, `postgres-init/*.sql` lên `/opt/nutritrack`.
4. Sinh `.env` trên VPS nếu chưa có (`POSTGRES_PASSWORD` random, mode 600). **Không** ghi mật khẩu ra log.
5. `docker save | gzip | ssh docker load` — không cần registry.
6. `docker compose up -d --wait db mailpit`, sau đó `backup.sh` (dump trước migration).
7. Mở SSH tunnel `127.0.0.1:55432` → Postgres trên VPS, chạy `prisma migrate deploy`.
   Lần deploy đầu tiên chạy thêm `prisma generate` + `prisma db seed` (seed idempotent).
8. Ghi `releases/previous`, `docker compose up -d --wait app`, health check `/dang-nhap`.
9. Health check fail → tự gọi `rollback.sh --auto <sha>` và thoát mã khác 0.
10. Ghi `releases/current`, dọn image cũ (giữ bản đang chạy + bản trước).

Biến môi trường tuỳ chọn: `VPS_SSH_HOST` (mặc định `oracle-vps`), `REMOTE_DIR`, `APP_PORT`,
`WEB_PORT`, `APP_URL` (URL công khai ghi vào `.env`), `DB_TUNNEL_PORT`, `IMAGE_REPO`,
`PLATFORM` (mặc định theo kiến trúc VPS), `ALLOW_PLATFORM_MISMATCH=1`, `ALLOW_DIRTY=1`,
`SKIP_MIGRATE=1`, `SKIP_BACKUP=1`.

### Kiểm chứng sau deploy

```bash
# Từ VPS
ssh oracle-vps 'cd /opt/nutritrack && ./healthcheck.sh'
ssh oracle-vps 'cd /opt/nutritrack && docker compose ps'

# Từ máy dev qua tunnel
ssh -N -L 3200:127.0.0.1:3200 oracle-vps &
open http://127.0.0.1:3200/dang-nhap
```

E2E chạy qua tunnel (Playwright chấp nhận `127.0.0.1`, cookie `Secure` vẫn hợp lệ vì
`127.0.0.1` là secure context):

```bash
BASE_URL=http://127.0.0.1:3200 pnpm exec playwright test --project=desktop-light
```

## 5. Rollback

| Tình huống | Hành động |
| --- | --- |
| Image mới lỗi, DB không đổi schema | `bash scripts/vps/rollback.sh` |
| Lỗi do migration phá huỷ dữ liệu | restore dump trước, rồi rollback image |
| Muốn về một SHA cụ thể | `bash scripts/vps/rollback.sh --to <sha>` |
| Deploy fail tự động | `deploy.sh` đã tự rollback, không cần làm gì |

```bash
bash scripts/vps/rollback.sh                 # về releases/previous
bash scripts/vps/rollback.sh --to 3f2a91c8e0d1
```

Rollback đổi image rồi health check lại; nếu bản rollback cũng fail, script báo lỗi và
(ở chế độ `--auto`) khôi phục bản vừa deploy để không bỏ stack ở trạng thái hỏng.

**Migration không tự động revert.** Prisma migration được viết theo hướng tương thích
ngược (thêm cột/bảng, không xoá) — đó là quy ước bắt buộc khi review migration. Nếu một
release buộc phải xoá/đổi kiểu dữ liệu:

1. `ssh oracle-vps 'cd /opt/nutritrack && ls -lt backups | head'` chọn dump trước release đó.
2. Dừng app: `ssh oracle-vps 'cd /opt/nutritrack && docker compose stop app'`.
3. Restore vào DB hiện tại (thao tác phá huỷ, cần người duyệt):
   ```bash
   ssh oracle-vps 'cd /opt/nutritrack && docker compose exec -T db dropdb -U nutritrack --force nutritrack \
     && docker compose exec -T db createdb -U nutritrack nutritrack \
     && gunzip -c backups/<dump>.dump.gz | docker compose exec -T db pg_restore -U nutritrack -d nutritrack --no-owner'
   ```
4. Rollback image, bật lại app, chạy health check.

## 6. Backup & restore

- `scripts/vps/backup.sh` chạy trên VPS: `pg_dump -Fc` → gzip → `sha256`, giữ 7 bản gần nhất
  trong `/opt/nutritrack/backups` (mode 700). `deploy.sh` gọi script này **trước mỗi migration**.
- Dữ liệu hiện là dữ liệu test; chưa mã hoá at-rest. Trước khi đưa dữ liệu thật lên, phải
  chuyển sang mã hoá GPG như stack staging nội bộ (`scripts/staging/backup.sh`).
- Diễn tập restore định kỳ: restore vào DB tạm rồi so số dòng, không ghi đè `nutritrack`.

## 7. CI/CD

Workflow: `.github/workflows/deploy-vps.yml` — **chỉ chạy tay** (`workflow_dispatch`),
gắn GitHub Environment `staging` để bắt buộc reviewer nếu bật protection rule.

Luồng CI: build `linux/arm64` (QEMU trên runner amd64) → push `ghcr.io/<repo>/app:<sha12>`
+ `:staging` → SSH sang VPS → `compose pull` → backup → migrate qua tunnel → `compose up app`
→ health check → rollback tự động nếu fail.

Secrets cần đặt (repo hoặc environment `staging`):

| Secret | Nội dung |
| --- | --- |
| `VPS_HOST` | `129.221.247.213` (hoặc hostname Oracle) |
| `VPS_USER` | `ubuntu` |
| `VPS_SSH_KEY` | private key deploy (chỉ dùng cho CI, nên tạo key riêng) |
| `VPS_KNOWN_HOSTS` | `ssh-keyscan -H <ip>` |

`GITHUB_TOKEN` mặc định dùng để push/pull GHCR. Nếu VPS không kéo được GHCR, dùng
`scripts/vps/deploy.sh` (ship image qua SSH, không cần registry) — đây là đường đã chạy
thực tế trong QLD-51 và phù hợp để deploy lần đầu lên Oracle.

CI hiện có (`.github/workflows/ci.yml`) vẫn là cổng chất lượng: lint, typecheck, unit/
integration, build, e2e. Deploy chỉ nên chạy trên commit đã qua CI xanh.

## 8. Vận hành

```bash
# Log
ssh oracle-vps 'cd /opt/nutritrack && docker compose logs -f --tail=100 app'

# Trạng thái + tài nguyên
ssh oracle-vps 'cd /opt/nutritrack && docker compose ps; docker stats --no-stream'

# Disk (máy dùng chung — giữ trên 10% trống)
ssh oracle-vps 'df -h /; docker system df'

# Restart không đổi image
ssh oracle-vps 'cd /opt/nutritrack && docker compose restart app'
```

Ngưỡng cảnh báo thủ công (chưa có monitoring tự động):

| Chỉ số | Ngưỡng | Cách đo |
| --- | --- | --- |
| Health `/dang-nhap` | phải 200 | `./healthcheck.sh` |
| Disk `/` | < 85% | `df -h /` |
| RAM available | > 200 MB | `free -m` |
| Container restart | không tăng | `docker compose ps` |

**Giới hạn đã biết:** cấu hình RAM/CPU của VPS Oracle phải đo lại bằng `free -m` / `nproc`
trước lần deploy đầu (thông số 1 vCPU / 1.9 GB của QLD-51 là máy khác, **không** áp dụng).
Không chạy build trên VPS (build ở máy dev/CI, nơi có Docker buildx) để tránh OOM.

## 9. Bảo mật

- App/DB/mailpit chỉ bind `127.0.0.1`; firewall chỉ mở 22. Kiểm tra:
  `ssh oracle-vps 'ss -tlnp | grep -E "3200|55432|8026"'` → chỉ `127.0.0.1`.
- `.env` mode 600, không chứa trong git; mật khẩu DB sinh bằng `openssl rand -hex 24`.
- `DISABLE_RATE_LIMIT` **không** được đặt. Cookie `Secure` + `httpOnly` + `sameSite=lax`.
- Log không chứa mật khẩu: script chỉ đọc `.env` vào biến, không `set -x`, không in ra.
- Key SSH dùng cho deploy không dùng chung với key cá nhân khi chuyển sang CI.

### Mở công khai

Chỉ sau khi Board duyệt. Stack đã có Caddy `web` (loopback `8080`) và Cloudflare Tunnel
nối vào `127.0.0.1:8080`; khi bật cần: hostname + DNS, đặt `APP_URL=https://<domain>`,
chạy `cloudflared` bằng service riêng trên VPS, bật backup mã hoá và monitoring. Không mở
80/443 inbound nếu dùng tunnel. Ghi lại quyết định vào issue trước khi thực hiện.

## 10. Sự cố thường gặp

| Triệu chứng | Nguyên nhân | Xử lý |
| --- | --- | --- |
| `exec format error` khi start app | image build sai kiến trúc (amd64 trên ARM64) | build lại `linux/arm64`; bỏ `PLATFORM` để script tự nhận diện |
| Build fail ở bước argon2 `cp ... x64 ...` | package native không khớp `TARGETARCH` | dùng Dockerfile đã map `arm64 → argon2-linux-arm64-gnu`, không sửa cứng x64 |
| Build fail `no Prisma query engine` | `prisma generate` không chạy trong target platform | build bằng `buildx --platform linux/arm64`, không build native trên máy khác kiến trúc |
| `healthcheck: FAILED` | app crash, thiếu env, DB chưa sẵn sàng | `docker compose logs app`, `docker compose ps` |
| App 500 ở trang đăng nhập | migration chưa chạy | `SKIP_MIGRATE=0` chạy lại `deploy.sh`, hoặc migrate tay qua tunnel |
| `no space left on device` | image/dump cũ | `docker image prune`, xoá dump cũ, `docker builder prune` |
| Tunnel không mở | cổng local bận | đổi `LOCAL_DB_PORT=55433` |
| `permission denied (publickey)` | sai alias/key | kiểm tra `~/.ssh/config`, `ssh -v oracle-vps` |
| Container app restart loop | OOM (RAM thấp) | `dmesg | grep -i oom`, giảm tải, cân nhắc nâng RAM |

## 11. Nhật ký chạy thực tế

- QLD-51: xem **Evidence** trong comment issue QLD-51 (máy `vps` x86_64 — không dùng nữa).
- QLD-53: ghi SHA/image, `uname -m`, thời điểm và kết quả health check của lần deploy Oracle
  đầu tiên vào comment bàn giao QLD-53.
