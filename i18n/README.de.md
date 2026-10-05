[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*Gründlich lesen. Gemeinsam denken.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## Aktuelle Tests und Prüfung · 6. Oktober 2026

Apple hat iOS 1.0.2 (21) nach 4.3/4.2.6 abgelehnt und vor einer erneuten Einreichung Erläuterungen angefordert. Alle neun Fragen wurden mit echten Reader-Screenshots beantwortet; Apples Antwort steht aus. Apple 1.0.5 (26) bleibt in TestFlight, Mac 1.0.4 (24) ist öffentlich. Android 1.0.5 (25) wurde am 3. Oktober als veröffentlicht bestätigt. Die aktuellen 174 Tests, Renderer-Prüfung und der Produktionsbuild bestanden. Allgemeine Abonnementkäufe bleiben deaktiviert; bestehende Artikel und Konten bleiben erhalten.

[Google 25](../docs/release-candidate-25.md) · [Apple 26](../docs/app-review-20261006.json)

## Überblick

OnlyIdeas ist ein gemeinsamer Leseraum für Forschungsarbeiten. PDF-Dateien oder frei zugängliche PDF-Links importieren, Formeln und Abbildungen mit Mathpix erhalten und Textstellen direkt im Reader besprechen. Neue Importe sind standardmäßig zum Teilen vorgesehen; Nur ich ist ebenfalls wählbar. Eine Veröffentlichung erfolgt nach Rechteprüfung und Moderation. Notizen und Agentengespräche bleiben privat.

Ein konfigurierbares, kostengünstiges Modell erstellt auf Anfrage Lesehilfen und Übersetzungen. Erzeugte Texte bleiben vom Original getrennt. GitHub speichert nur ausdrücklich veröffentlichte Artikel mit geklärten Rechten. Die App hat eine eigene GitHub-Anmeldung und dauerhafte Sitzungen.

![OnlyIdeas reading room](../evidence/library-desktop.png)

<!-- watchsearch24 -->
**Watch und Suche · TestFlight 1.0.4 (24)**

Sende Auszüge öffentlicher Artikel als Original, Übersetzung oder abwechselnden Text vom gekoppelten iPhone an die Watch. Heruntergeladene Übersetzungen werden wiederverwendet. macOS 12 und neuer bestand Online- und Offline-Lesetests auf allen vier Macs des Besitzers. Die genaue DOI/arXiv-Suche nutzt vorhandene Texte; langsame Suchdienste haben ein Zeitlimit. Bei gesperrten Downloads bleiben Quelle und PDF-Upload verfügbar.

[24](../docs/watch-search-24.md)

<!-- distribution20260930 -->
**2026-10-02 · OnlyIdeas**

**Mac 1.0.4 (24) ist mit dem neuen Symbol veröffentlicht.** Im US-amerikanischen und Hongkonger App Store bestätigt; in 175 Stores verfügbar, US-Preis 0,99 USD. Unterstützt macOS 12 und neuer. iOS/Watch 1.0.2 (21) wartet weiterhin auf Prüfung; die bestehende Einreichung bleibt unverändert.

Web und installierte PWA bieten optionale, zum Gerät passende Store-Links. Hier weiterlesen bleibt möglich; Store-Schaltflächen werden erst nach bestätigter öffentlicher Verfügbarkeit aktiviert.

[Mac App Store](https://apps.apple.com/app/onlyideas/id6816392935?platform=mac) · [2026-10-02](../docs/distribution-20260930.md)

<!-- plans21 -->
1.0.2 (21): Das Profil zeigt Tarife und Nutzung jetzt immer an, auch vor der Anmeldung oder bei nicht verfügbarem Kauf. Alle drei Tarife und Kontingente sind auf iOS, Android, Mac und PWA sichtbar. Zahlungen werden erst nach erfolgreichen Sandbox-Kauftests aktiviert.

[1.0.2 (21)](../docs/release-candidate-21.md)

<!-- reader20 -->
1.0.2 (20): Original, Übersetzung oder abwechselnde Absätze im selben Reader, mit Cache, Formeln, Abbildungen und Quellkommentaren. Native Mac-App für Apple Silicon und Intel. Interessen umfassen Shaohua Mas Organoidforschung. Monatspläne und siebentägige Testphase sind vorbereitet; Käufe bleiben bis zur Sandbox-Prüfung gesperrt.

[1.0.2 (20)](../docs/release-candidate-20.md)

<!-- agent19 -->
1.0.2 (19): Der Agent kann Artikel finden, herunterladen, transkribieren, zusammenfassen, übersetzen und speichern. Ungefähre Titel und DOIs werden mit ergänzender Suche in öffentlichen Quellen und PDF-Abgleich unterstützt. Gespeicherte Ergebnisse lassen sich im Chat öffnen. Interessen sind im persönlichen Bereich änderbar; Android Zurück führt zum Gespräch.

[1.0.2 (19)](../docs/release-candidate-19.md)

<!-- recovery17 -->
Version 1.0.2 (17) ergänzt getrennte Listen für gespeicherte und mit Gefällt mir markierte Artikel, Aktivitäten, Posteingang und Lesevorlieben. Bei blockierten Downloads lässt sich die eigene PDF direkt auf der Artikelkarte oder beim fehlgeschlagenen Auftrag hochladen. Übersetzungen ganzer Artikel, Absätze oder Sätze verwenden gespeicherte Teile erneut und erhalten Formeln und Abbildungen. Teilen bleibt die Vorgabe: bestätigte unterstützte offene Lizenzen erlauben automatische Veröffentlichung, andere Artikel warten auf Prüfung. Tägliche Geräteerinnerungen sind optional; Aktivitätshinweise werden derzeit innerhalb der App aktualisiert.

[1.0.2 (17)](../docs/paper-recovery-and-translation.md)


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

Nächster Schritt vorbereitet: native monatliche Abos mit Store-Preisen, Wiederherstellung sowie geprüften Verlängerungen und Erstattungen. Leser, Forscher und Studio enthalten 200/1.200/2.600 monatliche Credits und 40/80/160 tägliche Nachrichten an den Assistenten. Käufe bleiben bis zum Abschluss der Store- und Gerätetests deaktiviert.

Version 1.0.2 (13) ergänzt eine native Mac-App (macOS 13+, Intel und Apple Silicon) mit Seitenleiste und Tastaturkürzeln sowie eine Apple-Watch-Begleitapp (watchOS 11+). Sende einen Auszug eines öffentlichen Artikels ausdrücklich über die Leseoptionen am iPhone. Die letzten drei bleiben mit anpassbarer Schrift offline lesbar. Vollständige Formeln und Abbildungen bleiben auf iPhone und Mac. Private Artikel, Chats und Zugangsdaten werden niemals zur Watch übertragen. Der Freigabestatus steht im Versionsbericht. Abonnements sind weiterhin auf Betreibertests beschränkt.

[macOS · Apple Watch](../docs/apple-platforms.md) · [1.0.2 (15)](../docs/release-candidate-15.md)

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

**2026-09-30 · OnlyIdeas** — Das freigegebene fließende Symbol ist im Web aktiv und in **1.0.4 (23)** enthalten, verfügbar über TestFlight (iPhone/iPad, Watch-Begleitapp und Mac) sowie im internen Google-Play-Test. Der neue Google-Produktionsbuild und das Store-Symbol sind vorbereitet. Die laufenden Apple- und Google-Prüfungen bleiben bis zur Entscheidung des Eigentümers unverändert. Artikel, Übersetzungen und Datenbankeinträge wurden erhalten.
