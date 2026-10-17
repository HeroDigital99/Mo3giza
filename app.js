const DATA_URL = "data/adhkar.json";
let adhkar = [];
let activeFilter = "all";
let currentView = "dashboard";
let searchTerm = "";
const counts = load("ma3jiza-counts", {});
const dailyCounts = load("ma3jiza-daily-counts", {});
const tasbihCounts = load("ma3jiza-tasbih-counts", {});
if (!Object.keys(tasbihCounts).length) { const legacyCount = Number(load("ma3jiza-tasbih-count", 0)) || 0; if (legacyCount) tasbihCounts["سُبْحَانَ اللَّهِ"] = legacyCount; }
let selectedTasbih = load("ma3jiza-selected-tasbih", "سُبْحَانَ اللَّهِ");
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function load(key, fallback) {
  try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); }
  catch { return fallback; }
}
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
}
function normalizeArabic(value) {
  return String(value || "").normalize("NFKD").replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "").replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/ة/g, "ه").replace(/ـ/g, "").toLowerCase().trim();
}
function safeExternalUrl(value) {
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : ""; }
  catch { return ""; }
}
function applyFontScale(value) {
  const scale = Math.max(75, Math.min(200, Number(value) || 100)) / 100;
  document.documentElement.style.setProperty("--font-scale", scale);
  document.documentElement.dataset.fontScale = String(Math.round(scale * 100));
  document.body.classList.toggle("font-scale-only", scale !== 1);
  document.body.classList.remove("large-font", "compact-font");
  const selector = "h1,h2,h3,h4,h5,h6,p,small,label,legend,button,input,select,textarea,a,li,dt,dd,time,strong,b,.card-title,.dhikr-text,.timing-pill,.virtue-preview,.session-text,.settings-hint,.settings-intro,.rights-note";
  const excluded = ".brand-mark,.brand-wordmark,.icon-btn,.stat-icon,.dashboard-quick>span,.focus-art,.spark,.note-icon,.live-dot,.eyebrow-dot,.tap-plus,.splash-orbit,.splash-star,.splash-dot";
  document.querySelectorAll(selector).forEach(el => {
    if (el.closest(excluded)) return;
    const computed = getComputedStyle(el);
    if (!el.dataset.baseFontSize) {
      el.dataset.baseFontSize = String(parseFloat(computed.fontSize) / scale);
      const lh = parseFloat(computed.lineHeight);
      if (Number.isFinite(lh)) el.dataset.baseLineHeight = String(lh / scale);
    }
    el.style.fontSize = `${parseFloat(el.dataset.baseFontSize) * scale}px`;
    if (el.dataset.baseLineHeight) el.style.lineHeight = `${parseFloat(el.dataset.baseLineHeight) * scale}px`;
  });
  ["globalFontSizeValue", "sizeValue"].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = `${Math.round(scale * 100)}%`; });
}

function todayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function recordActivity(amount = 1, type = "dhikr", category = "daily") {
  const activity = load("ma3jiza-activity", {}); const key = todayKey();
  const old = typeof activity[key] === "number" ? {total:activity[key], dhikr:activity[key], tasbih:0, categories:{}} : (activity[key] || {});
  const requested = Number(amount) || 0; if (!requested) return;
  const available = Math.min(Number(old.total) || 0, Number(old[type]) || 0);
  const delta = requested < 0 ? -Math.min(Math.abs(requested), available) : requested;
  if (!delta) return;
  old.total = Math.max(0, (Number(old.total) || 0) + delta);
  old[type] = Math.max(0, (Number(old[type]) || 0) + delta);
  old.categories = old.categories || {};
  if (delta > 0 || Number(old.categories[category]) > 0) old.categories[category] = Math.max(0, (Number(old.categories[category]) || 0) + delta);
  Object.keys(old.categories).forEach(name => { if (!old.categories[name]) delete old.categories[name]; });
  if (old.total) activity[key] = old; else delete activity[key];
  save("ma3jiza-activity", activity);
}
function activityTotal(value) { return typeof value === "number" ? value : Number(value?.total) || 0; }
function updateDayDetail(key = todayKey()) {
  const activity = load("ma3jiza-activity", {}); const entry = activity[key];
  const data = typeof entry === "number" ? {total:entry,dhikr:entry,tasbih:0,categories:{}} : (entry || {total:0,dhikr:0,tasbih:0,categories:{}});
  const date = new Date(`${key}T12:00:00`); const label = new Intl.DateTimeFormat("ar-EG", {weekday:"long",day:"numeric",month:"long"}).format(date);
  if ($("#selectedDayLabel")) $("#selectedDayLabel").textContent = `إحصائيات ${label}`;
  if ($("#selectedDayHint")) $("#selectedDayHint").textContent = entry ? "نشاط مسجل" : "لا يوجد نشاط مسجل";
  if ($("#dayTotal")) $("#dayTotal").textContent = (Number(data.total)||0).toLocaleString("ar-EG");
  if ($("#dayDhikr")) $("#dayDhikr").textContent = (Number(data.dhikr)||0).toLocaleString("ar-EG");
  if ($("#dayTasbih")) $("#dayTasbih").textContent = (Number(data.tasbih)||0).toLocaleString("ar-EG");
  const names = {morning:"الصباح",evening:"المساء","quranic-dua":"قرآني","self-dua":"لنفسك",tasbih:"السبحة",daily:"عام"};
  const parts = Object.entries(data.categories || {}).filter(([,v]) => Number(v)>0).map(([k,v]) => `${names[k]||k}: ${Number(v).toLocaleString("ar-EG")}`).join(" — ");
  if ($("#dayCategories")) $("#dayCategories").textContent = parts || "لا يوجد نشاط مسجل لهذا اليوم.";
}
function renderHistory() {
  const box=$("#historyDays"); if(!box) return; const activity=load("ma3jiza-activity",{}); const keys=Object.keys(activity).sort().reverse();
  box.innerHTML=keys.length ? `<div class="history-title">سجل الأيام المسجل</div>`+keys.map(key=>{const data=typeof activity[key]==="number"?{total:activity[key]}:activity[key]; const label=new Intl.DateTimeFormat("ar-EG",{weekday:"short",day:"numeric",month:"short"}).format(new Date(`${key}T12:00:00`)); return `<button type="button" class="history-day" data-history-date="${key}"><span>${label}</span><b>${Number(data.total||0).toLocaleString("ar-EG")}</b><small>تكرار</small></button>`;}).join("") : '<p class="reminders-empty">لا يوجد سجل أيام بعد.</p>';
}

function updateAnalytics() {
  const activity = load("ma3jiza-activity", {}); const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - i); days.push({key:todayKey(d), label:new Intl.DateTimeFormat("ar-EG", {weekday:"short"}).format(d)}); }
  const values = days.map(d => activityTotal(activity[d.key])); const max = Math.max(...values, 1); const total = values.reduce((a,b) => a+b, 0);
  if ($("#weeklyTotal")) $("#weeklyTotal").textContent = total.toLocaleString("ar-EG");
  if ($("#weeklyBars")) $("#weeklyBars").innerHTML = days.map((d,i) => `<div class="week-bar-wrap" title="${d.label}: ${values[i]}"><span class="week-bar" style="height:${Math.max(8, values[i] / max * 100)}%"></span><small>${d.label}</small></div>`).join("");
  let streak = 0; for (let i = 0; i < 365; i++) { const d = new Date(); d.setDate(d.getDate()-i); if (activityTotal(activity[todayKey(d)]) > 0) streak++; else break; }
  if ($("#streakDays")) $("#streakDays").textContent = streak.toLocaleString("ar-EG");
  if ($("#streakMessage")) $("#streakMessage").textContent = streak ? "استمر بهدوء، كل يوم له أثر" : "ابدأ اليوم لصناعة عادتك الهادئة";
  const categories = [
    {key:"morning",label:"الصباح",matches:x=>x.category==="morning"||x.category==="morning-evening"||(x.topics||[]).includes("morning")},
    {key:"evening",label:"المساء",matches:x=>x.category==="evening"||x.category==="morning-evening"||(x.topics||[]).includes("evening")},
    {key:"quranic-dua",label:"قرآني",matches:x=>x.category==="quranic-dua"},
    {key:"self-dua",label:"لنفسك",matches:x=>x.category==="self-dua"||(x.topics||[]).includes("self-dua")}
  ];
  if ($("#categoryBars")) $("#categoryBars").innerHTML = categories.map(cat => { const items=adhkar.filter(cat.matches), done=items.filter(x=>{const today=getDailyCount(x);return today>0&&(!x.count||today>=x.count);}).length, pct=items.length?Math.round(done/items.length*100):0; return `<div class="category-row"><span>${cat.label}</span><div><i style="width:${pct}%"></i></div><b>${pct}%</b></div>`; }).join("");
  updateDayDetail($("#statsDate")?.value || todayKey());
}
const reminderNames = {morning:"أذكار الصباح",evening:"أذكار المساء","quranic-dua":"أدعية قرآنية","self-dua":"أدعية لنفسي",tasbih:"السبحة الإلكترونية"};
let reminderTimer;
function getReminders() { return load("ma3jiza-reminders", []); }
function saveReminders(list) { save("ma3jiza-reminders", list); }
async function syncNativeReminders(list = getReminders()) { if (window.MaajizaNativeNotifications?.sync) { try { return await window.MaajizaNativeNotifications.sync(list); } catch (error) { console.warn("Native reminders unavailable", error); showToast("تعذر جدولة التنبيه — اسمح بالإشعارات من إعدادات الهاتف"); return 0; } } return 0; }
function renderReminders() {
  const box=$("#remindersList"); if (!box) return; const list=getReminders();
  box.innerHTML=list.length ? list.map(r => `<article class="reminder-item ${r.enabled===false?"disabled":""}"><div><strong>${escapeHtml(reminderNames[r.type]||r.type)}</strong><span>${escapeHtml(r.time)} — ${r.days?.includes(0)?"كل يوم":"أيام محددة"}</span></div><div class="reminder-item-actions"><button class="small-action" data-reminder-toggle="${r.id}">${r.enabled===false?"تشغيل":"إيقاف"}</button><button class="small-action danger-action" data-reminder-delete="${r.id}">حذف</button></div></article>`).join("") : '<p class="reminders-empty">لا توجد تذكيرات بعد. أضف أول موعد لوردك.</p>';
}
let notificationControlsBound = false;
function bindNotificationControls() {
  if (notificationControlsBound) return;
  notificationControlsBound = true;
  $("#notificationPermissionSettings")?.addEventListener("click", requestNotifications);
  $("#webPushAllow")?.addEventListener("click", requestNotifications);
  $("#webPushDeny")?.addEventListener("click", denyWebPush);
  $("#notificationTest")?.addEventListener("click", async () => {
    const button = $("#notificationTest");
    if (button) { button.disabled = true; button.textContent = "جارٍ التجهيز..."; }
    try {
      if (window.MaajizaWebPush) {
        const state = await window.MaajizaWebPush.status();
        if (state.permission !== "granted") { showToast("اضغط Allow أولًا للسماح بالإشعارات"); return; }
        await window.MaajizaWebPush.test();
        showToast("تم إرسال اختبار إشعار الموقع");
      } else {
        const granted = await window.MaajizaNativeNotifications?.requestPermission?.();
        if (!granted) { showToast("لم يظهر الإذن أو لم تتم الموافقة عليه بعد"); return; }
        await window.MaajizaNativeNotifications.test();
        showToast("سيظهر اختبار الإشعار بعد 5 ثوانٍ");
      }
      updateNotificationStatus();
    } catch (error) { console.warn("Notification test failed", error); showToast("تعذر اختبار الإشعار على هذا الجهاز"); }
    finally { if (button) { button.disabled = false; button.textContent = "اختبار بعد 5 ثوانٍ"; } }
  });
}

async function requestNotifications() {
  let granted = false;
  try {
    if (window.MaajizaWebPush) {
      const result = await window.MaajizaWebPush.allow();
      granted = result.permission === "granted";
      if (granted) showToast(result.subscribed ? "تم تفعيل Web Push والاشتراك بنجاح" : "تم السماح بالإشعارات — الاشتراك الكامل يحتاج خادم Push");
    } else if (window.MaajizaNativeNotifications?.requestPermission) granted = await window.MaajizaNativeNotifications.requestPermission();
    else if ("Notification" in window) granted = (await Notification.requestPermission()) === "granted";
  } catch (error) { console.warn("Notification permission failed", error); showToast("تعذر تفعيل إشعارات الموقع"); }
  if (granted) await syncNativeReminders();
  else if (!window.MaajizaWebPush) showToast("لم يتم السماح بالإشعارات");
  updateNotificationStatus();
}
async function updateNotificationStatus() {
  const status = $("#notificationStatus"); if (!status) return;
  try {
    if (window.MaajizaWebPush) { const result = await window.MaajizaWebPush.status(); status.textContent = result.label; return; }
    if (window.MaajizaNativeNotifications?.status) { status.textContent = await window.MaajizaNativeNotifications.status(); return; }
    status.textContent = "Notification" in window ? (Notification.permission === "granted" ? "الإشعارات مفعّلة" : "الإشعارات غير مفعّلة") : "الإشعارات غير متاحة";
  } catch { status.textContent = "افتح إعدادات المتصفح للتحقق من الإشعارات"; }
}
async function denyWebPush() {
  try {
    if (window.MaajizaWebPush) await window.MaajizaWebPush.deny();
    showToast("تم رفض إشعارات الموقع");
  } catch (error) { console.warn("Web Push deny failed", error); showToast("تعذر إلغاء اشتراك الإشعارات"); }
  updateNotificationStatus();
}
function reminderDayMatches(reminder, date) { if (!reminder.days?.length || reminder.days.includes(0)) return true; const sundayBased=date.getDay(); const mapped=sundayBased===0?2:sundayBased===6?1:sundayBased+2; return reminder.days.includes(mapped); }
function checkReminders() {
  const now=new Date(), hhmm=now.toTimeString().slice(0,5), dayKey=todayKey(); let list=getReminders(), changed=false;
  list.forEach(r=>{ if(r.enabled===false || r.time!==hhmm || !reminderDayMatches(r,now)) return; const firedKey=`${dayKey}-${hhmm}`; if(r.lastFired===firedKey) return; r.lastFired=firedKey; changed=true; const message=`حان وقت ${reminderNames[r.type]||"وردك"}`; showToast(message); if("Notification" in window && Notification.permission==="granted") new Notification("معجزة | تذكير لطيف", {body:message, icon:"app-icon-192.png", tag:`ma3jiza-${r.id}`}); });
  if(changed) saveReminders(list);
}
function setupReminders() {
  renderReminders(); syncNativeReminders(); clearInterval(reminderTimer); reminderTimer=setInterval(checkReminders,30000); checkReminders();
  $("#notificationPermission")?.addEventListener("click", requestNotifications);
  bindNotificationControls();
  updateNotificationStatus();
  $$('input[name="reminderDay"]').forEach(input => input.addEventListener("change", () => {
    const everyDay = $('input[name="reminderDay"][value="0"]');
    const weekdays = $$('input[name="reminderDay"]').filter(day => day.value !== "0");
    if (input.value === "0" && input.checked) weekdays.forEach(day => { day.checked = false; });
    else if (input.checked && everyDay) everyDay.checked = false;
  }));
  $("#reminderForm")?.addEventListener("submit", async e=>{e.preventDefault(); const time=$("#reminderTime").value; const days=$$("input[name=reminderDay]:checked").map(x=>Number(x.value)); if(!time||!days.length) return showToast("اختر الوقت ويوماً واحداً على الأقل"); if (window.MaajizaNativeNotifications?.requestPermission) { const granted = await window.MaajizaNativeNotifications.requestPermission(); if (!granted) return showToast("اسمح بالإشعارات من النافذة التي تظهر داخل التطبيق"); } const list=getReminders(); list.push({id:`r-${Date.now()}`,type:$("#reminderType").value,time,days,enabled:true}); saveReminders(list); renderReminders(); syncNativeReminders(list).then(count => { if (count) showToast("تمت جدولة التذكير بنجاح"); }); e.target.reset(); $("input[name=reminderDay][value=0]").checked=true; showToast("تم حفظ التذكير"); if("Notification" in window && Notification.permission==="default") requestNotifications(); });
  $("#remindersList")?.addEventListener("click", e=>{ const del=e.target.closest("[data-reminder-delete]"), tog=e.target.closest("[data-reminder-toggle]"); let list=getReminders(); if(del){list=list.filter(r=>r.id!==del.dataset.reminderDelete);saveReminders(list);renderReminders();syncNativeReminders(list);showToast("تم حذف التذكير");} if(tog){const r=list.find(x=>x.id===tog.dataset.reminderToggle);if(r){r.enabled=r.enabled===false;saveReminders(list);renderReminders();syncNativeReminders(list);}} });
}

function startSplash() {
  const splash = $("#splashScreen"); if (!splash) return;
  const progress = $("#splashProgress"), status = $("#splashStatus"), skip = $("#skipSplash"); let closed = false;
  const close = () => { if (closed) return; closed = true; document.body.classList.add("app-ready"); splash.classList.add("is-hidden"); setTimeout(() => splash.remove(), 700); };
  if (progress) { progress.style.width = "0%"; progress.parentElement?.setAttribute("aria-valuenow", "100"); }
  if (status) status.textContent = "تم التجهيز، نبدأ الآن...";
  skip?.addEventListener("click", close);
  const startedAt = performance.now(); let progressValue = 0; const progressTimer = setInterval(() => { progressValue = Math.min(94, progressValue + 2); if (progress) progress.style.width = `${progressValue}%`; if (status && progressValue > 35) status.textContent = "نرتّب مساحتك بهدوء..."; if (status && progressValue > 70) status.textContent = "كل شيء جاهز تقريبًا..."; }, 70);
  const finish = () => { clearInterval(progressTimer); if (progress) progress.style.width = "100%"; close(); };
  setTimeout(finish, Math.max(3000 - (performance.now() - startedAt), 3000));
}

function showToast(message) {
  const toast = $("#toast"); toast.textContent = message; toast.classList.add("show");
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("show"), 2100);
}
function getCount(item) { return Number(counts[item.id] || 0); }
function isComplete(item) { return item.count > 0 && getCount(item) >= item.count; }
function getTasbihCount() { return Number(tasbihCounts[selectedTasbih] || 0); }
function setTasbihCount(value) { tasbihCounts[selectedTasbih] = Math.max(0, Number(value) || 0); save("ma3jiza-tasbih-counts", tasbihCounts); }

function getTodayCounts() { const key=todayKey(); dailyCounts[key]=dailyCounts[key]||{}; return dailyCounts[key]; }
function getDailyCount(item) { return Number(getTodayCounts()[item.id] || 0); }
function updateClock() {
  const now=new Date(), clock=$("#liveClock"), hint=$("#liveClockHint");
  if(clock) clock.textContent=new Intl.DateTimeFormat("ar-EG",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true}).format(now);
  const h=now.getHours(); if(hint) hint.textContent=h<5?"قيام الليل والذكر":h<12?"أذكار الصباح":h<18?"وقت مناسب للذكر":"أذكار المساء";
}
function renderDailyBreakdown(trackable, today) {
  const box=$("#dailyBreakdown"); if(!box) return;
  const items=[...trackable].sort((a,b)=>getDailyCount(b)-getDailyCount(a)||String(a.title).localeCompare(String(b.title),"ar"));
  box.innerHTML='<div class="daily-breakdown-title">تفصيل وردك اليوم</div>'+items.map(item=>{const current=getDailyCount(item), target=Number(item.count||0), pct=target?Math.min(100,Math.round(current/target*100)):0; return `<div class="daily-item ${current?"active":""}"><span>${escapeHtml(item.title)}</span><b>${current.toLocaleString("ar-EG")}${target?` / ${target}`:""}</b><i><em style="width:${pct}%"></em></i></div>`;}).join("");
}
function updateDashboard() {
  const today=getTodayCounts();
  const trackable = adhkar.filter(item => Number(item.count || 0) > 0);
  const started = Object.values(today).filter(value => Number(value) > 0).length;
  const completed = trackable.filter(item => getDailyCount(item) >= Number(item.count)).length;
  const percent = trackable.length ? Math.round(completed / trackable.length * 100) : 0;
  const dailyTotal = Object.values(today).reduce((sum,value)=>sum+(Number(value)||0),0);
  const tasbihTotal = Object.values(tasbihCounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const quranTotal = adhkar.filter(item => item.category === "quranic-dua").length;
  const hour = new Date().getHours();
  const profileName = String(load("ma3jiza-profile-name", "")).trim();
  const greetingBase = hour < 5 ? "قياماً طيباً" : hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء هادئ";
  const greeting = profileName ? `${greetingBase} يا ${profileName}` : greetingBase;
  const dateLabel = new Intl.DateTimeFormat("ar-EG", {weekday:"long", day:"numeric", month:"long"}).format(new Date());
  const lastView = load("ma3jiza-last-view", "morning");
  const viewNames = {morning:"أكمل أذكار الصباح", evening:"أكمل أذكار المساء", rizq:"تابع أدعية الرزق", distress:"تابع تفريج الكرب", protection:"تابع التحصين", "self-dua":"ادعُ لنفسك اليوم", "quranic-dua":"اقرأ دعاءً قرآنياً"};
  const verses = [["رَبِّ اشْرَحْ لِي صَدْرِي ۝ وَيَسِّرْ لِي أَمْرِي","طه 25–26"],["رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً","البقرة 201"],["رَبِّ إِنِّي لِمَا أَنْزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ","القصص 24"],["رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا","آل عمران 8"]];
  const verse=verses[new Date().getDate()%verses.length];
  if($("#dashboardGreeting")) $("#dashboardGreeting").textContent=greeting;
  if($("#dashboardDate")) $("#dashboardDate").textContent=`${dateLabel} — ${dailyTotal?`أنجزت ${dailyTotal.toLocaleString("ar-EG")} تكرارًا اليوم.`:"ابدأ وردك اليوم بخطوة هادئة."}`;
  if($("#dashboardNextText")) $("#dashboardNextText").textContent=started?(viewNames[lastView]||"استأنف وردك"):"ابدأ من أذكار الصباح";
  if($("#dashboardProgressPercent")) $("#dashboardProgressPercent").textContent=`${percent}%`;
  if($("#dashboardProgressDone")) $("#dashboardProgressDone").textContent=`${completed}/${trackable.length}`;
  if($("#dashboardProgressText")) $("#dashboardProgressText").textContent=completed?`أتممت ${completed} من ${trackable.length} أذكار اليوم`:dailyTotal?`بدأت ${started} أذكار — واصل بهدوء`:`لم تبدأ وردك بعد`;
  if($("#dashboardStarted")) $("#dashboardStarted").textContent=started.toLocaleString("ar-EG");
  if($("#dashboardCompleted")) $("#dashboardCompleted").textContent=completed.toLocaleString("ar-EG");
  if($("#dashboardTasbih")) $("#dashboardTasbih").textContent=tasbihTotal.toLocaleString("ar-EG");
  if($("#dashboardQuran")) $("#dashboardQuran").textContent=quranTotal.toLocaleString("ar-EG");
  if($("#dashboardVerseText")) $("#dashboardVerseText").textContent=verse[0]; if($("#dashboardVerseSource")) $("#dashboardVerseSource").textContent=verse[1];
  const orbit=$(".progress-orbit"); if(orbit) orbit.style.setProperty("--progress",`${percent*3.6}deg`);
  renderDailyBreakdown(trackable,today); updateClock(); updateAnalytics();
}

function render() {
  const grid = $("#dhikrGrid");
  const morningEveningCategories = ["morning-evening", "morning", "evening", "daily"];
  const filtered = adhkar.filter(item => {
    const topics = Array.isArray(item.topics) ? item.topics : [];
    const matchesFilter = activeFilter === "all" || (activeFilter === "morning-evening" ? morningEveningCategories.includes(item.category) : (activeFilter === "morning" || activeFilter === "evening") ? (item.category === activeFilter || item.category === "morning-evening" || topics.includes(activeFilter)) : item.category === activeFilter || topics.includes(activeFilter));
    const matchesView = currentView === "all" || (currentView === "morning-evening" && morningEveningCategories.includes(item.category)) || (currentView === "morning" && (item.category === "morning" || item.category === "morning-evening" || topics.includes("morning"))) || (currentView === "evening" && (item.category === "evening" || item.category === "morning-evening" || topics.includes("evening"))) || (currentView === "rizq" && (item.category === "rizq" || topics.includes("rizq"))) || (currentView === "distress" && (item.category === "distress" || topics.includes("distress"))) || (currentView === "protection" && (item.category === "protection" || topics.includes("protection"))) || (currentView === "self-dua" && (item.category === "self-dua" || topics.includes("self-dua"))) || (currentView === "quranic-dua" && item.category === "quranic-dua");
    const text = normalizeArabic(`${item.title} ${item.text} ${item.timing}`);
    return matchesFilter && matchesView && text.includes(normalizeArabic(searchTerm));
  });
  grid.innerHTML = filtered.map((item, index) => {
    const current = getCount(item), target = Number(item.count || 0);
    const percent = target ? Math.min(100, current / target * 100) : 0;
    const label = target ? `${Math.min(current,target)} / ${target}` : `${current} مرة`;
    return `<article class="dhikr-card" style="animation-delay:${Math.min(index*35,210)}ms"><div class="card-top"><h3 class="card-title">${escapeHtml(item.title)}</h3><span class="timing-pill">${escapeHtml(item.timing)}</span></div><div class="dhikr-text">${escapeHtml(item.text)}</div><div class="virtue-preview"><span>${item.category === "quranic-dua" ? "التفسير المبسط" : "الفضل"}</span><p>${escapeHtml(item.virtue || "لم يُعتمد فضل مخصوص لعدم توفر توثيق كافٍ.")}</p></div><div class="card-bottom"><div class="progress-wrap"><div class="progress-label"><strong id="count-${escapeHtml(item.id)}" aria-live="polite">${label}</strong><span>${target ? "التكرار" : "عداد اختياري"}</span></div><div class="mini-progress"><span style="width:${percent}%"></span></div></div><div class="card-actions"><button class="small-action" data-action="copy" data-id="${escapeHtml(item.id)}">نسخ النص</button><button class="small-action" data-action="undo" data-id="${escapeHtml(item.id)}" aria-label="تراجع عن آخر تكرار لـ ${escapeHtml(item.title)}">تراجع</button><button class="count-btn ${isComplete(item)?"done":""}" data-action="count" data-id="${escapeHtml(item.id)}" aria-label="زيادة عداد ${escapeHtml(item.title)}">${isComplete(item)?"✓":"+"}</button></div></div><div class="source-row"><span class="source-status">${escapeHtml(item.grade)}</span><button class="source-link" data-action="source" data-id="${escapeHtml(item.id)}">الفضل والمصدر ↗</button></div></article>`;
  }).join("");
  $("#emptyState").classList.toggle("hidden", filtered.length > 0);
  $("#dhikrGrid").classList.toggle("hidden", currentView === "tasbih" || currentView === "dashboard");
  $("#adhkarSection").classList.toggle("hidden", currentView === "tasbih" || currentView === "dashboard");
  $("#dashboardSection").classList.toggle("hidden", currentView !== "dashboard");
  $("#hero").classList.add("hidden");
  updateDashboard();
  $("#tasbihSection").classList.toggle("hidden", currentView !== "tasbih");
  $$(".nav-link[data-view]").forEach(btn => btn.classList.toggle("active", btn.dataset.view === currentView));
  $("#sectionTitle").textContent = currentView === "rizq" ? "أدعية الرزق وقضاء الدَّين" : currentView === "distress" ? "أدعية تفريج الكرب والهم" : currentView === "protection" ? "التحصين من العين والحسد" : currentView === "self-dua" ? "أدعية لنفسي" : currentView === "morning" ? "أذكار الصباح" : currentView === "evening" ? "أذكار المساء" : currentView === "morning-evening" ? "أذكار الصباح والمساء" : currentView === "quranic-dua" ? "أدعية قرآنية شاملة" : "أذكار مختارة لك";
  $("#sectionSubtitle").textContent = currentView === "rizq" ? "آيات وأدعية للرزق الحلال والاستغناء عن الحرام، مع توثيق الفضل دون وعود مالية غير ثابتة." : currentView === "distress" ? "أدعية الكرب والهم والصبر والتوكل، من القرآن والسنة مع بيان المصدر ودرجة الحديث." : currentView === "protection" ? "آيات ورقى وأذكار ثابتة للتحصين، مع التفريق بين النص الشرعي والدعاء العام دون تهويل أو تشخيص." : currentView === "self-dua" ? "مجموعة واسعة من الأدعية القرآنية والنبوية التي يدعو بها المسلم لنفسه، مع المصدر ودرجة التوثيق." : currentView === "quranic-dua" ? "أكثر من 80 صيغة دعاء واستعاذة وتوكل من القرآن الكريم، مع موضع الآية وشرح مبسط لمعناها." : "اقرأ على مهل، وتدبّر المعنى، ولا تجعل العداد ضغطاً عليك.";
  const guide = $("#topicGuide");
  const guideContent = currentView === "rizq" ? '<strong>دليل القسم</strong><p>ستجد هنا دعاء قضاء الدَّين، وطلب الرزق والخير، وآيات الاستغفار والتقوى والتوكل. لا يوجد في هذه الصفحة دعاء يضمن مبلغاً أو وظيفة خلال مدة محددة؛ الدعاء مع السعي الحلال والأخذ بالأسباب.</p>' : currentView === "distress" ? '<strong>لو أنت في ضيق</strong><p>ابدأ بما تقدر عليه، واقرأ النص ومعناه من غير إلزام نفسك بعدد غير ثابت. بعض البطاقات آيات قرآنية، وبعضها أدعية نبوية؛ افتح «الفضل والمصدر» لمعرفة الفرق والتخريج.</p>' : currentView === "protection" ? '<strong>التحصين بلا تهويل</strong><p>هذه النصوص من القرآن والسنة، وتُقرأ بنية الاستعاذة والرقية مع التوكل على الله. لا يصح الجزم بأن كل تعب سببه عين أو حسد، ولا يغني الذكر عن طلب العلاج المتخصص عند الحاجة.</p>' : currentView === "self-dua" ? '<strong>ادعُ لنفسك بما ينفعك</strong><p>اختر الدعاء الذي يناسب حالك، واقرأه بتدبر. وجود الدعاء في المصدر لا يعني ضمان نتيجة محددة أو وجوب عدد معين ما لم يثبت ذلك.</p>' : currentView === "quranic-dua" ? '<strong>أدعية من القرآن مع شرح مبسط</strong><p>هذه النصوص آيات من القرآن الكريم، والشرح أسفل كل بطاقة تقريب لمعناها العام وليس بديلاً عن كتب التفسير. بعضها ورد على لسان نبي أو مؤمن في سياق قصة، لذلك لا نعرضه كذكر يومي بعدد مخصوص. افتح «الفضل والمصدر» لمراجعة موضع الآية والتفسير.</p>' : '';
  guide.innerHTML = guideContent; guide.classList.toggle("hidden", !guideContent);
  if (document.documentElement.dataset.fontScale) applyFontScale(Number(document.documentElement.dataset.fontScale));
}
let guidedSession = null;
function getSessionItems(mode) {
  return adhkar.filter(item => {
    const topics = Array.isArray(item.topics) ? item.topics : [];
    return mode === "morning" ? item.category === "morning" || item.category === "morning-evening" || topics.includes("morning") : item.category === "evening" || item.category === "morning-evening" || topics.includes("evening");
  }).sort((a, b) => Number(getDailyCount(a) >= Number(a.count || 0)) - Number(getDailyCount(b) >= Number(b.count || 0)));
}
function renderGuidedSession() {
  const dialog = $("#guidedSession");
  if (!dialog || !guidedSession) return;
  const item = guidedSession.items[guidedSession.index];
  if (!item) {
    $("#guidedSessionBody").innerHTML = '<div class="session-done"><strong>أتممت الورد</strong><p>بارك الله في وقتك، وتقبّل منك.</p><button class="focus-action" data-action="close-session">العودة للموقع</button></div>';
    return;
  }
  const current = getDailyCount(item), target = Number(item.count || 0);
  $("#guidedSessionTitle").textContent = guidedSession.mode === "morning" ? "ورد الصباح" : "ورد المساء";
  $("#guidedSessionProgress").textContent = `${guidedSession.index + 1} / ${guidedSession.items.length}`;
  $("#guidedSessionBody").innerHTML = `<span class="session-label">${escapeHtml(item.title)}</span><div class="session-text">${escapeHtml(item.text)}</div><p class="session-count">${target ? `أتممت ${Math.min(current, target)} من ${target}` : "العدد اختياري"}</p><div class="session-actions"><button class="small-action" data-action="session-skip">تخطي</button><button class="count-btn" data-action="session-count">${target && current >= target ? "تم ✓" : "+"}</button></div>`;
}
function startGuidedSession(mode = "morning") {
  guidedSession = { mode, items: getSessionItems(mode), index: 0 };
  $("#guidedSession")?.showModal();
  renderGuidedSession();
}
function closeGuidedSession() { guidedSession = null; $("#guidedSession")?.close(); }

function bump(id, delta) {
  const item = adhkar.find(x => x.id === id); if (!item) return;
  counts[id] = Math.max(0, getCount(item) + delta); save("ma3jiza-counts", counts); const today=getTodayCounts(); const previousToday=Number(today[id]||0); today[id]=Math.max(0, previousToday+delta); const appliedDelta=today[id]-previousToday; if(!today[id]) delete today[id]; save("ma3jiza-daily-counts", dailyCounts);
  if (appliedDelta) recordActivity(appliedDelta, "dhikr", item.category || "daily");
  if (delta > 0 && item.count && counts[id] === item.count) showToast("أتممت عدد هذا الذكر، تقبّل الله منك");
  render();
}
async function copyDhikr(id) {
  const item = adhkar.find(x => x.id === id); if (!item) return;
  try { if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(item.text); else { const field = document.createElement("textarea"); field.value = item.text; field.style.position = "fixed"; field.style.opacity = "0"; document.body.appendChild(field); field.select(); const ok = document.execCommand("copy"); field.remove(); if (!ok) throw new Error("copy failed"); } showToast("تم نسخ نص الذكر"); }
  catch { showToast("تعذّر النسخ؛ حدّد النص وانسخه يدوياً"); }
}
function showSource(id) {
  const item = adhkar.find(x => x.id === id); if (!item) return;
  $("#dialogTitle").textContent = item.title;
  const sourceLinks = Array.isArray(item.sourceLinks) ? item.sourceLinks : [];
  const linksHtml = sourceLinks.map(link => { const url = safeExternalUrl(link.url); return url ? `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)} ↗</a></li>` : ""; }).join("");
  const finalLinks = linksHtml ? `<ul class="source-links-list">${linksHtml}</ul>` : `<p class="source-note">لا يوجد رابط مصدر آمن لهذا النص؛ راجع بيانات التوثيق قبل اعتماده.</p>`;
  $("#dialogBody").innerHTML = `<div class="dialog-field"><strong>${item.category === "quranic-dua" ? "التفسير المبسط" : "الفضل المذكور"}</strong><p>${escapeHtml(item.virtue || "لم يُعتمد فضل مخصوص لعدم توفر توثيق كافٍ.")}</p></div><div class="dialog-field"><strong>المصدر والتخريج</strong><p>${escapeHtml(item.source || "لم يحدد مصدر تفصيلي بعد.")}</p>${finalLinks}</div><div class="dialog-field"><strong>حالة التوثيق</strong><p>${escapeHtml(item.grade || "يحتاج مراجعة")}</p></div>`;
  $("#sourceDialog").showModal();
}
function setView(view) {
  currentView = view;
  document.body.dataset.view = view;
  document.body.classList.remove("view-transitioning");
  void document.body.offsetWidth;
  document.body.classList.add("view-transitioning");
  clearTimeout(setView.transitionTimer);
  setView.transitionTimer = setTimeout(() => document.body.classList.remove("view-transitioning"), 520);
  if (view !== "dashboard" && view !== "tasbih") save("ma3jiza-last-view", view);
  if (["rizq", "distress", "protection", "self-dua", "quranic-dua", "morning", "evening"].includes(view)) activeFilter = view;
  else if (view === "morning-evening") activeFilter = "morning-evening";
  else if (view === "quranic-dua") activeFilter = "quranic-dua";
  else if (view === "dashboard") activeFilter = "all";
  $$("#filters .filter").forEach(btn => btn.classList.toggle("active", btn.dataset.filter === activeFilter)); render();
  if (view === "dashboard") window.scrollTo({top: 0, behavior: "smooth"});
  else { const section = view === "tasbih" ? $("#tasbihSection") : $("#adhkarSection"); section.scrollIntoView({behavior:"smooth",block:"start"}); }
}
function updateTasbih() {
  const count = getTasbihCount(); $("#tasbihCount").textContent = count.toLocaleString("ar-EG"); $("#tasbihDhikr").value = selectedTasbih; $("#tasbihMessage").textContent = `${selectedTasbih} — عداد مستقل محفوظ على جهازك`;
  const degrees = (count % 100) * 3.6; $(".counter-ring").style.background = `conic-gradient(var(--turquoise) ${degrees}deg, var(--surface-soft) ${degrees}deg 360deg)`;
}
function updateTheme(dark) { document.body.classList.toggle("dark", dark); save("ma3jiza-dark", dark); $("#themeToggle").textContent = dark ? "☀ الوضع النهاري" : "◐ الوضع الليلي"; }
async function init() {
  startSplash();
  bindNotificationControls();
  const earlyFont = load("ma3jiza-font", "Cairo");
  document.documentElement.style.setProperty("--font", `'${earlyFont}', sans-serif`);
  localStorage.removeItem("ma3jiza-profile-age");
  try { const response = await fetch(DATA_URL); if (!response.ok) throw new Error("تعذر تحميل بيانات الأذكار"); adhkar = await response.json(); }
  catch (error) { $("#dhikrGrid").innerHTML = `<div class="empty-state">تعذّر تحميل ملف الأذكار. شغّل المشروع عبر خادم محلي بدل فتح index.html مباشرة. <br><small>${escapeHtml(error.message)}</small></div>`; return; }
  const chosenFont = load("ma3jiza-font", "Cairo"); if ($("#fontSelect")) $("#fontSelect").value = chosenFont; document.documentElement.style.setProperty("--font", `'${chosenFont}', sans-serif`); const savedFontScale = Number(load("ma3jiza-font-scale", 100)) || 100; $("#globalFontSize").value = savedFontScale; applyFontScale(savedFontScale); $("#profileName").value = load("ma3jiza-profile-name", ""); updateTheme(load("ma3jiza-dark", false)); updateTasbih(); setupReminders(); updateClock(); setInterval(updateClock,1000); if ($("#statsDate")) { $("#statsDate").value = todayKey(); $("#statsDate").addEventListener("change", e => updateDayDetail(e.target.value)); } render();
  $("#resetDashboard")?.addEventListener("click", () => { $("#statsDate").value=todayKey(); $("#historyDays")?.classList.add("hidden"); $(".analytics-panel")?.classList.remove("show-history"); $("#showAllDays").textContent="عرض الكل"; updateDayDetail(todayKey()); showToast("تمت إعادة الإحصائيات إلى اليوم الحالي"); });
  $("#showAllDays")?.addEventListener("click", () => { const box=$("#historyDays"), panel=$(".analytics-panel"); box.classList.toggle("hidden"); panel?.classList.toggle("show-history", !box.classList.contains("hidden")); if(!box.classList.contains("hidden")) renderHistory(); $("#showAllDays").textContent=box.classList.contains("hidden")?"عرض الكل":"إخفاء السجل"; });
  $("#historyDays")?.addEventListener("click", e => { const btn=e.target.closest("[data-history-date]"); if(btn){ $("#statsDate").value=btn.dataset.historyDate; updateDayDetail(btn.dataset.historyDate); $("#historyDays").classList.add("hidden"); $(".analytics-panel")?.classList.remove("show-history"); $("#showAllDays").textContent="عرض الكل"; } });
  document.addEventListener("click", (event) => { const action = event.target.closest("[data-action]"); if (action) { const id = action.dataset.id; if (action.dataset.action === "count") bump(id, 1); if (action.dataset.action === "undo") bump(id, -1); if (action.dataset.action === "source") showSource(id); if (action.dataset.action === "copy") copyDhikr(id); if (action.dataset.action === "start-session") startGuidedSession(action.dataset.session || "morning"); if (action.dataset.action === "close-session") closeGuidedSession(); if (action.dataset.action === "session-skip" && guidedSession) { guidedSession.index++; renderGuidedSession(); } if (action.dataset.action === "session-count" && guidedSession) { const item = guidedSession.items[guidedSession.index]; if (item) { bump(item.id, 1); const target = Number(item.count || 0); if (!target || getDailyCount(item) >= target) guidedSession.index++; renderGuidedSession(); } } return; } const jump = event.target.closest("[data-jump]"); if (jump) setView(jump.dataset.jump); });
  $$(".nav-link[data-view]").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));
  $$("#filters .filter").forEach(btn => btn.addEventListener("click", () => { activeFilter = btn.dataset.filter; if (["rizq", "distress", "protection", "self-dua", "quranic-dua", "morning", "evening"].includes(activeFilter)) currentView = activeFilter; else if (["rizq", "distress", "protection", "self-dua", "quranic-dua", "morning", "evening"].includes(currentView)) currentView = "all"; $$("#filters .filter").forEach(b => b.classList.toggle("active", b === btn)); render(); }));
  $("#searchInput").addEventListener("input", e => { searchTerm = e.target.value; render(); });
  $("#exportProgress").addEventListener("click", () => { const payload = { counts, tasbihCounts, selectedTasbih, exportedAt: new Date().toISOString() }; const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"}); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "ma3jiza-progress.json"; link.click(); URL.revokeObjectURL(link.href); showToast("تم تصدير التقدم"); });
  $("#importProgress").addEventListener("change", async e => { const file = e.target.files[0]; if (!file) return; try { const payload = JSON.parse(await file.text()); if (payload.counts && typeof payload.counts === "object") { Object.assign(counts, payload.counts); save("ma3jiza-counts", counts); } if (payload.tasbihCounts && typeof payload.tasbihCounts === "object") { Object.assign(tasbihCounts, payload.tasbihCounts); save("ma3jiza-tasbih-counts", tasbihCounts); } if (typeof payload.selectedTasbih === "string") { selectedTasbih = payload.selectedTasbih; save("ma3jiza-selected-tasbih", selectedTasbih); } updateTasbih(); render(); showToast("تم استيراد التقدم"); } catch { showToast("ملف التقدم غير صالح"); } e.target.value = ""; });
  $("#sharePage").addEventListener("click", async () => { try { if (navigator.share) await navigator.share({title:"معجزة", text:"أذكار وسبحة إلكترونية هادئة", url:location.href}); else { await navigator.clipboard.writeText(location.href); showToast("تم نسخ رابط الصفحة"); } } catch {} });
  $("#fontSelect").addEventListener("change", e => { document.documentElement.style.setProperty("--font", `'${e.target.value}', sans-serif`); save("ma3jiza-font", e.target.value); showToast("تم تغيير الخط"); });
  $("#globalFontSize").addEventListener("input", e => { const value = Number(e.target.value); applyFontScale(value); save("ma3jiza-font-scale", value); });
  $("#themeToggle").addEventListener("click", () => updateTheme(!document.body.classList.contains("dark")));
  const settings = $("#settingsDialog");
  $("#settingsToggle").addEventListener("click", () => settings.showModal());
  $("#closeSettings").addEventListener("click", () => settings.close());
  $("#saveSettings").addEventListener("click", () => { save("ma3jiza-profile-name", $("#profileName").value.trim()); updateDashboard(); settings.close(); showToast("تم حفظ إعداداتك"); });
  settings.addEventListener("click", e => { if (e.target === settings) settings.close(); });
  $("#closeDialog").addEventListener("click", () => $("#sourceDialog").close());
  $("#sourceDialog").addEventListener("click", e => { if (e.target === $("#sourceDialog")) $("#sourceDialog").close(); });
  $("#tasbihTap").addEventListener("click", () => { setTasbihCount(getTasbihCount() + 1); recordActivity(1, "tasbih", "tasbih"); updateTasbih(); if (navigator.vibrate) navigator.vibrate(12); });
  $("#undoTasbih").addEventListener("click", () => { const count=getTasbihCount(); if(count>0){setTasbihCount(count-1);recordActivity(-1,"tasbih","tasbih");} updateTasbih(); });
  $("#resetTasbih").addEventListener("click", () => { setTasbihCount(0); updateTasbih(); showToast("تمت إعادة ضبط عداد الذكر الحالي؛ سجل نشاط الأيام محفوظ"); });
  $("#tasbihDhikr").addEventListener("change", e => { selectedTasbih = e.target.value; save("ma3jiza-selected-tasbih", selectedTasbih); updateTasbih(); showToast("تم اختيار الذكر وحُفظ عداده مستقلاً"); });
}
init();
