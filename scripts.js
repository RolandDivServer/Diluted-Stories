/* scripts.js
   Site-wide behaviour:
   - Theme toggle, text size, TTS
   - Central ARTICLES dataset (used by preview + articles.html)
   - In-page preview modal (locks background, scrolls inside)
   - Contact form submit (Formspree), 500-word limit, timer
*/

(function(){
  const root = document.documentElement;

  /* ================= THEME & TEXT SIZE ================= */
  const themeToggle = () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('ds-theme', next);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.setAttribute('aria-pressed', String(next === 'dark'));
  };
  const savedTheme = localStorage.getItem('ds-theme');
  if (savedTheme) root.setAttribute('data-theme', savedTheme);

  function changeFontScale(delta){
    const current = parseFloat(getComputedStyle(root).getPropertyValue('--fontScale')) || 1;
    const next = Math.min(1.4, Math.max(0.9, current + delta));
    root.style.setProperty('--fontScale', String(next));
  }

  const A11Y = {
    ttsEnabled: false,
    ttsUtterance: null,
    targetEl: null,
    initTTSTarget(selector){
      this.targetEl = document.querySelector(selector) || document.body;
      window.A11Y = A11Y;
    },
    toggleTTS(){
      if (!('speechSynthesis' in window)) { alert('Text-to-speech not supported.'); return; }
      this.ttsEnabled = !this.ttsEnabled;
      const btn = document.getElementById('ttsToggle');
      if (btn) btn.setAttribute('aria-pressed', String(this.ttsEnabled));
      if (this.ttsEnabled) this.start(); else this.stop();
    },
    start(){
      this.stop();
      const text = this.targetEl ? this.targetEl.innerText : document.body.innerText;
      this.ttsUtterance = new SpeechSynthesisUtterance(text);
      this.ttsUtterance.rate = 1.0;
      window.speechSynthesis.speak(this.ttsUtterance);
    },
    stop(){ if (window.speechSynthesis.speaking) window.speechSynthesis.cancel(); this.ttsUtterance = null; }
  };
  window.A11Y = A11Y;

  window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('themeToggle')?.addEventListener('click', themeToggle);
    document.getElementById('textBigger')?.addEventListener('click', () => changeFontScale(+0.05));
    document.getElementById('textSmaller')?.addEventListener('click', () => changeFontScale(-0.05));
    document.getElementById('ttsToggle')?.addEventListener('click', () => A11Y.toggleTTS());
  });

/* ===== ONE SOURCE OF TRUTH: ArticleStore ===== */
(function(){
  // Normalize Unsplash page URLs to reliable image URLs
  window.normalizeUnsplash = function(u){
    if (!u) return u;
    const m = u.match(/unsplash\.com\/photos\/(?:[\w-]*-)?([A-Za-z0-9_-]+)/i);
    return m && m[1] ? `https://source.unsplash.com/${m[1]}/1600x900` : u;
  };

  window.ArticleStore = (function(){
    const KEY = 'ds-articles-v1';

    async function load(){
      if (window.ARTICLES && Object.keys(window.ARTICLES).length) return window.ARTICLES;
      try{
        const res = await fetch('articles.json', { cache: 'no-store' });
        const json = await res.json();
        const data = {};
        Object.entries(json).forEach(([id, a]) => {
          a.imgSrc = window.normalizeUnsplash(a.imgSrc);
          data[id] = a;
        });
        window.ARTICLES = data;
        localStorage.setItem(KEY, JSON.stringify(data));
        return data;
      }catch(err){
        // Fallback: last good copy
        const cached = localStorage.getItem(KEY);
        if (cached){
          window.ARTICLES = JSON.parse(cached);
          return window.ARTICLES;
        }
        window.ARTICLES = {}; // final fallback
        return window.ARTICLES;
      }
    }
     
<script>
  ArticleStore.load().then(() => {
    // Example: render all (or pick a subset/ordering)
    ArticleStore.renderGrid('#mustReadGrid');
  });
</script>
     
    function renderGrid(container){
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el) return;
      const data = window.ARTICLES || {};
      el.innerHTML = '';
      Object.entries(data).forEach(([id, a]) => {
        el.insertAdjacentHTML('beforeend', `
          <article class="story-card">
            <a class="card-link" href="#${id}" aria-label="${a.title}"></a>
            <img loading="lazy" alt="${a.imgAlt}" src="${a.imgSrc}">
            <div class="card-overlay">
              <span class="badge">ARTICLES</span>
              <h3 class="card-title">${a.title}</h3>
              <p class="card-excerpt">${a.excerpt || ''}</p>
              <div class="byline">${a.meta}</div>
            </div>
          </article>
        `);
      });
    }

    function get(id){ return (window.ARTICLES || {})[id] || null; }

    return { load, renderGrid, get };
  })();
})();

  /* ================= PREVIEW MODAL ================= */
  (function(){
    function $(s){ return document.querySelector(s); }
    const TTS = { on:false, u:null,
      toggle(text){
        if(!('speechSynthesis' in window)){ alert('Text-to-speech not supported.'); return; }
        if(this.on){ speechSynthesis.cancel(); this.on=false; return; }
        this.u = new SpeechSynthesisUtterance(text); this.u.rate=1.0;
        speechSynthesis.speak(this.u); this.on=true; this.u.onend=()=>this.on=false;
      },
      stop(){ if(this.on){ speechSynthesis.cancel(); this.on=false; } }
    };

    let scale = 1, prevFocus = null;

    function openPreview(d){
  $('#articleTitle').textContent = d.title;
  $('#articleContent .article-meta').textContent = d.meta;
  const img = $('#articleContent .article-hero');
  img.alt = d.imgAlt; 
  img.src = window.normalizeUnsplash(d.imgSrc);
  $('#articleContent .article-body').innerHTML = (d.body || []).join('');
  // ...rest (scroll lock, TTS buttons, etc.)
}
    function close(){
      const modal = document.getElementById('articleModal');
      modal.hidden = true; document.body.classList.remove('modal-open'); TTS.stop();
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
      if (location.hash) history.pushState('', document.title, location.pathname + location.search);
    }

    // Intercept any card-link with hash
    // Intercept any card-link with a hash
document.addEventListener('click', async (e) => {
  const a = e.target.closest('a.card-link'); if (!a) return;
  const h = a.getAttribute('href') || ''; if (!h.startsWith('#')) return;
  e.preventDefault();
  const id = h.slice(1);
  await ArticleStore.load();               // <-- ensure data is loaded
  const data = ArticleStore.get(id);
  if (!data) return;

  // Open modal with data
  openPreview(data);                       // change your open() to accept data object
  history.pushState(null, '', h);
});
    // Deep-link on load / hashchange
if (location.hash) {
  const initial = location.hash.slice(1);
  ArticleStore.load().then(() => {
    const d = ArticleStore.get(initial);
    if (d) openPreview(d);
  });
}
window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (!id) return closePreview();
  ArticleStore.load().then(() => {
    const d = ArticleStore.get(id);
    if (d) openPreview(d);
  });
});
  /* ================= CONTACT FORM (NO UPLOADS) ================= */
  (function(){
    function $(s){ return document.querySelector(s); }
    function countWords(str){ return (str.trim().match(/\S+/g) || []).length; }

    const Forms = {
      initContactForm(opts){
        const form     = document.getElementById(opts.formId);
        const comments = document.querySelector(opts.commentSelector);
        const counter  = document.querySelector(opts.counterSelector);
        const statusEl = document.getElementById(opts.statusId);
        const timerEl  = document.getElementById(opts.timerId);
        const thankYou = document.getElementById(opts.thankYouId);

        // Word limit
        const MAX = 500;
        comments.addEventListener('input', () => {
          const n = Math.min(countWords(comments.value), MAX);
          if (n >= MAX) comments.value = comments.value.trim().split(/\s+/).slice(0, MAX).join(' ');
          counter.textContent = `${n} / ${MAX} words`;
        });

        // Gentle timer 5m
        let s = 5*60; const tick = () => {
          const m = String(Math.floor(s/60)).padStart(2,'0'), ss = String(s%60).padStart(2,'0');
          timerEl.textContent = `Session timer: ${m}:${ss}`; if (s>0) s--;
        }; tick(); setInterval(tick, 1000);

        form.addEventListener('submit', async (e) => {
          e.preventDefault(); statusEl.textContent = 'Sending…';
          if (!window.FORM_ENDPOINT) { statusEl.textContent = 'Form endpoint missing (config.js).'; return; }

          try{
            // Build form data (no file uploads)
            const data = new FormData(form);
            data.append('_subject', 'Diluted Stories · Contact form');

            const res = await fetch(window.FORM_ENDPOINT, {
              method: 'POST',
              body: data,
              headers: { 'Accept': 'application/json' },
              mode: 'cors',
              redirect: 'follow'
            });

            if (res.ok){
              form.hidden = true;
              thankYou.hidden = false;
              statusEl.textContent = '';   // success message is in #thankYou
            } else {
              const j = await res.json().catch(()=>null);
              statusEl.textContent = (j && j.errors && j.errors[0]?.message) || 'Submission failed. Please try again.';
            }
          }catch(err){
            console.error(err);
            statusEl.textContent = 'Network error. Please try again.';
          }
        });
      }
    };
    window.Forms = Forms;
  })();

})();
