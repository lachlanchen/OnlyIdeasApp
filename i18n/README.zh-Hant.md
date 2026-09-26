[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*認真閱讀，一起思考。*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## 概覽

OnlyIdeas 是一個安靜的論文閱讀與交流空間。匯入自己的 PDF 或開放取用 PDF 連結，透過 Mathpix 保留公式和插圖，並直接在閱讀器中討論段落。個人論文和筆記預設保持私密。

可設定的低成本模型按需產生閱讀導讀與翻譯。產生內容與原文分開保存。GitHub 只儲存明確發布且獲得授權的論文套件。應用程式使用獨立的 GitHub 登入和持續工作階段。

![OnlyIdeas reading room](../evidence/library-desktop.png)

## 快速開始

連接服務憑證前請閱讀維運指南。設定應保存在受保護的檔案中，不得提交到 Git。

```bash
npm ci
npm run check
npm run server
# In another terminal:
npm run dev
```

[BRIEF.md](../BRIEF.md) · [docs/architecture.md](../docs/architecture.md) · [docs/operations.md](../docs/operations.md)

## 設計

應用程式碼、公開內容與私人帳戶資料分開存放。MMD 保留 TeX，段落資料按需產生。工作佇列會去除重複工作，並限制頁數、位元組數和每日用量。

## 狀態

0.2 新增 iOS 與 Android 開發者預覽：安全持續登入、PDF 匯入、系統 Markdown 分享，以及保留公式和插圖的離線閱讀。雲端服務已上線。這些版本尚未發佈至 TestFlight 或應用程式商店。正式發佈前仍須完善帳號刪除、社群管理，並完成實機測試。

[docs/native.md](../docs/native.md)

## 支持

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## 引用

在研究中使用本儲存庫時請引用。GitHub 透過 CITATION.cff 提供引用資訊。 [CITATION.cff](../CITATION.cff)

```bibtex
@software{chen_onlyideas_app_2026,
  author = {Chen, Lachlan},
  title = {OnlyIdeasApp: Read deeply, think together},
  year = {2026},
  url = {https://github.com/lachlanchen/OnlyIdeasApp}
}
```
