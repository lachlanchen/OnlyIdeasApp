[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*Đọc sâu. Cùng suy nghĩ.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## Tổng quan

OnlyIdeas là phòng đọc chung dành cho bài nghiên cứu. Nhập PDF hoặc liên kết PDF truy cập mở, giữ công thức và hình ảnh bằng Mathpix rồi thảo luận ngay trong trình đọc. Nội dung nhập mới mặc định chọn Chia sẻ, với tùy chọn Chỉ mình tôi. Việc công bố cần kiểm tra quyền sử dụng và duyệt cộng đồng; ghi chú và hội thoại với tác nhân vẫn riêng tư.

Mô hình tiết kiệm có thể cấu hình sẽ tạo hướng dẫn đọc và bản dịch theo yêu cầu. Văn bản được tạo được lưu riêng với bản gốc. GitHub chỉ lưu các bài đã được chủ động công bố và có đủ quyền. Ứng dụng có đăng nhập GitHub riêng và phiên đăng nhập lâu dài.

![OnlyIdeas reading room](../evidence/library-desktop.png)

## Bắt đầu nhanh

Đọc hướng dẫn vận hành trước khi kết nối thông tin xác thực. Giữ cấu hình trong tệp được bảo vệ, bên ngoài Git.

```bash
npm ci
npm run check
npm run server
# In another terminal:
npm run dev
```

[BRIEF.md](../BRIEF.md) · [docs/architecture.md](../docs/architecture.md) · [docs/operations.md](../docs/operations.md)

## Thiết kế

Mã ứng dụng, nội dung công khai và dữ liệu riêng được lưu tách biệt. MMD giữ TeX; dữ liệu từng phần được tạo khi cần. Bộ xử lý tránh tác vụ trùng lặp và giới hạn số trang, dung lượng, mức dùng hằng ngày.

## Trạng thái

Bản gốc 1.0.0 (9) tận dụng màn hình tốt hơn: điều khiển gọn, phần tóm tắt dùng toàn bộ chiều rộng, cỡ chữ đọc mặc định 18 và trang không trượt ngang. Bài nghiên cứu cùng hình ảnh được lưu tự động, mở từ thiết bị trước rồi cập nhật từ đám mây; Giữ ngoại tuyến ghim một bản sao. Biểu tượng O/i dùng dải màu xanh ngọc, xanh lam, tím và chấm vàng gọn gàng. Việc gửi Apple xét duyệt công khai còn cần ảnh chụp cuối cùng và kiểm tra đăng nhập Apple thực tế.

Phòng đọc công khai hiện có hai bài nghiên cứu thật: OpenAlex (CC0-1.0) và Measuring holographic entanglement entropy on a quantum simulator (CC-BY-4.0), cùng ví dụ gốc được ghi rõ. Bốn hình gốc được giữ lại. Cả hai bài đã đi qua quy trình chuyển đổi thật và được kiểm tra không cần đăng nhập trong trình đọc có chiều rộng điện thoại.

[1.0.0 (9)](../docs/release-candidate-9.md) · [0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

## Ủng hộ

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## Trích dẫn

Hãy trích dẫn kho này khi dùng trong nghiên cứu. GitHub đọc CITATION.cff để cung cấp thông tin trích dẫn. [CITATION.cff](../CITATION.cff)

```bibtex
@software{chen_onlyideas_app_2026,
  author = {Chen, Lachlan},
  title = {OnlyIdeasApp: Read deeply, think together},
  year = {2026},
  url = {https://github.com/lachlanchen/OnlyIdeasApp}
}
```
