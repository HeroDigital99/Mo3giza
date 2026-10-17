// Capacitor local notifications bridge. Works offline and does not require Google Play Services.
import { LocalNotifications } from '@capacitor/local-notifications';
const KEY = 'ma3jiza-native-notification-ids';
const readIds = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const writeIds = (ids) => localStorage.setItem(KEY, JSON.stringify(ids));
const weekday = (day) => day === 0 ? 1 : day === 1 ? 7 : day - 1; // UI: all=0, Saturday=1 ... Friday=7; Capacitor: Sunday=1 ... Saturday=7
const label = {morning:'أذكار الصباح', evening:'أذكار المساء', 'quranic-dua':'أدعية قرآنية', 'self-dua':'أدعية لنفسي', tasbih:'السبحة الإلكترونية'};
async function ensureChannel() {
  await LocalNotifications.createChannel({id:'maajiza-reminders',name:'تذكيرات معجزة',description:'تذكيرات الأذكار والقرآن والسبحة',importance:5,sound:'default',vibration:true,lights:true,visibility:1});
}
window.MaajizaNativeNotifications = {
  available: true,
  async requestPermission() {
    try { await ensureChannel(); } catch (error) { console.warn("Notification channel unavailable", error); }
    const p = await LocalNotifications.requestPermissions();
    return p.display === 'granted';
  },
  async status() {
    try {
      const p = await LocalNotifications.checkPermissions();
      return p.display === 'granted' ? 'الإشعارات مفعّلة' : 'اضغط تفعيل إشعارات الجهاز لطلب الإذن داخل التطبيق';
    } catch { return 'افتح إعدادات النظام للتحقق من الإشعارات'; }
  },
  async sync(reminders = []) {
    await ensureChannel();
    const oldIds = readIds();
    if (oldIds.length) { try { await LocalNotifications.cancel({notifications:oldIds.map(id=>({id}))}); } catch {} }
    const notifications=[], ids=[];
    for (const r of reminders) {
      if (r.enabled === false || !r.time) continue;
      const [hour,minute] = String(r.time).split(':').map(Number);
      if (!Number.isInteger(hour) || !Number.isInteger(minute)) continue;
      const days = r.days?.includes(0) ? [1,2,3,4,5,6,7] : (r.days || []).map(weekday);
      for (const day of days) {
        const id = Math.abs(`${r.id}-${day}`.split('').reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0)) % 2147483000 || day;
        ids.push(id);
        notifications.push({id,title:'معجزة | تذكير لطيف',body:`حان وقت ${label[r.type] || 'وردك'}`,channelId:'maajiza-reminders',smallIcon:'ic_stat_maajiza',schedule:{on:{weekday:day,hour,minute},allowWhileIdle:false},extra:{reminderId:r.id}});
      }
    }
    if (notifications.length) await LocalNotifications.schedule({notifications});
    writeIds(ids);
    return ids.length;
  },
  async test() {
    try { await ensureChannel(); } catch (error) { console.warn("Notification channel unavailable", error); }
    const id = 990001;
    try { await LocalNotifications.cancel({notifications:[{id}]}); } catch {}
    await LocalNotifications.schedule({notifications:[{id,title:'معجزة | اختبار الإشعارات',body:'الإشعارات تعمل بنجاح — حان وقت وردك',channelId:'maajiza-reminders',smallIcon:'ic_stat_maajiza',schedule:{at:new Date(Date.now()+5000)}}]});
    return true;
  }
};
