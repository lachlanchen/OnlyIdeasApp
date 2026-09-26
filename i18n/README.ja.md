[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*深く読み、ともに考える。*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## 概要

OnlyIdeas は研究論文を落ち着いて読み、話し合うための場所です。自分の PDF やオープンアクセスの PDF リンクを取り込み、Mathpix で数式と図を保持し、読書画面で段落について議論できます。個人の論文とノートは初めは非公開です。

設定可能な低コストモデルが、依頼に応じて読解ガイドや翻訳を作成します。生成文は原文と別に保存されます。GitHub には権利確認済みで明示的に公開した論文だけを保存します。独立した GitHub ログインと継続的なセッションを使用します。

![OnlyIdeas reading room](../evidence/library-desktop.png)

## 使い始める

サービスの認証情報を設定する前に運用ガイドを読んでください。設定は保護されたファイルに置き、Git に含めないでください。

```bash
npm ci
npm run check
npm run server
# In another terminal:
npm run dev
```

[BRIEF.md](../BRIEF.md) · [docs/architecture.md](../docs/architecture.md) · [docs/operations.md](../docs/operations.md)

## 設計

アプリのコード、公開資料、個人データは別々に保存します。MMD は TeX を保持し、段落データは必要に応じて生成します。ワーカーは重複処理を防ぎ、ページ数、容量、日次使用量を制限します。

## 状況

0.2 では iOS・Android 向けの開発者プレビューを追加しました。安全なログインの保持、PDF の取り込み、OS の共有機能による Markdown の書き出し、数式と図を含むオフライン読書に対応します。クラウドサービスは稼働中です。TestFlight やアプリストアではまだ配信していません。正式公開には、アカウント削除、モデレーションの充実、実機テストが必要です。

[docs/native.md](../docs/native.md)

## 支援

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## 引用

研究でこのリポジトリを利用する場合は引用してください。GitHub は CITATION.cff から引用情報を提供します。 [CITATION.cff](../CITATION.cff)

```bibtex
@software{chen_onlyideas_app_2026,
  author = {Chen, Lachlan},
  title = {OnlyIdeasApp: Read deeply, think together},
  year = {2026},
  url = {https://github.com/lachlanchen/OnlyIdeasApp}
}
```
