[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*深く読み、ともに考える。*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## 概要

OnlyIdeas は論文を一緒に読むための共有読書室です。PDF またはオープンアクセスの PDF リンクを取り込み、Mathpix で数式と図を保持し、本文の一節について話し合えます。新規取り込みは「共有」が初期設定で、「自分のみ」も選べます。公開には利用許諾とコミュニティ審査が必要です。ノートとエージェントとの会話は非公開です。

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

ネイティブ版 1.0.0（10）は青緑・青・紫の鮮やかな画面、システム連動・ライト・ダークのテーマ、端末に合わせた11言語のUIに対応します。エージェントにPDF、Word、画像、テキストを非公開で添付できます。段落ボタンと従来の文字選択からコメントできます。論文翻訳は同時リクエストでも同じ版の処理と結果を共有し、数式と図を保持します。採用済みアイコンと端末内キャッシュは維持しています。検証結果とストア状況はリリースノートをご覧ください。

公開読書室には、明示されたオリジナルサンプルに加え、実際の論文 OpenAlex（CC0-1.0）と Measuring holographic entanglement entropy on a quantum simulator（CC-BY-4.0）を収録しました。元の図を計4点保持しています。どちらも実際の変換処理で取り込み、ログインせずにスマートフォン幅のリーダーで確認しました。

開発中：データベースの読書クレジットに、不可分な残高確保、返還、重複を防ぐ公開論文への審査後報酬を追加しています。プロフィールには残高と履歴を表示し、共有設定は会話の上部へ移動します。非公開の取り込みには費用の確認が必要です。新しい操作画面は全11言語に対応しています。本番環境のクレジット消費と月額購入はまだ有効化していません。

次の段階を準備中です。ネイティブの月額プランにストア価格、購入の復元、更新と返金の検証を追加しました。リーダー・リサーチャー・スタジオには毎月200/1,200/2,600クレジットと、1日40/80/160件のエージェントメッセージが含まれます。ストアと実機での検証が完了するまで購入は無効です。

1.0.2（13）では、サイドバーとキーボードショートカットを備えたネイティブMacアプリ（macOS 13以降、Intel／Appleシリコン）とApple Watch連携（watchOS 11以降）を追加。iPhoneの閲覧メニューから公開論文の抜粋を明示的に送信すると、最新3件を文字サイズを変えながらオフラインで読めます。完全な数式や図はiPhoneとMacに残り、非公開論文・チャット・認証情報はWatchに送りません。審査状況はリリース記録をご覧ください。サブスクリプションの有効化は運営者のテストに限定しています。

[macOS · Apple Watch](../docs/apple-platforms.md) · [1.0.2 (15)](../docs/release-candidate-15.md)

[Reading credits](../docs/reading-credits.md)

[1.0.0 (10)](../docs/release-candidate-10.md) · [0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

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
