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

Die native Version 1.0.0 (10) bietet eine lebendige Oberfläche in Türkis, Blau und Violett, System-, Hell- und Dunkeldesign sowie 11 App-Sprachen mit der Gerätesprache als Standard. Der Agent nimmt private PDF-, Word-, Bild- und Textanhänge an. Kommentare sind über Absatzschaltflächen und weiterhin über die Textauswahl möglich. Gleichzeitige Übersetzungsanfragen verwenden denselben Auftrag und das Ergebnis derselben Papierfassung; Formeln und Abbildungen bleiben erhalten. Das bestätigte Symbol und der lokale Cache bleiben bestehen. Tests und Store-Status stehen in den Versionshinweisen.

Der öffentliche Leseraum enthält zwei echte Arbeiten: OpenAlex (CC0-1.0) und Measuring holographic entanglement entropy on a quantum simulator (CC-BY-4.0), zusätzlich zum klar gekennzeichneten Originalbeispiel. Vier Originalabbildungen bleiben erhalten. Beide Arbeiten wurden über den echten Konvertierungsablauf importiert und ohne Anmeldung bei Smartphone-Breite geprüft.

In Entwicklung: Leseguthaben in der Datenbank mit atomaren Reservierungen, Erstattungen und einmaligen Belohnungen für genehmigte öffentliche Paper. Das Profil zeigt Guthaben und Verlauf; die Freigabeoptionen stehen über dem Chat, und private Importe erfordern eine Kostenbestätigung. Die neuen Bedienelemente unterstützen alle 11 Sprachen. Guthabenabbuchungen und monatliche Käufe sind im Produktivbetrieb noch nicht aktiviert.

[Reading credits](../docs/reading-credits.md)

[1.0.0 (10)](../docs/release-candidate-10.md) · [0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

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
