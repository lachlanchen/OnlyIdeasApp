[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*اقرأ بعمق. وفكّر مع الآخرين.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## نظرة عامة

OnlyIdeas مساحة مشتركة لقراءة الأبحاث. استورد ملف PDF أو رابط PDF مفتوح الوصول، واحتفظ بالمعادلات والأشكال باستخدام Mathpix وناقش المقاطع داخل القارئ. تبدأ الاستيرادات الجديدة بخيار المشاركة، مع إمكانية اختيار «أنا فقط». يتطلب النشر مراجعة إذن المصدر وقواعد المجتمع؛ وتبقى الملاحظات ومحادثات الوكيل خاصة.

ينشئ نموذج اقتصادي قابل للضبط أدلة قراءة وترجمات عند الطلب. يبقى النص المولّد منفصلًا عن الأصل. يخزّن GitHub فقط الأوراق المنشورة صراحةً بعد التأكد من الحقوق. للتطبيق تسجيل دخول مستقل عبر GitHub وجلسات مستمرة.

![OnlyIdeas reading room](../evidence/library-desktop.png)

## البدء السريع

اقرأ دليل التشغيل قبل ربط بيانات اعتماد الخدمات. احفظ الإعدادات في ملف محمي خارج Git.

```bash
npm ci
npm run check
npm run server
# In another terminal:
npm run dev
```

[BRIEF.md](../BRIEF.md) · [docs/architecture.md](../docs/architecture.md) · [docs/operations.md](../docs/operations.md)

## التصميم

تُحفظ شيفرة التطبيق والمحتويات العامة وبيانات الحسابات الخاصة بصورة منفصلة. تحافظ MMD على TeX، وتُشتق بيانات الأقسام عند الحاجة. يمنع العامل تكرار المهام ويفرض حدودًا للصفحات والحجم والاستخدام اليومي.

## الحالة

يضيف الإصدار الأصلي 1.0.0 (10) واجهة زاهية بالأخضر المزرق والأزرق والبنفسجي، ومظاهر النظام والفاتح والداكن، و11 لغة تتبع لغة الجهاز افتراضياً. يقبل المساعد مرفقات PDF وWord والصور والنصوص بشكل خاص. يمكنك التعليق على فقرة أو متابعة تحديد النص للتعليق. تعيد طلبات الترجمة المتزامنة استخدام المهمة والنتيجة لنفس نسخة الورقة، مع الحفاظ على المعادلات والأشكال. تبقى الأيقونة المعتمدة وذاكرة الأوراق المحلية. راجع ملاحظات الإصدار للاختبارات وحالة المتاجر.

تضم غرفة القراءة العامة بحثين حقيقيين: OpenAlex بترخيص CC0-1.0 وMeasuring holographic entanglement entropy on a quantum simulator بترخيص CC-BY-4.0، إضافة إلى المثال الأصلي المعرّف بوضوح. احتُفظ بأربعة أشكال أصلية. مرّ البحثان بمسار التحويل الفعلي، واختُبرا دون تسجيل الدخول في قارئ بعرض شاشة الهاتف.

قيد التطوير: رصيد قراءة في قاعدة البيانات مع حجز ذري واسترداد ومكافآت تمنع تكرار منح الرصيد للأوراق العامة المعتمدة. يعرض الملف الشخصي الرصيد والسجل، وتنتقل خيارات المشاركة إلى أعلى المحادثة مع تأكيد التكلفة قبل الاستيراد الخاص. تدعم الأدوات الجديدة اللغات الإحدى عشرة. لم يُفعّل خصم الرصيد أو شراء الاشتراكات الشهرية في الخدمة الفعلية بعد.

المرحلة التالية مُعدّة: خطط شهرية أصلية بأسعار المتجر، واستعادة المشتريات، والتحقق من التجديدات والاستردادات. تشمل خطط القارئ والباحث والاستوديو 200/1,200/2,600 رصيد شهريًا و40/80/160 رسالة للوكيل يوميًا. تبقى المشتريات معطّلة حتى اكتمال اختبارات المتاجر والأجهزة.

يضيف الإصدار 1.0.2 (13) تطبيق Mac أصليًا (macOS 13 أو أحدث، Intel وApple Silicon) مع شريط جانبي واختصارات لوحة المفاتيح، وتطبيقًا مرافقًا لـ Apple Watch (watchOS 11 أو أحدث). أرسل مقتطفًا من ورقة عامة باختيار صريح من خيارات القراءة على iPhone؛ تبقى آخر ثلاثة مقتطفات متاحة دون اتصال مع حجم نص قابل للتعديل. تبقى المعادلات والرسوم الكاملة على iPhone وMac، ولا تُنقل الأوراق الخاصة أو المحادثات أو بيانات الدخول إلى الساعة. راجع سجل الإصدار لحالة المراجعة. يظل تفعيل الاشتراكات محدودًا باختبارات المشغّل.

[macOS · Apple Watch](../docs/apple-platforms.md) · [1.0.2 (13)](../docs/release-candidate-13.md)

[Reading credits](../docs/reading-credits.md)

[1.0.0 (10)](../docs/release-candidate-10.md) · [0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

## الدعم

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## الاستشهاد

يرجى الاستشهاد بهذا المستودع عند استخدامه في البحث. يقرأ GitHub ملف CITATION.cff لتوفير بيانات الاستشهاد. [CITATION.cff](../CITATION.cff)

```bibtex
@software{chen_onlyideas_app_2026,
  author = {Chen, Lachlan},
  title = {OnlyIdeasApp: Read deeply, think together},
  year = {2026},
  url = {https://github.com/lachlanchen/OnlyIdeasApp}
}
```
