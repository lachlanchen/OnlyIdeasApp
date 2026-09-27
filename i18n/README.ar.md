[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

# OnlyIdeasApp

*اقرأ بعمق. وفكّر مع الآخرين.*

[OnlyIdeas](https://agent.onlyideas.art) · [GitHub Sponsors](https://github.com/sponsors/lachlanchen) · [OnlyIdeas-papers](https://github.com/lachlanchen/OnlyIdeas-papers)

## نظرة عامة

OnlyIdeas مساحة هادئة لقراءة الأوراق البحثية. استورد ملف PDF الخاص بك أو رابط PDF متاحًا للجميع، واحتفظ بالمعادلات والأشكال عبر Mathpix، وناقش المقاطع داخل القارئ. تبدأ الأوراق الشخصية والملاحظات بوضع خاص.

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

الخدمة السحابية متاحة. الإصدار 1.0.0 (7) لنظام iOS متاح في مجموعة TestFlight الحالية بأيقونة واضحة باللونين الزمردي والذهبي. يبقى اختبار Google Play الداخلي على البناء 6. أُرسل طلب المراجعة للإصدار العام على Google، وقد تسبقه فحوص آلية. لا يزال إرسال Apple العام يحتاج إلى صور iOS النهائية والتحقق الفعلي من تسجيل الدخول باستخدام Apple. اختُبرت الأشكال والجداول والمعادلات في أبحاث مستوردة على شاشة بحجم الهاتف.

يقدم الإصدار 0.3 شاشات SwiftUI على iOS وعناصر تحكم أصلية على Android، ونص قراءة أكبر قابلًا للتعديل، وصفحة ملف شخصي مستقلة، ومحادثات محفوظة مع الوكيل. يبحث وكيل على محطة العمل في فهارس الأبحاث المفتوحة وينزّل ملفات PDF باستخدام نموذج محلي عبر LazyEdge. اختر التحويل والإضافة لإنشاء نسخة قراءة خاصة بواسطة Mathpix مع المعادلات والأشكال. راجع سجل التحديث الأصلي لمعرفة حالة البناء والاختبار.

[0.3](../docs/native-0.3.md) · [docs/native.md](../docs/native.md)

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
