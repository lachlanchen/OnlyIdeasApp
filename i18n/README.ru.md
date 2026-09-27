[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*Читайте вдумчиво. Размышляйте вместе.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## Обзор

OnlyIdeas — общее пространство для чтения научных статей. Импортируйте PDF или ссылку на PDF в открытом доступе, сохраняйте формулы и рисунки с Mathpix и обсуждайте фрагменты прямо в читалке. Новые импорты по умолчанию предназначены для общего доступа; можно выбрать «Только я». Перед публикацией проверяются права и правила сообщества. Заметки и разговоры с агентом остаются личными.

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

Нативная версия 1.0.0 (9) лучше использует экран: компактные элементы управления, аннотации на всю ширину, размер текста 18 по умолчанию и отсутствие бокового смещения страницы. Статьи и рисунки сохраняются автоматически, сначала открываются с устройства, затем обновляются из облака. Можно закрепить копию для чтения без сети. Значок O/i получил аккуратный бирюзово-сине-фиолетовый градиент и золотую точку. Для публичной проверки Apple ещё нужны итоговые скриншоты и проверка реального входа через Apple.

В общей библиотеке теперь две настоящие статьи: OpenAlex (CC0-1.0) и Measuring holographic entanglement entropy on a quantum simulator (CC-BY-4.0), а также явно обозначенный авторский пример. Сохранены четыре исходных рисунка. Обе статьи прошли реальную конвертацию и проверены без входа в аккаунт в читалке шириной с экран телефона.

[1.0.0 (9)](../docs/release-candidate-9.md) · [0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

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
