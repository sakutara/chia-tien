## ADDED Requirements

### Requirement: Khung ứng dụng React và TypeScript
Hệ thống SHALL được xây dựng bằng Vite 8, React 19, TypeScript 6 và Tailwind CSS 3. `App` là khung trang gồm header và trang mẫu, gọi `ensureDefaultData` khi mount và hiển thị tên Người chủ trì lấy từ bảng `members` qua `useLiveQuery`. (US-1.1)

#### Scenario: Khởi động hiển thị khung và Người chủ trì
- **WHEN** `App` được mount
- **THEN** `ensureDefaultData` được gọi, header được hiển thị, và tên của hồ sơ có `isDefaultHost = true` được hiển thị trên giao diện

### Requirement: Giao diện mang phong cách tiền USD
Hệ thống SHALL thể hiện giao diện theo phong cách tờ tiền USD: xanh lá đậm, nền giấy kem và số tiền thẳng cột. (BR-1.2)

#### Scenario: Giao diện đạt tiêu chí nghiệm thu (AC-1)
- **WHEN** người dùng mở ứng dụng
- **THEN** màu chủ đạo là xanh lá đậm, nền là giấy kem, và các số tiền trong cùng một cột thẳng hàng

### Requirement: Bảng màu USD Green cố định
Hệ thống SHALL dùng bảng màu cố định sau. Màu xanh: `#0A1F16`, `#123123`, `#1B4332`, `#2D6A4F`, `#40916C`, `#D8F3DC`. Màu giấy: `#FAF8F5`, `#F2EFE9`, `#E4DFD5`. Màu vàng `#CA8A04` dùng cho Người chủ trì, bữa đã lưu trữ và VAT. Màu đỏ `#DC2626` dùng cho số âm và thao tác xoá. (R-1)

#### Scenario: Màu được dùng đúng vai trò
- **GIVEN** giao diện đang hiển thị dữ liệu
- **WHEN** hiển thị hồ sơ Người chủ trì, bữa đã lưu trữ, VAT, số âm hoặc thao tác xoá
- **THEN** Người chủ trì, bữa đã lưu trữ và VAT dùng màu vàng `#CA8A04`; số âm và thao tác xoá dùng màu đỏ `#DC2626`; nền dùng màu giấy kem

### Requirement: Số tiền dùng font số tabular
Hệ thống SHALL hiển thị mọi cột số tiền bằng font số tabular (`tabular-nums`, kiểu mono) để các chữ số thẳng hàng. (R-2)

#### Scenario: Cột số tiền thẳng hàng (R-2)
- **GIVEN** một bảng có nhiều số tiền với số chữ số khác nhau
- **WHEN** bảng được hiển thị
- **THEN** các số tiền được căn thẳng theo cột

### Requirement: Kiểu chữ và font
Hệ thống SHALL tải font từ Google Fonts cho giao diện. Khi người dùng offline lần đầu và font chưa được tải, hệ thống SHALL dùng font dự phòng và vẫn hiển thị được nội dung.

#### Scenario: Offline lần đầu dùng font dự phòng
- **GIVEN** người dùng mở ứng dụng lần đầu khi không có mạng
- **WHEN** trình duyệt không tải được font từ Google Fonts
- **THEN** giao diện hiển thị bằng font dự phòng và ứng dụng vẫn dùng được

### Requirement: Thành phần giao diện dùng chung
Hệ thống SHALL cung cấp các thành phần giao diện dùng chung trong `index.css`, gồm Tailwind cùng các class `.card`, `.btn-*`, `.money` và `.badge-active`, để các Epic sau tái sử dụng. (US-1.1)

#### Scenario: Epic sau tái sử dụng thành phần dùng chung
- **WHEN** một Epic sau cần hiển thị thẻ, nút, số tiền hoặc nhãn trạng thái
- **THEN** dùng được các class dùng chung đã có, không cần viết lại kiểu

### Requirement: Khả năng tiếp cận: vòng focus rõ và tương phản cao
Hệ thống SHALL hiển thị vòng focus rõ bằng `focus-visible` ring màu `usd-green-600`, và chữ trên nền SHALL có độ tương phản cao.

#### Scenario: Điều hướng bằng bàn phím
- **WHEN** người dùng dùng bàn phím để di chuyển đến một phần tử tương tác
- **THEN** phần tử đó hiển thị vòng focus màu `usd-green-600`
