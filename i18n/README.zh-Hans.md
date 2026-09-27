[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*认真阅读，一起思考。*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## 概览

OnlyIdeas 是共享的论文阅读空间。导入 PDF 或开放获取的 PDF 链接，通过 Mathpix 保留公式和插图，并在阅读器内讨论段落。新导入默认选择“共享”，也可选择“仅自己”。公开前须审核来源授权和社区要求；笔记和智能体对话始终私密。

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

原生版本 1.0.0（8）加入翡翠绿与金色的专属 O/i 图标，以及“共享／仅自己”的导入选项。iOS 使用 SwiftUI，Android 使用原生控件，支持调节字号、个人主页和保存智能体聊天。工作站智能体通过 LazyEdge 搜索研究索引并下载 PDF，Mathpix 保留公式和插图。Apple 正式送审仍需最终截图和 Apple 登录的实际验证。

公共阅读室现有两篇真实论文：OpenAlex（CC0-1.0）和 Measuring holographic entanglement entropy on a quantum simulator（CC-BY-4.0），另保留明确标注的原创示例。四幅原始插图完整保留。两篇均通过真实转换流程导入，并在未登录的手机宽度阅读器中验证。

[1.0.0 (8)](../docs/release-candidate-8.md) · [0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

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
