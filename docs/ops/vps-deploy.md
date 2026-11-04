# Deploy NutriTrack lên VPS (SSH) — CI, runbook, rollback

Tài liệu vận hành cho QLD-51. Môi trường này là **staging riêng tư trên VPS**: app và
database chỉ lắng nghe trên loopback của máy chủ, truy cập qua SSH tunnel. Chưa mở
hostname/TLS công khai — việc đó cần Board duyệt (xem [Mở công khai](#mở-công-khai)).

## 1. Kiến trúc

```
Máy dev / CI runner                          VPS (Ubuntu, Docker)
┌────────────────────┐   SSH   ┌──────────────────────────────────────┐
│ docker buildx      │ ──────► │ /opt/nutritrack                      │
│ (linux/amd64)      │         │  ├─ compose.yml   (project:          │
│ docker save | ssh  │         │  │                 nutritrack_vps)   │
│ prisma migrate     │ ──tunnel─│  ├─ .env (600)                       │
│   (127.0.0.1:55432)│         │  ├─ postgres-init/*.sql              │
└────────────────────┘         │  ├─ backups/                         │
                               │  └─ releases/{current,previous}      │
                               │                                      │
                               │  app     127.0.0.1:3200 → :3000      │
                               │  db      127.0.0.1:55432 → :5432     │
                               │  mailpit 127.0.0.1:8026  → :8025     │
                               └──────────────────────────────────────┘
```

- Image là **Next.js standalone** (`docker/app/Dockerfile`, ~250 MB) để VPS còn dung lượng.
- Stack độc lập: project name riêng, network riêng, volume riêng. **Không** đụng tới các
  project khác trên máy (primepass, quiz-arena) và **không** chiếm cổng 80/443 của host.
- Migration chạy từ máy deploy/CI qua tunnel, nên image runtime không cần Prisma CLI.

## 2. Máy chủ

| Mục | Giá trị |
| --- | --- |
| SSH alias | `vps` (khai báo trong `~/.ssh/config`, key `~/.ssh/id_ed25519`) |
| HĐH | Ubuntu 24.04, x86_64, 1 vCPU / 1.9 GB RAM |
| Docker | đã cài (Engine 29.x + Compose v2) |
| Thư mục deploy | `/opt/nutritrack` |
| Cổng công khai | chỉ `22` (SSH). `3200/55432/8026` chỉ loopback |
| Ổ đĩa | dùng chung với project khác — **luôn kiểm tra `df -h /` trước khi deploy** (xem §8) |

Yêu cầu dung lượng tối thiểu còn trống: **1 GB** (image mới + image cũ để rollback + dump).

## 3. Chuẩn bị lần đầu

```bash
# 1) SSH vào được không (không hỏi mật khẩu)
ssh -o BatchMode=yes vps true

# 2) Docker + compose trên VPS
ssh vps 'docker version --format "{{.Server.Version}}"; docker compose version'

# 3) Dung lượng
ssh vps 'df -h /; docker system df'

# 4) (khuyến nghị) dọn build cache cũ nếu < 1 GB trống — chỉ xoá cache, không xoá image
ssh vps 'docker builder prune -f'
```

Không cần tạo user riêng: deploy dùng `root` qua key, các container chạy user `node`.

## 4. Deploy

Từ worktree sạch (script từ chối cây bẩn vì tag image phải mô tả đúng bản build):

```bash
cd /Users/justminh/Documents/ChatGPT/QLDA_PM-ops-vps
pnpm install --frozen-lockfile          # lần đầu, để có prisma CLI cho bước migrate
bash scripts/vps/deploy.sh
```

Script thực hiện tuần tự:

1. Kiểm tra git sạch, SSH thông, lấy `SHA` (12 ký tự).
2. `docker buildx build --platform linux/amd64` → image `nutritrack:<sha>`.
3. Đồng bộ `compose.yml`, `backup.sh`, `healthcheck.sh`, `postgres-init/*.sql` lên `/opt/nutritrack`.
4. Sinh `.env` trên VPS nếu chưa có (`POSTGRES_PASSWORD` random, mode 600). **Không** ghi mật khẩu ra log.
5. `docker save | gzip | ssh docker load` — không cần registry.
6. `docker compose up -d --wait db mailpit`, sau đó `backup.sh` (dump trước migration).
7. Mở SSH tunnel `127.0.0.1:55432` → Postgres trên VPS, chạy `prisma migrate deploy`.
   Lần deploy đầu tiên chạy thêm `prisma generate` + `prisma db seed` (seed idempotent).
8. Ghi `releases/previous`, `docker compose up -d --wait app`, health check `/dang-nhap`.
9. Health check fail → tự gọi `rollback.sh --auto <sha>` và thoát mã khác 0.
10. Ghi `releases/current`, dọn image cũ (giữ bản đang chạy + bản trước).

Biến môi trường tuỳ chọn: `VPS_SSH_HOST`, `REMOTE_DIR`, `APP_PORT`, `DB_TUNNEL_PORT`,
`IMAGE_REPO`, `PLATFORM`, `ALLOW_DIRTY=1`, `SKIP_MIGRATE=1`, `SKIP_BACKUP=1`.

### Kiểm chứng sau deploy

```bash
# Từ VPS
ssh vps 'cd /opt/nutritrack && ./healthcheck.sh'
ssh vps 'cd /opt/nutritrack && docker compose ps'

# Từ máy dev qua tunnel
ssh -N -L 3200:127.0.0.1:3200 vps &
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

1. `ssh vps 'cd /opt/nutritrack && ls -lt backups | head'` chọn dump trước release đó.
2. Dừng app: `ssh vps 'cd /opt/nutritrack && docker compose stop app'`.
3. Restore vào DB hiện tại (thao tác phá huỷ, cần người duyệt):
   ```bash
   ssh vps 'cd /opt/nutritrack && docker compose exec -T db dropdb -U nutritrack --force nutritrack \
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

Luồng CI: build `linux/amd64` → push `ghcr.io/<repo>/app:<sha12>` + `:staging` → SSH sang
VPS → `compose pull` → backup → migrate qua tunnel → `compose up app` → health check →
rollback tự động nếu fail.

Secrets cần đặt (repo hoặc environment `staging`):

| Secret | Nội dung |
| --- | --- |
| `VPS_HOST` | IP/hostname VPS |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | private key deploy (chỉ dùng cho CI, nên tạo key riêng) |
| `VPS_KNOWN_HOSTS` | `ssh-keyscan -H <ip>` |

`GITHUB_TOKEN` mặc định dùng để push/pull GHCR. Nếu VPS không kéo được GHCR, dùng
`scripts/vps/deploy.sh` (ship image qua SSH, không cần registry) — đây là đường đã chạy
thực tế trong QLD-51.

CI hiện có (`.github/workflows/ci.yml`) vẫn là cổng chất lượng: lint, typecheck, unit/
integration, build, e2e. Deploy chỉ nên chạy trên commit đã qua CI xanh.

## 8. Vận hành

```bash
# Log
ssh vps 'cd /opt/nutritrack && docker compose logs -f --tail=100 app'

# Trạng thái + tài nguyên
ssh vps 'cd /opt/nutritrack && docker compose ps; docker stats --no-stream'

# Disk (máy dùng chung — giữ trên 10% trống)
ssh vps 'df -h /; docker system df'

# Restart không đổi image
ssh vps 'cd /opt/nutritrack && docker compose restart app'
```

Ngưỡng cảnh báo thủ công (chưa có monitoring tự động):

| Chỉ số | Ngưỡng | Cách đo |
| --- | --- | --- |
| Health `/dang-nhap` | phải 200 | `./healthcheck.sh` |
| Disk `/` | < 85% | `df -h /` |
| RAM available | > 200 MB | `free -m` |
| Container restart | không tăng | `docker compose ps` |

**Giới hạn đã biết:** VPS 1.9 GB RAM chia sẻ với 2 project khác; Next.js + Postgres chiếm
~350–450 MB. Không chạy build trên VPS (build ở máy dev/CI) để tránh OOM.

## 9. Bảo mật

- App/DB/mailpit chỉ bind `127.0.0.1`; firewall chỉ mở 22. Kiểm tra:
  `ssh vps 'ss -tlnp | grep -E "3200|55432|8026"'` → chỉ `127.0.0.1`.
- `.env` mode 600, không chứa trong git; mật khẩu DB sinh bằng `openssl rand -hex 24`.
- `DISABLE_RATE_LIMIT` **không** được đặt. Cookie `Secure` + `httpOnly` + `sameSite=lax`.
- Log không chứa mật khẩu: script chỉ đọc `.env` vào biến, không `set -x`, không in ra.
- Key SSH dùng cho deploy không dùng chung với key cá nhân khi chuyển sang CI.

### Mở công khai

Chỉ sau khi Board duyệt. Cần: hostname + DNS, TLS (Caddy/Let's Encrypt), đổi bind
`127.0.0.1:3200` → `127.0.0.1:3200` + reverse proxy, đặt `APP_URL=https://<domain>`,
mở 80/443 qua proxy riêng (không sửa nginx của project khác), bật backup mã hoá và
monitoring. Ghi lại quyết định vào issue trước khi thực hiện.

## 10. Sự cố thường gặp

| Triệu chứng | Nguyên nhân | Xử lý |
| --- | --- | --- |
| `healthcheck: FAILED` | app crash, thiếu env, DB chưa sẵn sàng | `docker compose logs app`, `docker compose ps` |
| App 500 ở trang đăng nhập | migration chưa chạy | `SKIP_MIGRATE=0` chạy lại `deploy.sh`, hoặc migrate tay qua tunnel |
| `no space left on device` | image/dump cũ | `docker image prune`, xoá dump cũ, `docker builder prune` |
| Tunnel không mở | cổng local bận | đổi `LOCAL_DB_PORT=55433` |
| `permission denied (publickey)` | sai alias/key | kiểm tra `~/.ssh/config`, `ssh -v vps` |
| Container app restart loop | OOM (RAM thấp) | `dmesg | grep -i oom`, giảm tải, cân nhắc nâng RAM |

## 11. Nhật ký chạy thực tế (QLD-51)

Xem mục **Evidence** trong comment của issue QLD-51 để có SHA, thời điểm và kết quả
health check của lần deploy đầu tiên.
