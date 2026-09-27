[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*Gründlich lesen. Gemeinsam denken.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## Überblick

OnlyIdeas ist ein gemeinsamer Leseraum für Forschungsarbeiten. PDF-Dateien oder frei zugängliche PDF-Links importieren, Formeln und Abbildungen mit Mathpix erhalten und Textstellen direkt im Reader besprechen. Neue Importe sind standardmäßig zum Teilen vorgesehen; Nur ich ist ebenfalls wählbar. Eine Veröffentlichung erfolgt nach Rechteprüfung und Moderation. Notizen und Agentengespräche bleiben privat.

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

Die native Version 1.0.0 (8) enthält ein eigenes smaragdgrünes und goldenes O/i-Symbol sowie die Auswahl Teilen/Nur ich. SwiftUI auf iOS und native Android-Steuerelemente bieten einstellbare Schriftgröße, Profil und Gesprächsverlauf. Der Agent auf der Workstation sucht über LazyEdge nach Arbeiten und lädt PDFs herunter; Mathpix erhält Formeln und Abbildungen. Für Apples öffentliche Prüfung fehlen noch finale Screenshots und eine Prüfung der tatsächlichen Apple-Anmeldung.

Der öffentliche Leseraum enthält zwei echte Arbeiten: OpenAlex (CC0-1.0) und Measuring holographic entanglement entropy on a quantum simulator (CC-BY-4.0), zusätzlich zum klar gekennzeichneten Originalbeispiel. Vier Originalabbildungen bleiben erhalten. Beide Arbeiten wurden über den echten Konvertierungsablauf importiert und ohne Anmeldung bei Smartphone-Breite geprüft.

[1.0.0 (8)](../docs/release-candidate-8.md) · [0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

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
