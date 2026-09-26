[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*Читайте вдумчиво. Размышляйте вместе.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## Обзор

OnlyIdeas — спокойное пространство для чтения научных статей. Загрузите свой PDF или ссылку на PDF в открытом доступе, сохраните формулы и рисунки с Mathpix и обсуждайте фрагменты прямо в читалке. Личные статьи и заметки изначально закрыты.

Настраиваемая недорогая модель создаёт пояснения и переводы по запросу. Созданный текст хранится отдельно от оригинала. В GitHub попадают только явно опубликованные материалы с подтверждёнными правами. У приложения отдельный вход через GitHub и длительные сеансы.

![OnlyIdeas reading room](../evidence/library-desktop.png)

## Быстрый старт

До подключения ключей прочитайте руководство по эксплуатации. Храните настройки в защищённом файле вне Git.

```bash
npm ci
npm run check
npm run server
# In another terminal:
npm run dev
```

[BRIEF.md](../BRIEF.md) · [docs/architecture.md](../docs/architecture.md) · [docs/operations.md](../docs/operations.md)

## Устройство

Код приложения, открытые материалы и личные данные хранятся отдельно. MMD сохраняет TeX; разделы формируются по необходимости. Обработчик исключает повторные задания и ограничивает страницы, объём и суточное использование.

## Состояние

Версия 0.2 добавляет предварительные сборки для разработчиков на iOS и Android: безопасный постоянный вход, импорт PDF, системный обмен Markdown и чтение офлайн с формулами и иллюстрациями. Облачный сервис работает. Сборки ещё не опубликованы в TestFlight или магазинах приложений. Перед выпуском нужны удаление аккаунта, более полная модерация и тестирование на физических телефонах.

[docs/native.md](../docs/native.md)

## Поддержка

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## Цитирование

При использовании в исследовании цитируйте этот репозиторий. GitHub использует CITATION.cff для оформления ссылки. [CITATION.cff](../CITATION.cff)

```bibtex
@software{chen_onlyideas_app_2026,
  author = {Chen, Lachlan},
  title = {OnlyIdeasApp: Read deeply, think together},
  year = {2026},
  url = {https://github.com/lachlanchen/OnlyIdeasApp}
}
```
