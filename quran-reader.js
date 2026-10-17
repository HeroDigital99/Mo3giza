const DATA_URL = 'data/quran/pages.json?v=20261016-quran-v1.0.1';
const TOTAL_PAGES = 604;
const STORAGE_PAGE = 'ma3jiza-quran-page';
const STORAGE_BOOKMARK = 'ma3jiza-quran-bookmark';
const STORAGE_DARK = 'ma3jiza-dark';
const STORAGE_FONT = 'ma3jiza-quran-font-scale';
const BASMALA = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

const $ = (selector) => document.querySelector(selector);
let data;
let currentStart = 1;
let activePage = 1;
let fontScale = Number(localStorage.getItem(STORAGE_FONT) || 100);

function toArabicDigits(value) {
  return String(value).replace(/[0-9]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function clampPage(value) {
  return Math.max(1, Math.min(TOTAL_PAGES, Math.floor(Number(value) || 1)));
}
function clampSpread(value) {
  const page = clampPage(value);
  return Math.floor((page - 1) / 2) * 2 + 1;
}
function pageData(pageNumber) { return data.pages[pageNumber - 1]; }
function surahName(number) { return data.surahs[number - 1]?.name || ''; }
function normalizeSearch(value) { return String(value || '').normalize('NFKD').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ـ/g, '').trim(); }

function renderPage(pageNumber) {
  const page = pageData(pageNumber);
  if (!page) return '';
  const first = page.verses[0];
  let lastSurah = null;
  const verses = page.verses.map((verse) => {
    const heading = verse.surah !== lastSurah && verse.ayah === 1
      ? `<h2 class="surah-heading"><span>سُورَةُ</span> ${escapeHtml(surahName(verse.surah).replace(/^سُورَةُ\s*/u, ''))}</h2>`
      : '';
    lastSurah = verse.surah;
    const hasBasmala = verse.ayah === 1 && verse.text.startsWith(BASMALA);
    const ayahText = hasBasmala ? verse.text.slice(BASMALA.length).trim() : verse.text;
    const basmala = hasBasmala ? `<div class="basmala" lang="ar">${BASMALA}</div>` : '';
    if (!ayahText) return `${heading}${basmala}`;
    const text = escapeHtml(ayahText);
    return `${heading}${basmala}<span class="ayah-inline">${text} <span class="ayah-marker" aria-label="الآية ${toArabicDigits(verse.ayah)}">${toArabicDigits(verse.ayah)}</span></span>`;
  }).join('');
  const last = page.verses[page.verses.length - 1];
  return `<article class="quran-page-card"><div class="page-ornament"><span>۞</span><b>المصحف الشريف</b><small>صفحة ${toArabicDigits(pageNumber)}</small><span>۞</span></div><div class="page-content"><div class="ayah-flow">${verses}</div></div><small class="page-reference">${toArabicDigits(first.surah)}:${toArabicDigits(first.ayah)} — ${toArabicDigits(last.surah)}:${toArabicDigits(last.ayah)}</small></article>`;
}

function render() {
  const end = Math.min(currentStart + 1, TOTAL_PAGES);
  $('#readerPages').innerHTML = renderPage(currentStart) + renderPage(end);
  $('#pageInput').value = String(activePage);
  $('#pageLabel').textContent = `الصفحتان ${toArabicDigits(currentStart)}${end !== currentStart ? ` و${toArabicDigits(end)}` : ''}`;
  $('#previousPage').disabled = currentStart <= 1;
  $('#nextPage').disabled = currentStart >= 603;
  const firstVerse = pageData(activePage).verses[0];
  $('#surahSelect').value = String(firstVerse.surah);
  updateBookmarkUI();
}

function goToPage(value, persist = true) {
  activePage = clampPage(value);
  currentStart = clampSpread(activePage);
  if (persist) localStorage.setItem(STORAGE_PAGE, String(activePage));
  render();
  window.scrollTo({ top: document.querySelector('.reader-card').offsetTop - 18, behavior: 'smooth' });
}
function movePages(direction) { goToPage(currentStart + direction * 2); }

function goToSurah(number) {
  const surah = data.surahs.find((item) => item.number === Number(number));
  if (!surah) return;
  activePage = clampPage(surah.startPage);
  currentStart = activePage;
  localStorage.setItem(STORAGE_PAGE, String(activePage));
  render();
  window.scrollTo({ top: document.querySelector('.reader-card').offsetTop - 18, behavior: 'smooth' });
}

function fillSurahSelect() {
  $('#surahSelect').innerHTML = data.surahs.map((surah) => `<option value="${surah.number}">${toArabicDigits(surah.number)}. ${escapeHtml(surah.name.replace(/^سُورَةُ\s*/u, ''))}</option>`).join('');
}
function updateBookmarkUI() {
  const saved = Number(localStorage.getItem(STORAGE_BOOKMARK) || 0);
  const button = $('#bookmarkButton');
  const go = $('#goBookmark');
  if (saved === activePage) {
    button.textContent = 'موضعك محفوظ ✓';
    button.classList.add('is-saved');
  } else {
    button.textContent = 'حفظ موضع القراءة';
    button.classList.remove('is-saved');
  }
  $('#bookmarkStatus').textContent = saved ? `آخر علامة: الصفحة ${toArabicDigits(saved)}` : 'احفظ موضعك لتعود إليه لاحقًا';
  go.hidden = !saved || saved === activePage;
}
function updateTheme(dark) {
  document.body.classList.toggle('dark', dark);
  localStorage.setItem(STORAGE_DARK, String(dark));
  const toggle = $('#themeToggle');
  toggle.textContent = dark ? '☀ الوضع النهاري' : '☾ الوضع الليلي';
  toggle.setAttribute('aria-pressed', String(dark));
}
function applyFontScale(value) {
  fontScale = Math.max(85, Math.min(140, Number(value) || 100));
  document.documentElement.style.setProperty('--quran-font-scale', `${fontScale / 100}`);
  localStorage.setItem(STORAGE_FONT, String(fontScale));
}

function searchQuran() {
  const input = $('#quranSearchInput');
  const results = $('#quranSearchResults');
  const status = $('#quranSearchStatus');
  const query = normalizeSearch(input.value);
  if (!query) { results.hidden = true; status.textContent = ''; const clear = $('#quranSearchClear'); if (clear) clear.hidden = true; return; }
  const matches = [];
  data.pages.forEach((page, index) => page.verses.forEach((verse) => {
    if (normalizeSearch(verse.text).includes(query) && matches.length < 20) {
      matches.push({ page: index + 1, verse });
    }
  }));
  status.textContent = matches.length ? `${matches.length} نتيجة — أول ٢٠ نتيجة` : 'لا توجد نتائج مطابقة';
  results.innerHTML = matches.map(({page, verse}) => {
    const name = surahName(verse.surah).replace(/^سُورَةُ\s*/u, '');
    return `<button type="button" class="quran-search-result" data-search-page="${page}" data-search-ayah="${verse.ayah}"><strong>سورة ${escapeHtml(name)} · الآية ${toArabicDigits(verse.ayah)} · الصفحة ${toArabicDigits(page)}</strong><span>${escapeHtml(verse.text)}</span></button>`;
  }).join('');
  results.hidden = false;
  const clear = $('#quranSearchClear');
  if (clear) clear.hidden = false;
}

async function boot() {
  updateTheme(localStorage.getItem(STORAGE_DARK) === 'true');
  applyFontScale(fontScale);
  try {
    const response = await fetch(DATA_URL, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
    if (data.totalPages !== TOTAL_PAGES || data.pages.length !== TOTAL_PAGES) throw new Error('بيانات الصفحات غير مكتملة');
    fillSurahSelect();
    goToPage(Number(localStorage.getItem(STORAGE_PAGE) || localStorage.getItem(STORAGE_BOOKMARK) || 1), false);
  } catch (error) {
    console.error('Quran text reader initialization failed:', error);
    $('#readerPages').innerHTML = '<div class="reader-error">تعذّر تحميل نص القرآن. حدّث الصفحة وحاول مرة أخرى.</div>';
  }
}

$('#previousPage').addEventListener('click', () => movePages(-1));
$('#nextPage').addEventListener('click', () => movePages(1));
$('#pageInput').addEventListener('change', (event) => goToPage(event.target.value));
$('#pageInput').addEventListener('keydown', (event) => { if (event.key === 'Enter') { goToPage(event.target.value); event.target.blur(); } });
$('#surahSelect').addEventListener('change', (event) => goToSurah(event.target.value));
$('#bookmarkButton').addEventListener('click', () => { localStorage.setItem(STORAGE_BOOKMARK, String(activePage)); updateBookmarkUI(); });
$('#goBookmark').addEventListener('click', () => goToPage(Number(localStorage.getItem(STORAGE_BOOKMARK) || 1)));
$('#themeToggle').addEventListener('click', () => updateTheme(!document.body.classList.contains('dark')));
$('#fontIncrease').addEventListener('click', () => applyFontScale(fontScale + 10));
$('#fontDecrease').addEventListener('click', () => applyFontScale(fontScale - 10));
$('#quranSearchButton').addEventListener('click', searchQuran);
$('#quranSearchClear').addEventListener('click', () => { $('#quranSearchInput').value = ''; $('#quranSearchResults').hidden = true; $('#quranSearchStatus').textContent = ''; $('#quranSearchClear').hidden = true; $('#quranSearchInput').focus(); });
$('#quranSearchInput').addEventListener('keydown', (event) => { if (event.key === 'Enter') searchQuran(); });
$('#quranSearchResults').addEventListener('click', (event) => { const button = event.target.closest('[data-search-page]'); if (button) { goToPage(button.dataset.searchPage); $('#quranSearchResults').hidden = true; } });

boot();
