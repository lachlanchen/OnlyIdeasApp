[English](README.md) · [العربية](i18n/README.ar.md) · [Español](i18n/README.es.md) · [Français](i18n/README.fr.md) · [日本語](i18n/README.ja.md) · [한국어](i18n/README.ko.md) · [Tiếng Việt](i18n/README.vi.md) · [中文 (简体)](i18n/README.zh-Hans.md) · [中文（繁體）](i18n/README.zh-Hant.md) · [Deutsch](i18n/README.de.md) · [Русский](i18n/README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*Read deeply. Think together.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## Overview

OnlyIdeas is a quiet reading room for research papers. Import your own PDF or an open-access PDF link, preserve equations and figures with Mathpix, and discuss a passage without leaving the reader. Personal papers and notes begin privately.

A configurable economical model creates reading guides and translations on request. Generated text stays separate from the original. GitHub stores only explicitly published, rights-cleared paper bundles. The app has its own GitHub login and a persistent session.

![OnlyIdeas reading room](evidence/library-desktop.png)

## Quick start

Read the operations guide before connecting provider credentials. Keep configuration outside Git, in a protected file.

```bash
npm ci
npm run check
npm run server
# In another terminal:
npm run dev
```

[BRIEF.md](BRIEF.md) · [docs/architecture.md](docs/architecture.md) · [docs/operations.md](docs/operations.md)

## Design

App code, content and private account data have separate homes. MMD preserves TeX; derived section data is generated when needed. The worker deduplicates jobs and enforces page, byte and daily limits.

## Status

Version 0.2 adds iOS and Android previews: secure persistent sign-in, PDF import, native Markdown sharing, and offline papers with equations and figures. The cloud service is live. Build 1 is available to the owner's internal TestFlight and Google Play test groups. Public store review is not yet submitted: account deletion, fuller moderation, iOS sign-in compliance and listing preparation remain. Physical-phone coverage and iOS login end-to-end QA are still limited.

[docs/native.md](docs/native.md) · [Store publication record](docs/store-release-20260926.md)

## Support

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## Citation

Cite this repository when using it in research. GitHub reads CITATION.cff to offer a citation. [CITATION.cff](CITATION.cff)

```bibtex
@software{chen_onlyideas_app_2026,
  author = {Chen, Lachlan},
  title = {OnlyIdeasApp: Read deeply, think together},
  year = {2026},
  url = {https://github.com/lachlanchen/OnlyIdeasApp}
}
```
