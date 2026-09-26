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

云端服务已上线。测试版通过所有者的 TestFlight 和 Google Play 内部测试组分发；各构建的已确认状态见原生更新记录。公开商店审核仍需完成账号删除、完整社区管理、iOS 登录合规和商店资料准备。真机覆盖和 iOS 登录全流程验证仍有限。

0.3 改用 iOS SwiftUI 界面和 Android 原生控件，增大并支持调节阅读字号，加入独立个人主页和保存历史的智能体聊天。工作站上的智能体通过 LazyEdge 使用本地模型，搜索开放研究索引并下载 PDF。点击转换并添加后，Mathpix 会生成保留公式和插图的私人阅读副本。构建与测试状态见原生更新记录。

[0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

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
