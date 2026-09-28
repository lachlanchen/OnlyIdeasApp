[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*Đọc sâu. Cùng suy nghĩ.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## Tổng quan

OnlyIdeas là phòng đọc chung dành cho bài nghiên cứu. Nhập PDF hoặc liên kết PDF truy cập mở, giữ công thức và hình ảnh bằng Mathpix rồi thảo luận ngay trong trình đọc. Nội dung nhập mới mặc định chọn Chia sẻ, với tùy chọn Chỉ mình tôi. Việc công bố cần kiểm tra quyền sử dụng và duyệt cộng đồng; ghi chú và hội thoại với tác nhân vẫn riêng tư.

Mô hình tiết kiệm có thể cấu hình sẽ tạo hướng dẫn đọc và bản dịch theo yêu cầu. Văn bản được tạo được lưu riêng với bản gốc. GitHub chỉ lưu các bài đã được chủ động công bố và có đủ quyền. Ứng dụng có đăng nhập GitHub riêng và phiên đăng nhập lâu dài.

![OnlyIdeas reading room](../evidence/library-desktop.png)

<!-- plans21 -->
1.0.2 (21): Hồ sơ luôn hiển thị gói và mức sử dụng, kể cả trước khi đăng nhập hoặc khi chưa thể thanh toán. Cả ba gói cùng hạn mức xuất hiện trên iOS, Android, Mac và PWA. Tính năng trả phí vẫn cần được kiểm chứng bằng giao dịch thử nghiệm.

[1.0.2 (21)](../docs/release-candidate-21.md)

<!-- reader20 -->
1.0.2 (20): Đọc bản gốc, bản dịch hoặc xen kẽ trong cùng trình đọc, giữ bộ nhớ đệm, công thức, hình và bình luận. Mac gốc hỗ trợ Apple silicon và Intel. Sở thích mặc định có nghiên cứu organoid của Shaohua Ma. Đã chuẩn bị gói tháng và dùng thử bảy ngày; chỉ mở thanh toán sau kiểm thử sandbox.

[1.0.2 (20)](../docs/release-candidate-20.md)

<!-- agent19 -->
1.0.2 (19): Nhờ trợ lý tìm, tải xuống, chuyển thành văn bản, tóm tắt, dịch hoặc lưu bài báo. Tìm bằng tiêu đề gần đúng và DOI, bổ sung nguồn công khai và kiểm tra PDF có khớp bài báo. Mở lại kết quả trong cuộc trò chuyện; chỉnh sở thích nghiên cứu trong Không gian của bạn. Nút Quay lại trên Android trở về cuộc trò chuyện.

[1.0.2 (19)](../docs/release-candidate-19.md)

<!-- recovery17 -->
Phiên bản 1.0.2 (17) thêm danh sách đã lưu và đã thích riêng biệt, lịch sử hoạt động, hộp thư và tùy chọn đọc. Khi tải xuống bị chặn, bạn có thể tải PDF của mình lên ngay từ thẻ bài báo hoặc yêu cầu thất bại. Dịch toàn bài, đoạn văn hoặc câu, tái sử dụng phần đã dịch và giữ nguyên công thức, hình ảnh. Chia sẻ vẫn là mặc định: bài có giấy phép mở được hỗ trợ và đã xác minh có thể tự động công bố; bài khác hiển thị đang chờ duyệt. Nhắc đọc hằng ngày trên thiết bị là tùy chọn; thông báo hoạt động hiện được cập nhật trong ứng dụng.

[1.0.2 (17)](../docs/paper-recovery-and-translation.md)


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

Bản gốc 1.0.0 (10) có giao diện xanh ngọc–xanh lam–tím sống động, giao diện theo hệ thống, sáng và tối, cùng 11 ngôn ngữ mặc định theo thiết bị. Trợ lý nhận tệp PDF, Word, ảnh và văn bản riêng tư. Bạn có thể bình luận từng đoạn hoặc tiếp tục chọn văn bản để bình luận. Các yêu cầu dịch đồng thời dùng chung tác vụ và kết quả của cùng phiên bản bài báo, giữ nguyên công thức và hình ảnh. Biểu tượng đã được duyệt và bộ nhớ đệm cục bộ được giữ lại. Xem ghi chú phát hành để biết kết quả kiểm thử và trạng thái cửa hàng.

Phòng đọc công khai hiện có hai bài nghiên cứu thật: OpenAlex (CC0-1.0) và Measuring holographic entanglement entropy on a quantum simulator (CC-BY-4.0), cùng ví dụ gốc được ghi rõ. Bốn hình gốc được giữ lại. Cả hai bài đã đi qua quy trình chuyển đổi thật và được kiểm tra không cần đăng nhập trong trình đọc có chiều rộng điện thoại.

Đang phát triển: điểm đọc trong cơ sở dữ liệu với giữ điểm nguyên tử, hoàn điểm và thưởng không trùng lặp cho bài báo công khai đã duyệt. Hồ sơ hiển thị số dư và lịch sử; tùy chọn chia sẻ chuyển lên trên cuộc trò chuyện và lượt nhập riêng tư cần xác nhận chi phí. Các điều khiển mới hỗ trợ đủ 11 ngôn ngữ. Dịch vụ chính thức chưa bật trừ điểm hoặc mua gói hằng tháng.

Đã chuẩn bị bước tiếp theo: gói hằng tháng trên ứng dụng gốc với giá từ cửa hàng, khôi phục giao dịch, xác minh gia hạn và hoàn tiền. Các gói Người đọc, Nhà nghiên cứu và Studio gồm 200/1.200/2.600 tín dụng mỗi tháng và 40/80/160 tin nhắn trợ lý mỗi ngày. Chức năng mua vẫn tắt cho đến khi hoàn tất kiểm thử cửa hàng và thiết bị.

Phiên bản 1.0.2 (13) bổ sung ứng dụng Mac gốc (macOS 13+, Intel và Apple Silicon) với thanh bên, phím tắt và ứng dụng đồng hành Apple Watch (watchOS 11+). Chủ động gửi trích đoạn bài viết công khai từ tùy chọn đọc trên iPhone; ba trích đoạn gần nhất được lưu để đọc ngoại tuyến và chỉnh cỡ chữ. Công thức, hình ảnh đầy đủ vẫn ở iPhone và Mac. Bài riêng tư, trò chuyện và thông tin đăng nhập không được gửi tới Watch. Xem hồ sơ phát hành để biết trạng thái xét duyệt. Đăng ký vẫn chỉ được bật cho thử nghiệm của người vận hành.

[macOS · Apple Watch](../docs/apple-platforms.md) · [1.0.2 (15)](../docs/release-candidate-15.md)

[Reading credits](../docs/reading-credits.md)

[1.0.0 (10)](../docs/release-candidate-10.md) · [0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

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
