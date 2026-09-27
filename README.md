[English](README.md) · [العربية](i18n/README.ar.md) · [Español](i18n/README.es.md) · [Français](i18n/README.fr.md) · [日本語](i18n/README.ja.md) · [한국어](i18n/README.ko.md) · [Tiếng Việt](i18n/README.vi.md) · [中文 (简体)](i18n/README.zh-Hans.md) · [中文（繁體）](i18n/README.zh-Hant.md) · [Deutsch](i18n/README.de.md) · [Русский](i18n/README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*Read deeply. Think together.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## Overview

OnlyIdeas is a shared reading room for research papers. Import a PDF or an open-access PDF link, preserve equations and figures with Mathpix, and discuss passages inside the reader. New imports default to Shared, with an Only me option. Publication follows source permission and community review; notes and agent conversations stay private.

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

Native 1.0.0 (10) adds a vivid teal–blue–violet interface, system/light/dark themes and 11 app languages, selected from your device by default. The agent accepts private PDF, Word, image and text attachments. Discuss a paragraph or keep selecting a passage. Fetch a paper translation in any supported language: simultaneous readers share the same revision-specific job and completed result. Equations and figures remain intact, and the accepted icon and local paper cache are retained. See the release note for verified testing and current store status.

The public reading room now includes two real papers: OpenAlex (CC0-1.0) and Measuring holographic entanglement entropy on a quantum simulator (CC-BY-4.0), alongside the clearly labeled original sample. Four original figures are retained. Both papers were imported through the real conversion workflow and checked in a phone-width reader without signing in.

[1.0.0 (10)](docs/release-candidate-10.md) · [0.3](docs/native-0.3.md) · [docs/native.md](docs/native.md)

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
