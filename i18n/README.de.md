[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*Gründlich lesen. Gemeinsam denken.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## Überblick

OnlyIdeas ist ein ruhiger Leseraum für wissenschaftliche Artikel. Eigene PDFs oder frei zugängliche PDF-Links lassen sich importieren; Mathpix erhält Formeln und Abbildungen. Einzelne Passagen können direkt im Leser besprochen werden. Persönliche Dokumente und Notizen sind zunächst privat.

Ein konfigurierbares, kostengünstiges Modell erstellt auf Anfrage Lesehilfen und Übersetzungen. Erzeugte Texte bleiben vom Original getrennt. GitHub speichert nur ausdrücklich veröffentlichte Artikel mit geklärten Rechten. Die App hat eine eigene GitHub-Anmeldung und dauerhafte Sitzungen.

![OnlyIdeas reading room](../evidence/library-desktop.png)

## Schnellstart

Vor dem Einrichten von Zugangsdaten die Betriebsanleitung lesen. Die Konfiguration gehört in eine geschützte Datei außerhalb von Git.

```bash
npm ci
npm run check
npm run server
# In another terminal:
npm run dev
```

[BRIEF.md](../BRIEF.md) · [docs/architecture.md](../docs/architecture.md) · [docs/operations.md](../docs/operations.md)

## Aufbau

App-Code, öffentliche Inhalte und private Kontodaten liegen getrennt. MMD erhält TeX; Abschnittsdaten entstehen bei Bedarf. Der Worker vermeidet doppelte Aufträge und begrenzt Seiten, Dateigröße und tägliche Nutzung.

## Stand

Version 0.2 ergänzt Entwicklervorschauen für iOS und Android: sichere dauerhafte Anmeldung, PDF-Import, natives Teilen von Markdown und Offline-Lesen mit Gleichungen und Abbildungen. Der Cloud-Dienst ist verfügbar. Diese Builds sind noch nicht in TestFlight oder den App-Stores veröffentlicht. Kontolöschung, umfassendere Moderation und Tests auf echten Smartphones stehen vor der Veröffentlichung noch aus.

[docs/native.md](../docs/native.md)

## Unterstützung

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## Zitieren

Bei wissenschaftlicher Nutzung dieses Repository zitieren. GitHub liest CITATION.cff für den Zitiervorschlag. [CITATION.cff](../CITATION.cff)

```bibtex
@software{chen_onlyideas_app_2026,
  author = {Chen, Lachlan},
  title = {OnlyIdeasApp: Read deeply, think together},
  year = {2026},
  url = {https://github.com/lachlanchen/OnlyIdeasApp}
}
```
