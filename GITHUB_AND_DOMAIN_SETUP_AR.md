# نشر موقع معجزة على GitHub وربطه بالدومين

هذه نسخة Web ثابتة جاهزة للنشر. لا تحتاج إلى Node.js أو قاعدة بيانات لكي تعمل.

## 1) إنشاء المستودع

1. أنشئ Repository جديدًا على GitHub، ويفضل أن يكون اسمه مثل `maajiza-website`.
2. ارفع محتويات هذا المجلد إلى جذر المستودع، وليس المجلد الأب.
3. استخدم الفرع `main`.

## 2) تفعيل النشر

من GitHub افتح:

`Settings → Pages → Build and deployment → Source: GitHub Actions`

بعد أول Push سيعمل ملف:

`.github/workflows/deploy-pages.yml`

ثم سيظهر رابط GitHub Pages في صفحة Actions أو Pages.

## 3) ربط الدومين

بعد معرفة الدومين النهائي:

- أضف ملفًا باسم `CNAME` في جذر المشروع.
- اكتب داخله الدومين فقط، مثل:

```text
example.com
```

- لا تكتب `https://` ولا تضف مسارًا أو `/`.

في DNS:

- للدومين الرئيسي `example.com`: أضف سجلات A إلى عناوين GitHub Pages الرسمية.
- للنطاق الفرعي مثل `www.example.com`: أضف CNAME إلى اسم GitHub Pages الذي سيظهر لك في إعدادات المستودع.

بعدها فعّل خيار `Enforce HTTPS` من GitHub Pages.

## 4) تحديث بيانات SEO

الملفات الحالية تحتوي على رابط الموقع السابق في canonical وOpen Graph وsitemap وrobots. بعد إرسال الدومين النهائي، استبدل:

```text
https://mo3giza.herodigitalcompany.workers.dev/
```

بالرابط النهائي في:

- ملفات HTML.
- `robots.txt`.
- `sitemap.xml`.
- `README.md` وملفات التوثيق عند الحاجة.

## ملاحظة الإشعارات

إشعارات Android الأصلية الموجودة في APK لا تعمل بنفس واجهة Capacitor داخل المتصفح. الموقع يعمل كموقع وPWA، أما إشعارات الويب الحقيقية فتحتاج Web Push مع Service Worker واشتراك المستخدم، ويمكن إضافتها لاحقًا باستخدام مزود Push أو Backend.

## الحقوق

برمجة وهوية بصرية: Hero Digital Company.
الإصدار الحالي: v1.0.0.
