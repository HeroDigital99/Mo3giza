# تفعيل Web Push لموقع معجزة

تمت إضافة واجهة كاملة داخل الإعدادات:

- `Allow — السماح`: يطلب إذن الإشعارات من المتصفح.
- `Deny — رفض`: يلغي اشتراك Push الحالي ويحفظ اختيار المستخدم.
- `اختبار الإشعار`: يعرض إشعارًا تجريبيًا بعد السماح.
- حالة مباشرة للاشتراك والإذن.

## ما يعمل الآن بدون خادم

عند رفع الموقع على HTTPS، سيظهر طلب الإذن الحقيقي من المتصفح. بعد الضغط على Allow يمكن للموقع عرض إشعار اختباري، كما أن Service Worker أصبح يستقبل رسائل Push ويفتح الصفحة عند الضغط عليها.

زر Deny لا يستطيع JavaScript أن يغيّر قرار المتصفح العام إلى `denied`؛ هذه صلاحية محمية من المتصفح. لكنه يلغي اشتراك Push ويحفظ الرفض داخل الموقع. إذا كان المتصفح قد سجّل الرفض سابقًا، يجب تغييره من إعدادات الموقع في المتصفح.

## ما يلزم للإرسال والموقع مغلق

GitHub Pages يستضيف ملفات الواجهة فقط، ولا يشغّل خادم إرسال. للإشعارات الحقيقية عند إغلاق الموقع يلزم:

1. إنشاء مفاتيح VAPID:

```bash
npx web-push generate-vapid-keys
```

2. وضع المفتاح العام فقط في `web-push-config.js`:

```js
window.MAAJIZA_WEB_PUSH_CONFIG = {
  publicVapidKey: "PUBLIC_KEY_HERE",
  subscribeEndpoint: "https://push-api.example.com/api/push/subscribe",
  unsubscribeEndpoint: "https://push-api.example.com/api/push/unsubscribe"
};
```

3. حفظ المفتاح الخاص على الخادم فقط، وعدم رفعه إلى GitHub.
4. تشغيل `push-server.example.mjs` على خدمة Backend مثل Render أو Railway أو Cloud Run أو Cloudflare Worker.
5. ضبط متغيرات الخادم:

```text
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@example.com
ADMIN_KEY=ضع_مفتاحًا_سريًا_للإرسال
ALLOWED_ORIGIN=https://الدومين-النهائي.com
```

6. لإرسال تذكير تجريبي من الخادم:

```bash
curl -X POST https://push-api.example.com/api/push/send \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Key: ADMIN_KEY' \
  -d '{"title":"معجزة | تذكير لطيف","body":"حان وقت وردك اليوم","url":"/"}'
```

## ملاحظات مهمة

- Web Push يحتاج HTTPS، ويعمل على `localhost` للاختبار المحلي.
- لا تستخدم مفتاح VAPID الخاص في ملفات الموقع.
- المثال المرفق يخزّن الاشتراكات في الذاكرة فقط؛ للإنتاج استخدم قاعدة بيانات.
- قبل نشر الموقع على الدومين النهائي، حدّث `ALLOWED_ORIGIN` وملف `web-push-config.js`.
