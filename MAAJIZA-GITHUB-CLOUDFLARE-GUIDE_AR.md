# دليل رفع موقع معجزة على GitHub وربطه بدومين Cloudflare

## الملفات الجاهزة

استخدم آخر حزمة:

`maajiza-web-github-source-web-push.zip`

بعد فك الضغط، ارفع **كل محتويات الحزمة** إلى جذر Repository في GitHub. لا ترفع ملف ZIP نفسه داخل Repository بدلًا من الملفات.

الحزمة لا تحتوي على APK أو مفاتيح توقيع Android أو كلمات مرور.

## شكل الملفات داخل Repository

يجب أن يكون الشكل بهذا المستوى مباشرة:

```text
index.html
app.js
styles.css
web-push.js
web-push-config.js
sw.js
manifest.webmanifest
duas.html
duas.js
duas-page.css
tasbih.html
tasbih.js
tasbih-page.css
quran-reader.html
quran-reader.js
quran-reader.css
robots.txt
sitemap.xml
favicon.svg
favicon.ico
app-icon-192.png
app-icon-512.png
logo-wordmark.png
fonts/
data/
.github/
  workflows/
    deploy-pages.yml
```

مهم: لا تضع الملفات داخل مجلد إضافي مثل:

```text
maajiza-web-github/index.html
```

داخل GitHub يجب أن يكون `index.html` ظاهرًا مباشرة في الصفحة الرئيسية للمستودع.

## الطريقة الأسهل للرفع من المتصفح

1. افتح GitHub وسجّل الدخول.
2. اضغط **New repository**.
3. اكتب اسمًا مثل:

```text
maajiza-website
```

4. اختر `Public` إذا أردت أن يكون الموقع متاحًا من GitHub Pages على الحساب المجاني.
5. اضغط **Create repository**.
6. فك ضغط ملف الموقع على جهازك.
7. داخل المستودع الجديد اضغط **Add file → Upload files**.
8. اسحب **كل محتويات الحزمة** إلى صفحة الرفع، وليس ملف ZIP فقط.
9. اكتب رسالة مثل:

```text
Initial Maajiza website release
```

10. اضغط **Commit changes**.

## تفعيل GitHub Pages

1. افتح المستودع.
2. ادخل إلى:

```text
Settings → Pages
```

3. في قسم **Build and deployment** اختر:

```text
Source: GitHub Actions
```

4. افتح تبويب **Actions** وانتظر انتهاء Workflow اسمه:

```text
Deploy Maajiza website
```

5. بعد نجاحه سيظهر رابط مؤقت مثل:

```text
https://USERNAME.github.io/maajiza-website/
```

ملف النشر الموجود في الحزمة هو:

```text
.github/workflows/deploy-pages.yml
```

لا تحذف هذا الملف.

## ربط الدومين من Cloudflare

أولًا، أحتاج معرفة شكل الدومين الذي لديك:

- دومين رئيسي مثل `example.com`.
- أو نطاق فرعي مثل `something.pages.dev` أو `www.example.com`.

الخطوات التالية تخص دومينًا تملكه وتدير DNS الخاص به في Cloudflare.

### إذا ستستخدم الدومين الرئيسي

في Cloudflare افتح:

```text
Websites → اختر الدومين → DNS → Records
```

أضف سجلات A التالية بالاسم `@`:

```text
Type: A
Name: @
IPv4: 185.199.108.153
Proxy status: DNS only
```

```text
Type: A
Name: @
IPv4: 185.199.109.153
Proxy status: DNS only
```

```text
Type: A
Name: @
IPv4: 185.199.110.153
Proxy status: DNS only
```

```text
Type: A
Name: @
IPv4: 185.199.111.153
Proxy status: DNS only
```

احذف أي سجل A قديم باسم `@` إذا كان يوجه إلى استضافة أخرى.

### إذا ستستخدم www

أضف سجل CNAME:

```text
Type: CNAME
Name: www
Target: USERNAME.github.io
Proxy status: DNS only
```

استبدل `USERNAME` باسم حساب GitHub الحقيقي، وليس اسم المستودع.

لا تجعل الهدف:

```text
USERNAME.github.io/maajiza-website
```

الهدف يجب أن يكون:

```text
USERNAME.github.io
```

## اختيار الدومين داخل GitHub

بعد إضافة DNS:

1. ارجع إلى:

```text
Repository → Settings → Pages
```

2. في **Custom domain** اكتب الدومين النهائي، مثل:

```text
example.com
```

أو:

```text
www.example.com
```

3. اضغط **Save**.
4. انتظر حتى تظهر علامة نجاح بجانب الدومين.
5. فعّل:

```text
Enforce HTTPS
```

قد يحتاج إصدار شهادة HTTPS بعض الوقت بعد ضبط DNS.

## مهم بخصوص Cloudflare Proxy

في البداية اجعل سجلات GitHub Pages على وضع:

```text
DNS only — السحابة الرمادية
```

بعد نجاح ربط الدومين وإصدار شهادة GitHub، يمكن تجربة Proxy إذا احتجت خصائص Cloudflare. إذا ظهرت مشكلة شهادة أو Redirect، أعد السجلات إلى `DNS only`.

## تحديث روابط SEO

النسخة الحالية تحتوي على بعض الروابط القديمة في:

```text
index.html
duas.html
tasbih.html
quran-reader.html
robots.txt
sitemap.xml
```

قبل اعتماد الموقع نهائيًا، يجب تغيير:

```text
https://mo3giza.herodigitalcompany.workers.dev/
```

إلى الدومين الجديد، مثل:

```text
https://example.com/
```

ويتم تعديل:

- `canonical`.
- `og:url`.
- `og:image`.
- `twitter:image`.
- روابط `sitemap.xml`.
- رابط Sitemap داخل `robots.txt`.

لا تستخدم `http://`. استخدم `https://` فقط بعد تفعيل الشهادة.

## Web Push

زرَا Allow وDeny موجودان داخل الإعدادات، لكن الإرسال الحقيقي عندما يكون الموقع مغلقًا يحتاج Backend خارج GitHub Pages.

بعد تشغيل Backend، افتح:

```text
web-push-config.js
```

واكتب:

```js
window.MAAJIZA_WEB_PUSH_CONFIG = {
  publicVapidKey: "PUBLIC_VAPID_KEY",
  subscribeEndpoint: "https://push-api.example.com/api/push/subscribe",
  unsubscribeEndpoint: "https://push-api.example.com/api/push/unsubscribe"
};
```

لا تضع `VAPID_PRIVATE_KEY` داخل الموقع أو GitHub.

التفاصيل والخادم التجريبي موجودان في:

```text
WEB_PUSH_SETUP_AR.md
push-server.example.mjs
```

Web Push يحتاج HTTPS، لذلك لا تختبره على رابط HTTP عادي.

## اختبار الموقع بعد النشر

اختبر هذه الروابط:

```text
https://YOUR-DOMAIN/
https://YOUR-DOMAIN/duas.html
https://YOUR-DOMAIN/tasbih.html
https://YOUR-DOMAIN/quran-reader.html
https://YOUR-DOMAIN/manifest.webmanifest
https://YOUR-DOMAIN/sw.js
```

ثم افتح الإعدادات داخل الموقع وجرب:

1. `Allow — السماح`.
2. وافق من نافذة المتصفح.
3. اضغط `اختبار الإشعار`.
4. جرّب `Deny — رفض`.

## المصادر الرسمية

- [GitHub Pages — Custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [GitHub Pages — HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)

## الحقوق والإصدار

برمجة وهوية بصرية: Hero Digital Company.

الإصدار الحالي داخل المشروع:

```text
v1.0.0
```
