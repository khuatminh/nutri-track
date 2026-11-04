# NutriTrack

## Chạy local

Yêu cầu: Docker Engine/Desktop đang chạy, Docker Compose v2 hỗ trợ `--wait`, Node.js **22**, pnpm **10** (đã kiểm chứng với 10.20.0).

Scaffold ứng dụng cần cung cấp `package.json`, lockfile, Prisma schema/migrations và seed. Hai script hạ tầng trong mục `scripts` của `package.json`:

```json
{
  "dev:setup": "bash scripts/dev-setup.sh",
  "verify": "bash scripts/verify.sh"
}
```

Các script nền `lint`, `typecheck`, `test` (chạy một lần rồi thoát), `build`, `dev` và cấu hình Prisma seed do scaffold ứng dụng cung cấp. `verify` dừng ngay ở bước lỗi đầu tiên.

Sau khi có scaffold:

```sh
cp .env.example .env
pnpm install --frozen-lockfile
docker compose up -d
pnpm dev:setup
pnpm dev
```

Ứng dụng: http://localhost:3000. Mailpit: http://localhost:8025; SMTP local không TLS/auth tại `127.0.0.1:1025`. PostgreSQL tại `127.0.0.1:5432`. Các cổng chỉ bind loopback. Mật khẩu mẫu chỉ dành cho local; nếu thay `POSTGRES_PASSWORD`, cập nhật đồng thời mật khẩu trong `DATABASE_URL` (URL-encode ký tự đặc biệt). `.env` không được commit. Session theo ADR dùng token ngẫu nhiên lưu hash trong DB nên không cần `SESSION_SECRET`.

`dev:setup` khởi động DB/Mailpit, chờ DB healthy tối đa 120 giây, kiểm tra extension rồi chạy `prisma migrate deploy` và `prisma db seed`. Seed cần idempotent. Prisma dùng biến từ `.env` theo cấu hình scaffold; không source `.env` như shell script.

Kiểm chứng:

```sh
docker compose config --quiet
docker compose ps
docker compose exec -T db psql -U nutritrack -d nutritrack -c 'SELECT extname FROM pg_extension ORDER BY extname;'
pnpm verify
```

### Vận hành và khôi phục local

`docker compose logs --tail=100 db mailpit` để xem lỗi. Kiểm tra daemon Docker và xung đột cổng nếu không khởi động được. `docker compose stop` tạm dừng; `docker compose down` xóa container/network và giữ volume DB. Chạy lại `docker compose up -d` để phục hồi.

Nếu cổng Mailpit đã được dịch vụ khác sử dụng, đổi `MAILPIT_SMTP_PORT=11025`, `MAILPIT_UI_PORT=18025` và `SMTP_PORT=11025` trong `.env`; UI khi đó ở http://localhost:18025. Không dừng dịch vụ khác để giải phóng cổng.

Init SQL chỉ chạy khi volume PostgreSQL mới được tạo ([tài liệu image Postgres](https://hub.docker.com/_/postgres)). Nếu dùng volume cũ thiếu extension, bổ sung mà không xóa dữ liệu:

```sh
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U nutritrack -d nutritrack < docker/postgres/init/001-extensions.sql
```

Trước khi thử migration trên dữ liệu cần giữ, sao lưu:

```sh
docker compose exec -T db pg_dump -U nutritrack -d nutritrack -Fc > /tmp/nutritrack-local.dump
```

Nếu migration thất bại, dừng app, giữ bản dump và log để Tech Lead xử lý migration. Prisma không tự rollback migration. Không chạy `docker compose down -v` trên dữ liệu cần giữ vì lệnh này xóa volume. Không có deploy hoặc release production trong cấu hình này.

Tham khảo: [Docker Compose healthcheck](https://docs.docker.com/compose/how-tos/startup-order/), [Mailpit Docker](https://mailpit.axllent.org/docs/install/docker/).
