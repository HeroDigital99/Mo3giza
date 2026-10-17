const $ = (s) => document.querySelector(s);
localStorage.removeItem('ma3jiza-profile-age');
const counts = JSON.parse(localStorage.getItem('ma3jiza-tasbih-counts') || '{}');
let selected = localStorage.getItem('ma3jiza-selected-tasbih') || 'سُبْحَانَ اللَّهِ';
const savedTheme = localStorage.getItem('ma3jiza-tasbih-theme') || 'mint';
const savedLayout = localStorage.getItem('ma3jiza-tasbih-layout') || 'classic';
const savedFont = localStorage.getItem('ma3jiza-font') || localStorage.getItem('ma3jiza-tasbih-font') || 'Cairo';
const savedSize = Number(localStorage.getItem('ma3jiza-font-scale') || localStorage.getItem('ma3jiza-tasbih-size') || 100);
const vibrate = $('#vibrate');

function applyTextScale(value) {
  const scale = Math.max(75, Math.min(200, Number(value) || 100)) / 100;
  document.documentElement.style.setProperty('--font-scale', scale);
  document.documentElement.dataset.fontScale = String(Math.round(scale * 100));
  document.body.classList.toggle('font-scale-only', scale !== 1);
  document.body.classList.remove('large-font', 'compact-font');
  const selector = 'h1,h2,h3,h4,h5,h6,p,small,label,legend,button,input,select,textarea,a,li,strong,b,.intro p,.tasbih-top,.customizer-heading p,.note p,.option,.toggle';
  const excluded = '.brand-mark,.brand-wordmark,.settings-trigger span,.spark,.live-dot,.tap-plus,.swatch';
  document.querySelectorAll(selector).forEach(el => {
    if (el.closest(excluded)) return;
    const computed = getComputedStyle(el);
    if (!el.dataset.baseFontSize) el.dataset.baseFontSize = String(parseFloat(computed.fontSize) / scale);
    el.style.fontSize = `${parseFloat(el.dataset.baseFontSize) * scale}px`;
  });
  const output = $('#sizeValue'); if (output) output.textContent = `${Math.round(scale * 100)}%`;
}

function save() { localStorage.setItem('ma3jiza-tasbih-counts', JSON.stringify(counts)); }
function todayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function recordTasbihActivity(amount) {
  const key = todayKey(); let activity = {};
  try { activity = JSON.parse(localStorage.getItem('ma3jiza-activity') || '{}') || {}; } catch {}
  const current = activity[key];
  const day = typeof current === 'number' ? {total:current,dhikr:current,tasbih:0,categories:{}} : (current || {total:0,dhikr:0,tasbih:0,categories:{}});
  const requested = Number(amount) || 0; if (!requested) return;
  const available = Math.min(Number(day.total) || 0, Number(day.tasbih) || 0);
  const delta = requested < 0 ? -Math.min(Math.abs(requested), available) : requested;
  if (!delta) return;
  day.total = Math.max(0, (Number(day.total) || 0) + delta);
  day.tasbih = Math.max(0, (Number(day.tasbih) || 0) + delta);
  day.categories = day.categories || {};
  if (delta > 0 || Number(day.categories.tasbih) > 0) day.categories.tasbih = Math.max(0, (Number(day.categories.tasbih) || 0) + delta);
  if (!day.categories.tasbih) delete day.categories.tasbih;
  if (day.total) activity[key] = day; else delete activity[key];
  localStorage.setItem('ma3jiza-activity', JSON.stringify(activity));
}
function currentCount() { return Number(counts[selected] || 0); }
function update() {
  $('#count').textContent = currentCount().toLocaleString('ar-EG');
  $('#dhikr').value = selected;
  $('#message').textContent = `${selected} — عداد مستقل محفوظ على جهازك`;
}
function applyPreferences() {
  document.body.dataset.theme = localStorage.getItem('ma3jiza-tasbih-theme') || 'mint';
  document.body.dataset.layout = localStorage.getItem('ma3jiza-tasbih-layout') || 'classic';
  document.documentElement.style.setProperty('--font', `'${localStorage.getItem('ma3jiza-font') || localStorage.getItem('ma3jiza-tasbih-font') || 'Cairo'}', sans-serif`);
  const size = Number(localStorage.getItem('ma3jiza-font-scale') || localStorage.getItem('ma3jiza-tasbih-size') || 100);
  applyTextScale(size);
  $('#font').value = localStorage.getItem('ma3jiza-font') || localStorage.getItem('ma3jiza-tasbih-font') || 'Cairo';
  $('#fontSize').value = size; $('#sizeValue').textContent = `${size}%`;
  document.querySelectorAll('[data-theme]').forEach(b => b.classList.toggle('active', b.dataset.theme === document.body.dataset.theme));
  document.querySelectorAll('[data-layout]').forEach(b => b.classList.toggle('active', b.dataset.layout === document.body.dataset.layout));
}
$('#dhikr').addEventListener('change', e => { selected = e.target.value; localStorage.setItem('ma3jiza-selected-tasbih', selected); update(); });
$('#tap').addEventListener('click', () => { counts[selected] = currentCount() + 1; save(); recordTasbihActivity(1); update(); if (vibrate.checked && navigator.vibrate) navigator.vibrate(12); });
$('#undo').addEventListener('click', () => { const count=currentCount(); if(count>0){counts[selected]=count-1;save();recordTasbihActivity(-1);} update(); });
$('#reset').addEventListener('click', () => { counts[selected] = 0; save(); update(); });
document.addEventListener('keydown', e => { if (e.code === 'Space' && !['INPUT','SELECT','BUTTON'].includes(document.activeElement.tagName)) { e.preventDefault(); $('#tap').click(); } });
document.querySelectorAll('[data-theme]').forEach(button => button.addEventListener('click', () => { localStorage.setItem('ma3jiza-tasbih-theme', button.dataset.theme); applyPreferences(); }));
document.querySelectorAll('[data-layout]').forEach(button => button.addEventListener('click', () => { localStorage.setItem('ma3jiza-tasbih-layout', button.dataset.layout); applyPreferences(); }));
$('#font').addEventListener('change', e => { localStorage.setItem('ma3jiza-font', e.target.value); localStorage.setItem('ma3jiza-tasbih-font', e.target.value); applyPreferences(); });
$('#fontSize').addEventListener('input', e => { localStorage.setItem('ma3jiza-font-scale', e.target.value); localStorage.setItem('ma3jiza-tasbih-size', e.target.value); applyPreferences(); });
vibrate.addEventListener('change', () => localStorage.setItem('ma3jiza-tasbih-vibrate', vibrate.checked));
vibrate.checked = localStorage.getItem('ma3jiza-tasbih-vibrate') !== 'false';
applyPreferences(); update();

const settings = $('#settingsDialog');
$('#settingsToggle').addEventListener('click', () => settings.showModal());
$('#closeSettings').addEventListener('click', () => settings.close());
$('#saveSettings').addEventListener('click', () => { localStorage.setItem('ma3jiza-profile-name', $('#profileName').value.trim()); settings.close(); $('#message').textContent = 'تم حفظ إعداداتك — ' + (localStorage.getItem('ma3jiza-profile-name') || 'أهلاً بك'); });
settings.addEventListener('click', e => { if (e.target === settings) settings.close(); });
