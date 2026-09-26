[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*Đọc sâu. Cùng suy nghĩ.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## Tổng quan

OnlyIdeas là không gian yên tĩnh để đọc bài báo nghiên cứu. Nhập PDF của bạn hoặc liên kết PDF truy cập mở, giữ nguyên phương trình và hình ảnh bằng Mathpix, rồi thảo luận từng đoạn ngay trong trình đọc. Tài liệu cá nhân và ghi chú ban đầu là riêng tư.

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

Dịch vụ đám mây đang hoạt động. Bản thử nghiệm được phân phối qua các nhóm nội bộ của chủ sở hữu trên TestFlight và Google Play; bản ghi cập nhật ứng dụng gốc nêu trạng thái bản dựng đã xác nhận. Việc gửi xét duyệt công khai vẫn cần hoàn thiện xóa tài khoản, kiểm duyệt, tuân thủ yêu cầu đăng nhập iOS và thông tin cửa hàng. Phạm vi thử nghiệm trên thiết bị thật và toàn bộ quy trình đăng nhập iOS còn hạn chế.

Phiên bản 0.3 có màn hình SwiftUI trên iOS và giao diện gốc Android, chữ đọc lớn hơn có thể điều chỉnh, trang hồ sơ riêng và hội thoại với tác nhân được lưu lại. Tác nhân trên máy trạm tìm trong các chỉ mục nghiên cứu mở và tải PDF, dùng mô hình cục bộ qua LazyEdge. Chọn chuyển đổi và thêm để tạo bản đọc Mathpix riêng tư, giữ nguyên phương trình và hình ảnh. Xem bản ghi cập nhật ứng dụng gốc để biết trạng thái bản dựng và kiểm thử.

[0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

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
