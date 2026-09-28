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

Нативная версия 1.0.0 (10) добавляет яркий бирюзово-сине-фиолетовый интерфейс, системную, светлую и тёмную темы и 11 языков с выбором языка устройства по умолчанию. Агент принимает приватные PDF, Word, изображения и текст. Можно обсуждать абзац кнопкой или по-прежнему выделять фрагмент. Одновременные запросы перевода используют одну задачу и результат для одной версии статьи, сохраняя формулы и рисунки. Одобренная иконка и локальный кэш сохранены. Результаты тестов и статус магазинов приведены в примечаниях к выпуску.

В общей библиотеке теперь две настоящие статьи: OpenAlex (CC0-1.0) и Measuring holographic entanglement entropy on a quantum simulator (CC-BY-4.0), а также явно обозначенный авторский пример. Сохранены четыре исходных рисунка. Обе статьи прошли реальную конвертацию и проверены без входа в аккаунт в читалке шириной с экран телефона.

В разработке: кредиты для чтения в базе данных с атомарным резервированием, возвратами и защитой от повторных наград за одобренные общедоступные статьи. В профиле показаны баланс и история; настройки доступа перенесены над чатом, а личный импорт требует подтверждения стоимости. Новые элементы поддерживают все 11 языков. Списание кредитов и покупка ежемесячных подписок ещё не включены в рабочем сервисе.

Подготовлен следующий этап: нативные месячные планы с ценами магазина, восстановлением покупок и проверкой продлений и возвратов. «Читатель», «Исследователь» и «Студия» включают 200/1 200/2 600 кредитов в месяц и 40/80/160 сообщений агенту в день. Покупки отключены до завершения проверок магазинов и устройств.

Версия 1.0.2 (13) добавляет нативное приложение Mac (macOS 13+, Intel и Apple Silicon) с боковой панелью и клавиатурными сокращениями, а также приложение для Apple Watch (watchOS 11+). Отправьте отрывок общедоступной статьи через меню чтения на iPhone: три последних доступны на часах без сети, с настройкой размера текста. Полные формулы и рисунки остаются на iPhone и Mac. Личные статьи, чаты и данные входа не передаются на Watch. Статус проверки указан в записи релиза. Подписки пока активны только для тестов оператора.

[macOS · Apple Watch](../docs/apple-platforms.md) · [1.0.2 (15)](../docs/release-candidate-15.md)

[Reading credits](../docs/reading-credits.md)

[1.0.0 (10)](../docs/release-candidate-10.md) · [0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

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
