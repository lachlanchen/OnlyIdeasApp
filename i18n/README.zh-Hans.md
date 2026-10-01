[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*认真阅读，一起思考。*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## 概览

OnlyIdeas 是共享的论文阅读空间。导入 PDF 或开放获取的 PDF 链接，通过 Mathpix 保留公式和插图，并在阅读器内讨论段落。新导入默认选择“共享”，也可选择“仅自己”。公开前须审核来源授权和社区要求；笔记和智能体对话始终私密。

可配置的低成本模型按需生成阅读导读和翻译。生成内容与原文分开保存。GitHub 只存储明确发布且获得授权的论文包。应用使用独立的 GitHub 登录和持久会话。

![OnlyIdeas reading room](../evidence/library-desktop.png)

<!-- watchsearch24 -->
**手表与搜索 · TestFlight 1.0.4 (24)**

通过配对的 iPhone，将公开论文摘录以原文、译文或交错模式发送到手表，并复用已下载的译文。macOS 12 及以上版本已在四台 Mac 上通过在线与离线阅读测试。精确 DOI/arXiv 搜索复用已有转录；慢速索引有时限，下载受限时仍可打开来源或上传 PDF。

[24](../docs/watch-search-24.md)

<!-- distribution20260930 -->
**发行 · 2026年10月1日**

Mac 1.0.3 (22) 已通过审核并自动发布，可在 Apple 的175个商店下载，美国售价0.99美元。更新正在同步，公开页面仍显示1.0.2。iOS/Watch 1.0.2 (21) 仍在审核，构建24可通过 TestFlight 内部测试获取。其他平台及订阅状态见发行记录。

包含新图标的 Mac **1.0.4 (24)** 现已**等待审核**，通过后自动发布；现有 iOS 审核保持不变。

网页版和已安装的 PWA 提供适合当前设备的可选商店链接，也可以继续在这里阅读。只有确认正式上架后，才会启用对应的商店按钮。

[Mac App Store](https://apps.apple.com/app/onlyideas/id6816392935?mt=12) · [2026-10-01](../docs/distribution-20260930.md)

<!-- plans21 -->
1.0.2 (21)：个人资料现在始终显示“套餐与用量”，登录前或暂时无法购买时也可查看。在 iOS、Android、Mac 和 PWA 上展示三个已确认套餐及配额。付费功能仍须完成沙盒购买验证后开放。

[1.0.2 (21)](../docs/release-candidate-21.md)

<!-- reader20 -->
1.0.2（20）：在同一阅读器中切换原文、译文或交错双语，保留语言缓存、公式、插图和原文评论。原生 Mac 版支持 Apple 芯片及 Intel。默认兴趣加入马韶华教授的类器官研究。月度订阅与七天试用已准备，购买功能须通过沙盒验证后开放。

[1.0.2 (20)](../docs/release-candidate-20.md)

<!-- agent19 -->
1.0.2（19）：可让助手查找、下载、转录、总结、翻译或收藏论文。支持模糊标题与 DOI 检索、补充公开来源查找和 PDF 匹配检查，对话中可重新打开已保存结果。首页按研究兴趣推荐论文，可在个人空间修改；Android 返回键回到原对话。

[1.0.2 (19)](../docs/release-candidate-19.md)

<!-- recovery17 -->
1.0.2（17）新增独立的收藏与喜欢列表、活动记录、收件箱和阅读偏好。下载受阻时，可直接在论文卡片或失败请求中上传自己的 PDF。支持整篇、段落或句子翻译，复用已有译文并保留公式和图片。默认共享：已验证且受支持的开放许可论文可自动发布，其他论文会明确显示待审核。原生每日提醒可选开启，活动通知目前在应用内刷新。

[1.0.2 (17)](../docs/paper-recovery-and-translation.md)


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

原生版 1.0.0（10）采用鲜明的青绿、蓝、紫界面，支持跟随系统、浅色和深色主题，以及默认跟随设备的 11 种界面语言。助手支持私密 PDF、Word、图片和文本附件。可通过段落按钮讨论，也可继续选择文字评论。按需获取论文译文；多人同时请求会复用同一版本的任务和结果，保留公式与插图。已认可的图标和本地论文缓存继续保留。测试结果与商店状态见发布说明。

公共阅读室现有两篇真实论文：OpenAlex（CC0-1.0）和 Measuring holographic entanglement entropy on a quantum simulator（CC-BY-4.0），另保留明确标注的原创示例。四幅原始插图完整保留。两篇均通过真实转换流程导入，并在未登录的手机宽度阅读器中验证。

开发中：数据库阅读积分支持原子预留、退款，以及审核通过的公开论文奖励，避免重复发放。个人页面显示余额和记录；分享选项移到对话上方，私人导入会先确认积分费用。新控件支持全部 11 种语言。线上服务尚未启用积分扣费和月度订阅购买。

下一阶段已准备：原生月度订阅显示商店价格，支持恢复购买，并验证续费和退款。读者、研究者、工作室三个方案分别包含每月 200/1,200/2,600 积分和每日 40/80/160 条智能体消息。完成商店和设备验证之前，购买功能保持关闭。

1.0.2（13）新增原生 Mac 应用（macOS 13 及以上，支持 Intel 和 Apple 芯片），提供侧栏导航与键盘快捷键，并加入 Apple Watch 伴侣（watchOS 11 及以上）。在 iPhone 的阅读选项中主动发送公开论文选段，最近三份可在手表离线阅读并调整字号。完整公式与插图保留在 iPhone 和 Mac；私人论文、聊天和账户凭据不会发送到手表。审核状态见发布记录。订阅启用仍限运营者测试。

[macOS · Apple Watch](../docs/apple-platforms.md) · [1.0.2 (15)](../docs/release-candidate-15.md)

[Reading credits](../docs/reading-credits.md)

[1.0.0 (10)](../docs/release-candidate-10.md) · [0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

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

**2026-09-30 · OnlyIdeas** — 获批的流动图标已在网页端上线，并纳入 **1.0.4 (23)**，可通过 TestFlight（iPhone/iPad、Watch 配套应用及 Mac）和 Google Play 内部测试获取。新的 Google 正式版和商店图标已准备好。等待所有者决定是否替换期间，保留现有 Apple 和 Google 正式版审核。论文、译文与数据库记录均已保留。
