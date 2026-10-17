# معجزة — نسخة الموقع الإلكتروني

هذه حزمة الموقع الإلكتروني المستخرجة من آخر نسخة من تطبيق معجزة. تشمل الصفحة الرئيسية، الأذكار، الأدعية، السبحة، وقارئ القرآن، مع PWA وService Worker والخطوط العربية المحلية.

## تشغيل محلي سريع

```bash
python3 -m http.server 8080
```

ثم افتح:

```text
http://localhost:8080/
```

## النشر

الحزمة مجهزة لـ GitHub Pages من خلال:

```text
.github/workflows/deploy-pages.yml
```

التفاصيل العربية موجودة في:

```text
GITHUB_AND_DOMAIN_SETUP_AR.md
```

## مهم

هذه الحزمة لا تحتوي على مجلد Android أو مفاتيح توقيع APK أو ملفات `node_modules`.

الحقوق: Hero Digital Company.
الإصدار: v1.0.0.
