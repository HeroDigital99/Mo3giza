/* Maajiza Web Push client.
 * Configure the public VAPID key and subscription endpoint in web-push-config.js.
 * The public key is safe for the browser; never put the VAPID private key here.
 */
(function () {
  const CONFIG = window.MAAJIZA_WEB_PUSH_CONFIG || {};
  const STORAGE_KEY = "ma3jiza-web-push-opt-out";
  const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;

  function isOptedOut() { return localStorage.getItem(STORAGE_KEY) === "true"; }
  function setOptedOut(value) { localStorage.setItem(STORAGE_KEY, value ? "true" : "false"); }
  function base64ToBytes(value) {
    const padding = "=".repeat((4 - value.length % 4) % 4);
    const normalized = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(normalized);
    return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
  }
  async function registration() {
    return navigator.serviceWorker.ready;
  }
  async function currentSubscription() {
    if (!supported) return null;
    const reg = await registration();
    return reg.pushManager.getSubscription();
  }
  async function sendSubscription(subscription) {
    if (!CONFIG.subscribeEndpoint) return { configured: false };
    const response = await fetch(CONFIG.subscribeEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription)
    });
    if (!response.ok) throw new Error("تعذر حفظ اشتراك الإشعارات");
    return { configured: true };
  }
  async function allow() {
    if (!("Notification" in window)) throw new Error("هذا المتصفح لا يدعم الإشعارات");
    setOptedOut(false);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { permission, subscribed: false };
    if (!supported) return { permission, subscribed: false };
    const reg = await registration();
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription && CONFIG.publicVapidKey) {
      subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(CONFIG.publicVapidKey) });
      await sendSubscription(subscription);
    }
    return { permission, subscribed: !!subscription, backendConfigured: !!CONFIG.subscribeEndpoint };
  }
  async function deny() {
    setOptedOut(true);
    const subscription = await currentSubscription();
    if (subscription) {
      if (CONFIG.unsubscribeEndpoint) {
        try { await fetch(CONFIG.unsubscribeEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription) }); } catch (error) { console.warn("Push unsubscribe endpoint unavailable", error); }
      }
      await subscription.unsubscribe();
    }
    return { permission: "denied", subscribed: false };
  }
  async function test() {
    const title = "معجزة | اختبار الإشعارات";
    const options = { body: "الإشعارات تعمل على هذا الموقع بنجاح.", icon: "app-icon-192.png", badge: "favicon-32.png", tag: "ma3jiza-web-test", dir: "rtl", lang: "ar" };
    if (Notification.permission !== "granted") throw new Error("اسمح بالإشعارات أولًا");
    const reg = await registration();
    if (reg.showNotification) return reg.showNotification(title, options);
    return new Notification(title, options);
  }
  async function status() {
    if (!("Notification" in window)) return { label: "المتصفح لا يدعم الإشعارات", permission: "unsupported", subscribed: false };
    let subscription = null;
    try { subscription = await currentSubscription(); } catch {}
    const permission = Notification.permission;
    if (isOptedOut() || permission === "denied") return { label: "الإشعارات مرفوضة — يمكن تغييرها من إعدادات المتصفح", permission, subscribed: false };
    if (permission === "granted" && subscription) return { label: "الإشعارات مفعّلة ومشتركة", permission, subscribed: true };
    if (permission === "granted") return { label: "الإذن مسموح — الاشتراك يحتاج إعداد خادم Push", permission, subscribed: false };
    return { label: "الإشعارات غير مفعّلة", permission, subscribed: false };
  }
  window.MaajizaWebPush = { supported, allow, deny, test, status, currentSubscription };
})();
