[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*深く読み、ともに考える。*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

<!-- test29 -->
**1.0.7 (29) · 2026-10-10**

OnlyIdeas 1.0.7 (29) を iOS/Watch・Mac の TestFlight と Google Play の内部テストで配信中です。現在の画面を反映したスクリーンショットを次回のストア更新用に準備しました。公開版と進行中の Mac 審査は維持しています。

[1.0.7 (29)](../docs/test-candidate-29.md) · [Screenshots](../store/screenshots/1.0.7-29/README.md)

## 正式公開 · 2026年10月10日

OnlyIdeas 1.0.6 (27) は iOS/Watch と Google Play で公開済みです。Google の配信率は 100% です。Mac 1.0.6 (28) は Apple の審査中で、承認後に自動公開されます。Mac の公開版は 1.0.5 (26) です。モバイル版には承認済みの角丸アイコンが含まれます。

[公開の確認記録](../docs/distribution-20261010.md)

## 正式公開と次の更新 · 2026年10月6日

Apple が iOS/Watch 1.0.2 (21) を承認し、自動公開しました。Mac 1.0.4 (24) も公開済みです。設定済みの175の Apple ストアで利用でき、米国のダウンロード価格は0.99米ドルです。承認済みの流れるようなアイコンとログイン復帰の改善を含む最新 iOS/Watch・Mac 1.0.5 (26) を審査に提出し、承認後の自動公開に設定しました。Google Play は公開中で、build 25 の製品版公開を10月3日に確認しています。Web と PWA では3プラットフォームのストアリンクを有効にしました。174テストとレンダラー・ビルド検証は成功しました。一般向けのサブスクリプション購入はまだ無効です。

[App Store](https://apps.apple.com/app/onlyideas/id6816392935?platform=iphone) · [Mac App Store](https://apps.apple.com/app/onlyideas/id6816392935?platform=mac) · [Google Play](https://play.google.com/store/apps/details?id=art.onlyideas.app) · [2026-10-06](../docs/distribution-20261006.json) · [Apple 26](../docs/apple-review-26-20261006.json)

## 概要

OnlyIdeas は論文を一緒に読むための共有読書室です。PDF またはオープンアクセスの PDF リンクを取り込み、Mathpix で数式と図を保持し、本文の一節について話し合えます。新規取り込みは「共有」が初期設定で、「自分のみ」も選べます。公開には利用許諾とコミュニティ審査が必要です。ノートとエージェントとの会話は非公開です。

設定可能な低コストモデルが、依頼に応じて読解ガイドや翻訳を作成します。生成文は原文と別に保存されます。GitHub には権利確認済みで明示的に公開した論文だけを保存します。独立した GitHub ログインと継続的なセッションを使用します。

![OnlyIdeas reading room](../evidence/library-desktop.png)

<!-- watchsearch24 -->
**Watchと検索 · TestFlight 1.0.4 (24)**

ペアリングしたiPhoneから、公開論文の抜粋を原文・翻訳・交互表示でWatchへ送信できます。ダウンロード済みの翻訳を再利用します。macOS 12以降は所有者の4台のMacでオンライン・オフラインの読書テストに合格しました。DOI/arXivの完全一致検索は既存の変換結果を再利用します。遅い検索には制限時間があり、取得できない場合は出典やPDFアップロードを利用できます。

[24](../docs/watch-search-24.md)

<!-- plans21 -->
1.0.2 (21)：プロフィールに「プランと利用状況」を常に表示します。ログイン前や購入できない場合も、iOS、Android、Mac、PWAで3つのプランと利用枠を確認できます。有料機能の有効化にはサンドボックス購入の検証が必要です。

[1.0.2 (21)](../docs/release-candidate-21.md)

<!-- reader20 -->
1.0.2 (20)：同じリーダーで原文・翻訳・交互表示を切り替え、キャッシュ、数式、図、原文のコメントを保持します。Mac は Apple シリコンと Intel に対応。既定の関心に Shaohua Ma 教授のオルガノイド研究を追加。月額プランと7日間の試用は準備済みで、購入はサンドボックス検証後に有効化します。

[1.0.2 (20)](../docs/release-candidate-20.md)

<!-- agent19 -->
1.0.2 (19)：エージェントに論文の検索、ダウンロード、文字起こし、要約、翻訳、保存を依頼できます。曖昧な題名や DOI で検索し、公開ソースの補完検索と PDF の一致確認を行います。保存した結果は会話から再表示できます。おすすめは研究関心に基づき、個人スペースで変更できます。Android の戻る操作で元の会話に戻ります。

[1.0.2 (19)](../docs/release-candidate-19.md)

<!-- recovery17 -->
1.0.2（17）では保存済みと「いいね」の一覧、履歴、受信箱、読書設定を追加しました。ダウンロードが拒否された場合は、論文カードや失敗したリクエストからPDFを直接アップロードできます。全文・段落・文の翻訳は保存済みの訳を再利用し、数式と図を保持します。共有が既定です。対応する公開ライセンスを確認できた論文は自動公開し、それ以外は審査待ちと表示します。毎日の端末通知は任意で、活動通知は現在アプリ内で更新されます。

[1.0.2 (17)](../docs/paper-recovery-and-translation.md)


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

**2026-09-30 · OnlyIdeas** — 承認された流れる形のアイコンをウェブに公開しました。**1.0.4 (23)** にも含まれ、TestFlight（iPhone/iPad、Watch コンパニオン、Mac）と Google Play 内部テストで利用できます。新しい Google 製品版とストアアイコンは準備済みです。差し替えについて所有者が判断するまで、既存の Apple と Google の製品版審査を維持します。論文、翻訳、データベースの記録は保持しています。
