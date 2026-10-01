[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*認真閱讀，一起思考。*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## 概覽

OnlyIdeas 是共享的論文閱讀空間。匯入 PDF 或開放取用的 PDF 連結，透過 Mathpix 保留公式和插圖，並在閱讀器內討論段落。新匯入預設選擇「共享」，也可選擇「僅自己」。公開前須審核來源授權與社群要求；筆記和智慧代理對話始終私密。

可設定的低成本模型按需產生閱讀導讀與翻譯。產生內容與原文分開保存。GitHub 只儲存明確發布且獲得授權的論文套件。應用程式使用獨立的 GitHub 登入和持續工作階段。

![OnlyIdeas reading room](../evidence/library-desktop.png)

<!-- watchsearch24 -->
**手錶與搜尋 · TestFlight 1.0.4 (24)**

透過配對的 iPhone，將公開論文摘錄以原文、譯文或交錯模式傳送到手錶，並重用已下載的譯文。macOS 12 及以上版本已在四台 Mac 上通過線上與離線閱讀測試。精確 DOI/arXiv 搜尋重用既有轉錄；慢速索引有時限，下載受限時仍可開啟來源或上傳 PDF。

[24](../docs/watch-search-24.md)

<!-- distribution20260930 -->
**2026-10-02 · OnlyIdeas**

**Mac 1.0.4 (24) 已攜新圖示正式上架。** 已在美國和香港 App Store 確認，涵蓋175個商店，美國售價0.99美元，支援 macOS 12 及以上版本。iOS/Watch 1.0.2 (21) 仍在等待審核，現有提交維持不變。

網頁版和已安裝的 PWA 提供適合目前裝置的可選商店連結，也可以繼續在這裡閱讀。只有確認正式上架後，才會啟用對應的商店按鈕。

[Mac App Store](https://apps.apple.com/app/onlyideas/id6816392935?platform=mac) · [2026-10-02](../docs/distribution-20260930.md)

<!-- plans21 -->
1.0.2 (21)：個人檔案現在一律顯示「方案與用量」，登入前或暫時無法購買時也能查看。iOS、Android、Mac 和 PWA 均展示三個已確認方案及配額。付費功能仍須完成沙盒購買驗證後開放。

[1.0.2 (21)](../docs/release-candidate-21.md)

<!-- reader20 -->
1.0.2（20）：在同一閱讀器切換原文、譯文或交錯雙語，保留語言快取、公式、插圖和原文評論。原生 Mac 版支援 Apple 晶片及 Intel。預設興趣加入馬韶華教授的類器官研究。月度訂閱與七天試用已準備，購買功能須通過沙盒驗證後開放。

[1.0.2 (20)](../docs/release-candidate-20.md)

<!-- agent19 -->
1.0.2（19）：可讓助手尋找、下載、轉錄、總結、翻譯或收藏論文。支援模糊標題與 DOI 檢索、補充公開來源查找和 PDF 比對檢查，對話中可重新開啟已儲存結果。首頁依研究興趣推薦論文，可在個人空間修改；Android 返回鍵回到原對話。

[1.0.2 (19)](../docs/release-candidate-19.md)

<!-- recovery17 -->
1.0.2（17）新增獨立的收藏與喜歡清單、活動記錄、收件匣和閱讀偏好。下載受阻時，可直接在論文卡片或失敗請求中上傳自己的 PDF。支援整篇、段落或句子翻譯，重用已有譯文並保留公式和圖片。預設共享：已驗證且受支援的開放授權論文可自動發布，其他論文會清楚顯示待審核。原生每日提醒可選擇開啟，活動通知目前在應用程式內更新。

[1.0.2 (17)](../docs/paper-recovery-and-translation.md)


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

原生版 1.0.0（10）採用鮮明的青綠、藍、紫介面，支援跟隨系統、淺色和深色主題，以及預設跟隨裝置的 11 種介面語言。助手支援私密 PDF、Word、圖片和文字附件。可透過段落按鈕討論，也可繼續選取文字留言。按需取得論文譯文；多人同時請求會共用同一版本的工作和結果，保留公式與插圖。已認可的圖示和本機論文快取繼續保留。測試結果與商店狀態見發行說明。

公共閱讀室現有兩篇真實論文：OpenAlex（CC0-1.0）和 Measuring holographic entanglement entropy on a quantum simulator（CC-BY-4.0），另保留明確標示的原創範例。四幅原始插圖完整保留。兩篇均透過真實轉換流程匯入，並在未登入的手機寬度閱讀器中驗證。

開發中：資料庫閱讀積分支援原子預留、退款，以及審核通過的公開論文獎勵，避免重複發放。個人頁面顯示餘額和紀錄；分享選項移到對話上方，私人匯入會先確認積分費用。新控制項支援全部 11 種語言。線上服務尚未啟用積分扣費和月度訂閱購買。

下一階段已準備：原生每月訂閱顯示商店價格，支援回復購買，並驗證續費與退款。讀者、研究者、工作室三個方案分別包含每月 200/1,200/2,600 點數與每日 40/80/160 則代理訊息。完成商店與裝置驗證之前，購買功能保持關閉。

1.0.2（13）新增原生 Mac 應用程式（macOS 13 以上，支援 Intel 與 Apple 晶片），提供側欄導覽及鍵盤快捷鍵，並加入 Apple Watch 伴侶（watchOS 11 以上）。在 iPhone 的閱讀選項中主動傳送公開論文選段，最近三份可在手錶離線閱讀並調整字級。完整公式與插圖保留在 iPhone 和 Mac；私人論文、聊天及帳戶憑證不會傳送至手錶。審核狀態見發布紀錄。訂閱啟用仍限營運者測試。

[macOS · Apple Watch](../docs/apple-platforms.md) · [1.0.2 (15)](../docs/release-candidate-15.md)

[Reading credits](../docs/reading-credits.md)

[1.0.0 (10)](../docs/release-candidate-10.md) · [0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

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

**2026-09-30 · OnlyIdeas** — 獲核可的流動圖示已於網頁端上線，並納入 **1.0.4 (23)**，可透過 TestFlight（iPhone/iPad、Watch 配套應用程式及 Mac）與 Google Play 內部測試取得。新的 Google 正式版與商店圖示已備妥。等待擁有者決定是否替換期間，保留現有 Apple 與 Google 正式版審查。論文、譯文及資料庫紀錄均已保留。
