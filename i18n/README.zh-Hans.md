[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*认真阅读，一起思考。*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## 概览

OnlyIdeas 是一个安静的论文阅读与交流空间。导入自己的 PDF 或开放获取 PDF 链接，通过 Mathpix 保留公式和插图，并直接在阅读器中讨论段落。个人论文和笔记默认保持私密。

可配置的低成本模型按需生成阅读导读和翻译。生成内容与原文分开保存。GitHub 只存储明确发布且获得授权的论文包。应用使用独立的 GitHub 登录和持久会话。

![OnlyIdeas reading room](../evidence/library-desktop.png)

## 快速开始

连接服务凭据前请阅读运维指南。配置应保存在受保护的文件中，不得提交到 Git。

```bash
npm ci
npm run check
npm run server
# In another terminal:
npm run dev
```

[BRIEF.md](../BRIEF.md) · [docs/architecture.md](../docs/architecture.md) · [docs/operations.md](../docs/operations.md)

## 设计

应用代码、公开内容与私人账户数据分别存放。MMD 保留 TeX，段落数据按需生成。工作队列会去重，并限制页数、字节数和每日用量。

## 状态

0.2 新增 iOS 和 Android 开发者预览：安全持久登录、PDF 导入、系统 Markdown 分享，以及保留公式和插图的离线阅读。云端服务已上线。这些构建尚未发布到 TestFlight 或应用商店。正式发布前仍需完善账号删除、社区管理，并完成真机测试。

[docs/native.md](../docs/native.md)

## 支持

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## 引用

在研究中使用本仓库时请引用。GitHub 通过 CITATION.cff 提供引用信息。 [CITATION.cff](../CITATION.cff)

```bibtex
@software{chen_onlyideas_app_2026,
  author = {Chen, Lachlan},
  title = {OnlyIdeasApp: Read deeply, think together},
  year = {2026},
  url = {https://github.com/lachlanchen/OnlyIdeasApp}
}
```
