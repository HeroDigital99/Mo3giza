const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const DATA_URL = 'data/adhkar.json';
const COUNT_KEY = 'ma3jiza-dua-counts';
let items = [];
let category = 'all';
let query = '';
let counts = {};
try { counts = JSON.parse(localStorage.getItem(COUNT_KEY) || '{}') || {}; } catch { counts = {}; }

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const matchesCategory = (item, key) => key === 'all' || item.category === key || (Array.isArray(item.topics) && item.topics.includes(key));
const duaKeys = ['rizq','distress','protection','self-dua','quranic-dua'];
const isDua = item => duaKeys.includes(item.category) || (Array.isArray(item.topics) && item.topics.some(key => duaKeys.includes(key)));
const saveCounts = () => localStorage.setItem(COUNT_KEY, JSON.stringify(counts));
const countFor = item => Number(counts[item.id] || 0);
const sourceLinks = item => (item.sourceLinks?.length ? item.sourceLinks : item.sourceUrl ? [{label:'المصدر المباشر', url:item.sourceUrl}] : []).map(link => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label || link.url)}</a>`).join('');

function render(){
  const filtered = items.filter(isDua).filter(item => matchesCategory(item, category)).filter(item => !query || `${item.title} ${item.text} ${item.virtue || ''}`.toLocaleLowerCase('ar').includes(query.toLocaleLowerCase('ar')));
  $('#resultsCount').textContent = `${filtered.length} دعاء`;
  $('#duaEmpty').hidden = filtered.length > 0;
  $('#duaGrid').innerHTML = filtered.map((item, index) => {
    const count = countFor(item), target = Number(item.count || 0), complete = target > 0 && count >= target;
    return `<article class="dhikr-card" style="animation-delay:${Math.min(index * 25, 180)}ms"><div class="card-top"><h3 class="card-title">${escapeHtml(item.title)}</h3><span class="timing-pill">${escapeHtml(item.timing || 'دعاء')}</span></div><div class="dhikr-text">${escapeHtml(item.text)}</div><div class="virtue-preview"><span>${item.category === 'quranic-dua' ? 'التفسير المبسط' : 'الفضل'}</span><p>${escapeHtml(item.virtue || 'لم يُعتمد فضل مخصوص لعدم توفر توثيق كافٍ.')}</p></div><div class="card-bottom"><div class="progress-wrap"><div class="progress-label"><strong id="count-${escapeHtml(item.id)}">${count}</strong><span>${target ? `من ${target}` : 'عداد اختياري'}</span></div><div class="mini-progress"><span style="width:${target ? Math.min(100, count / target * 100) : 0}%"></span></div></div><div class="card-actions"><button class="small-action" data-action="copy" data-id="${escapeHtml(item.id)}">نسخ النص</button><button class="small-action" data-action="source" data-id="${escapeHtml(item.id)}">الفضل والمصدر</button><button class="count-btn ${complete ? 'done' : ''}" data-action="count" data-id="${escapeHtml(item.id)}" aria-label="زيادة عداد ${escapeHtml(item.title)}">${complete ? '✓' : '+'}</button></div></div><div class="source-row"><span class="source-status">${escapeHtml(item.grade || 'تحتاج مراجعة')}</span></div></article>`;
  }).join('');
}
function showSource(item){ $('#dialogBody').innerHTML = `<div class="dialog-field"><strong>${item.category === 'quranic-dua' ? 'التفسير المبسط' : 'الفضل المذكور'}</strong><p>${escapeHtml(item.virtue || 'لم يُعتمد فضل مخصوص لعدم توفر توثيق كافٍ.')}</p></div><div class="dialog-field"><strong>المصدر والتخريج</strong><p>${escapeHtml(item.source || 'لم يحدد مصدر تفصيلي بعد.')}</p><div class="source-links-list">${sourceLinks(item)}</div></div><div class="dialog-field"><strong>حالة التوثيق</strong><p>${escapeHtml(item.grade || 'يحتاج مراجعة')}</p></div>`; $('#sourceDialog').showModal(); }
async function copyText(item){ try { await navigator.clipboard.writeText(item.text); alert('تم نسخ نص الدعاء'); } catch { alert('تعذر النسخ، حاول مرة أخرى'); } }
function updateTheme(dark){ document.body.classList.toggle('dark', dark); localStorage.setItem('ma3jiza-dua-dark', String(dark)); }

$('#duaCategories').addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (!button) return; category = button.dataset.category; $$('.dua-category').forEach(item => item.classList.toggle('active', item === button)); render(); });
$('#duaSearch').addEventListener('input', event => { query = event.target.value.trim(); render(); });
document.addEventListener('click', event => { const action = event.target.closest('[data-action]'); if (!action) return; const item = items.find(entry => entry.id === action.dataset.id); if (!item) return; if (action.dataset.action === 'count') { counts[item.id] = countFor(item) + 1; saveCounts(); render(); } if (action.dataset.action === 'copy') copyText(item); if (action.dataset.action === 'source') showSource(item); });
$('#closeSource').addEventListener('click', () => $('#sourceDialog').close());
$('#sourceDialog').addEventListener('click', event => { if (event.target === $('#sourceDialog')) $('#sourceDialog').close(); });
$('#themeToggle').addEventListener('click', () => updateTheme(!document.body.classList.contains('dark')));
updateTheme(localStorage.getItem('ma3jiza-dua-dark') === 'true');
fetch(DATA_URL).then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(data => { items = data; render(); }).catch(() => { $('#duaGrid').innerHTML = '<p class="empty-state">تعذر تحميل الأدعية. شغّل المشروع من خلال خادم محلي.</p>'; });
