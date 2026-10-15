# Hướng Dẫn Vận Hành Sub2API Local (Docker Source Build)

Tài liệu hướng dẫn vận hành sub2api môi trường local, build trực tiếp từ mã nguồn và cô lập trên loopback interface (`127.0.0.1`).

---

## 1. Thông Tin Triển Khai

- **Mã nguồn (Commit ID):** `98d86915becae9fe9491a91ffc6defd5235c8d2b`
- **Địa chỉ truy cập (URL):** [http://127.0.0.1:8080](http://127.0.0.1:8080) (loopback trên host) và [http://10.8.0.4:8080](http://10.8.0.4:8080) (qua VPN WireGuard `wg0`).
- **Tài khoản quản trị (Admin Username):** `admin@sub2api.local`
- **Mật khẩu quản trị (Admin Password):** Được lưu an toàn trong biến môi trường `ADMIN_PASSWORD` tại file cấu hình:
  ```
  /home/duydv/.config/sub2api-local/deployment.env
  ```
  *(Người dùng tự mở file trên máy cục bộ để xem; tài liệu này tuyệt đối không hiển thị hay đọc giá trị thực tế).*

### Truy cập qua VPN WireGuard

- Cổng `8080` được publish trên đúng 2 địa chỉ: `127.0.0.1` (loopback) và `10.8.0.4` (địa chỉ `wg0`). Không bind `0.0.0.0`, không bind địa chỉ LAN `192.168.1.9`.
- **Điều kiện tiên quyết:** interface `wg0` phải đang tồn tại và đã sở hữu IP `10.8.0.4/32` **trước khi** container khởi động. Nếu `wg0`/IP chưa sẵn sàng, Docker sẽ không publish được cổng và dịch vụ khởi động lỗi.
- **Peer VPN cần thiết:** máy khách muốn truy cập phải là peer WireGuard đã được cấu hình và kết nối tới `10.8.0.4`. Không có peer và route VPN thì URL này không truy cập được.
- URL dùng giao thức **HTTP** (không TLS), chỉ an toàn trong phạm vi VPN đã tin cậy. Không expose cổng này ra ngoài VPN.

---

## 2. Lệnh Quản Trị Hệ Thống (Exact Commands)

Toàn bộ các thao tác `docker compose` sử dụng project name `sub2api-local`, file cấu hình môi trường bảo mật và kết hợp 2 file compose:
- Base: `/mnt/Data/AI/sub2api/deploy/docker-compose.yml`
- Override: `/mnt/Data/AI/sub2api/deploy/docker-compose.local-build.yml`

### Build image từ mã nguồn
```bash
docker compose -p sub2api-local \
  --env-file /home/duydv/.config/sub2api-local/deployment.env \
  -f /mnt/Data/AI/sub2api/deploy/docker-compose.yml \
  -f /mnt/Data/AI/sub2api/deploy/docker-compose.local-build.yml \
  build
```

### Khởi chạy dịch vụ (chạy nền)
```bash
docker compose -p sub2api-local \
  --env-file /home/duydv/.config/sub2api-local/deployment.env \
  -f /mnt/Data/AI/sub2api/deploy/docker-compose.yml \
  -f /mnt/Data/AI/sub2api/deploy/docker-compose.local-build.yml \
  up -d
```

### Kiểm tra trạng thái containers
```bash
docker compose -p sub2api-local \
  --env-file /home/duydv/.config/sub2api-local/deployment.env \
  -f /mnt/Data/AI/sub2api/deploy/docker-compose.yml \
  -f /mnt/Data/AI/sub2api/deploy/docker-compose.local-build.yml \
  ps
```

### Dừng dịch vụ
```bash
docker compose -p sub2api-local \
  --env-file /home/duydv/.config/sub2api-local/deployment.env \
  -f /mnt/Data/AI/sub2api/deploy/docker-compose.yml \
  -f /mnt/Data/AI/sub2api/deploy/docker-compose.local-build.yml \
  down
```

---

## 3. Quản Lý Dữ Liệu và Volumes

- **Tính bền vững của dữ liệu (Persistence):** Các Docker named volumes (`sub2api-local-data`, `sub2api-local-postgres-data`, `sub2api-local-redis-data`) giữ nguyên trạng thái dữ liệu sau khi dừng hoặc khởi động lại container.
- **Cảnh báo xóa dữ liệu:** Tuyệt đối **không** dùng cờ `-v` (ví dụ: `docker compose ... down -v`) trừ khi bạn chủ động muốn xóa toàn bộ cơ sở dữ liệu và cấu hình lưu trữ.
- **Hệ thống tệp (Filesystem):** Mã nguồn nằm trên phân vùng NTFS (`/mnt/Data/AI/sub2api`), trong khi Docker named volumes được quản lý bên trong filesystem native Linux (ext4 của Docker host) để đảm bảo hiệu năng và tính toàn vẹn dữ liệu cho PostgreSQL/Redis.

---

## 4. Quản Lý Khóa Bí Mật và Tài Khoản (Security & Accounts)

- **Bảo toàn Secret:** Các chuỗi bí mật (secret keys, JWT secrets, database credentials) đã tạo trong `deployment.env` sẽ được giữ nguyên qua các lần restart/rebuild; không tự động tái tạo hay ghi đè.
- **Cấu hình Claude & Token:**
  - Không có bất kỳ tài khoản hoặc token nào được tự động nhập (import).
  - Không có cấu hình Claude hiện tại nào trên máy bị can thiệp hoặc thay đổi.
  - Việc ủy quyền tài khoản (Account Authorization) hoàn toàn do người dùng chủ động cấu hình trên giao diện quản trị sau khi dịch vụ sẵn sàng.
