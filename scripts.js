/* scripts.js
   - Theme toggle, text size, TTS
   - ArticleStore -> loads articles.json (single source of truth)
   - Unsplash URL normalizer
   - In-page preview modal
   - Contact form (Formspree, no uploads)
*/
(function(){
  const root = document.documentElement;

  /* THEME & TEXT SIZE & TTS */
  const themeToggle = () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('ds-theme', next);
    document.getElementById('themeToggle')?.setAttribute('aria-pressed', String(next === 'dark'));
  };
  const savedTheme = localStorage.getItem('ds-theme');
  if (savedTheme) root.setAttribute('data-theme', savedTheme);

  function changeFontScale(delta){
    const current = parseFloat(getComputedStyle(root).getPropertyValue('--fontScale')) || 1;
    const next = Math.min(1.4, Math.max(0.9, current + delta));
    root.style.setProperty('--fontScale', String(next));
  }

  const A11Y = {
    ttsEnabled:false, targetEl:null, utter:null,
    initTTSTarget(sel){ this.targetEl = document.querySelector(sel) || document.body; window.A11Y = A11Y; },
    toggle(){
      if(!('speechSynthesis' in window)) return alert('Text-to-speech not supported.');
      if (this.utter && speechSynthesis.speaking){ speechSynthesis.cancel(); this.utter=null; return; }
      this.utter = new SpeechSynthesisUtterance((this.targetEl||document.body).innerText);
      this.utter.rate = 1.0; speechSynthesis.speak(this.utter);
    }
  };
  window.A11Y = A11Y;

  window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('themeToggle')?.addEventListener('click', themeToggle);
    document.getElementById('textBigger')?.addEventListener('click', () => changeFontScale(+0.05));
    document.getElementById('textSmaller')?.addEventListener('click', () => changeFontScale(-0.05));
    document.getElementById('ttsToggle')?.addEventListener('click', () => A11Y.toggle());
  });

  /* UTIL: Unsplash normalizer */
  window.normalizeUnsplash = function(u){
    if (!u) return u;
    const m = u.match(/unsplash\.com\/photos\/(?:[\w-]*-)?([A-Za-z0-9_-]+)/i);
    return m && m[1] ? `https://source.unsplash.com/${m[1]}/1600x900` : u;
  };

  /* ArticleStore (single source of truth) */
  window.ArticleStore = (function(){
    const KEY = 'ds-articles-v1';
    async function load(){
      if (window.ARTICLES && Object.keys(window.ARTICLES).length) return window.ARTICLES;
      try{
        const res = await fetch('articles.json', { cache:'no-store' });
        const json = await res.json();
        const data = {};
        Object.entries(json).forEach(([id, a]) => { a.imgSrc = normalizeUnsplash(a.imgSrc); data[id] = a; });
        window.ARTICLES = data;
        localStorage.setItem(KEY, JSON.stringify(data));
        return data;
      }catch(e){
        const cached = localStorage.getItem(KEY);
        if (cached){ window.ARTICLES = JSON.parse(cached); return window.ARTICLES; }
        window.ARTICLES = {}; return window.ARTICLES;
      }
    }
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

  /* PREVIEW MODAL */
  (function(){
    const $ = (s)=>document.querySelector(s);
    let scale = 1, prevFocus = null;

    function openPreview(d){
      $('#articleTitle').textContent = d.title;
      $('#articleContent .article-meta').textContent = d.meta;
      const img = $('#articleContent .article-hero');
      img.alt = d.imgAlt; img.src = normalizeUnsplash(d.imgSrc);
      $('#articleContent .article-body').innerHTML = (d.body || []).join('');
      scale = 1; $('#articleContent .article-body').style.fontSize = '1rem';

      const modal = $('#articleModal'); modal.hidden = false;
      document.body.classList.add('modal-open');
      const panel = modal.querySelector('.ds-modal__panel'); panel.focus({ preventScroll:true });
      prevFocus = document.activeElement;

      document.getElementById('btnRead')?.addEventListener('click', () => A11Y.toggle());
      document.getElementById('btnAplus')?.addEventListener('click', () => { scale=Math.min(1.4, scale+0.05); $('#articleContent .article-body').style.fontSize=scale+'rem'; });
      document.getElementById('btnAminus')?.addEventListener('click', () => { scale=Math.max(0.9, scale-0.05); $('#articleContent .article-body').style.fontSize=scale+'rem'; });
    }
    function closePreview(){
      const modal = document.getElementById('articleModal');
      modal.hidden = true; document.body.classList.remove('modal-open'); speechSynthesis?.cancel?.();
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
      if (location.hash) history.pushState('', document.title, location.pathname + location.search);
    }

    document.addEventListener('click', async (e) => {
      const a = e.target.closest('a.card-link'); if (!a) return;
      const h = a.getAttribute('href') || ''; if (!h.startsWith('#')) return;
      e.preventDefault();
      const id = h.slice(1);
      await ArticleStore.load();
      const d = ArticleStore.get(id); if (d){ openPreview(d); history.pushState(null,'',h); }
    });

    document.getElementById('articleModal')?.addEventListener('click', (e) => {
      if (e.target.matches('[data-close-modal]') || e.target.classList.contains('ds-modal__scrim')) closePreview();
    });
    window.addEventListener('keydown', (e) => { if(e.key==='Escape' && !document.getElementById('articleModal').hidden) closePreview(); });

    if (location.hash) ArticleStore.load().then(() => {
      const d = ArticleStore.get(location.hash.slice(1)); if (d) openPreview(d);
    });
    window.addEventListener('hashchange', () => {
      const id = location.hash.slice(1);
      if (!id) return closePreview();
      ArticleStore.load().then(()=>{ const d = ArticleStore.get(id); if (d) openPreview(d); });
    });
  })();

  /* CONTACT FORM (Formspree, no uploads) */
  window.Forms = (function(){
    function countWords(str){ return (str.trim().match(/\S+/g) || []).length; }
    return {
      initContactForm(opts){
        const form     = document.getElementById(opts.formId);
        const comments = document.querySelector(opts.commentSelector);
        const counter  = document.querySelector(opts.counterSelector);
        const statusEl = document.getElementById(opts.statusId);
        const timerEl  = document.getElementById(opts.timerId);
        const thankYou = document.getElementById(opts.thankYouId);

        const MAX = 500;
        comments.addEventListener('input', () => {
          const n = Math.min(countWords(comments.value), MAX);
          if (n >= MAX) comments.value = comments.value.trim().split(/\s+/).slice(0, MAX).join(' ');
          counter.textContent = `${n} / ${MAX} words`;
        });

        let s = 5*60; const tick = () => {
          const m = String(Math.floor(s/60)).padStart(2,'0'), ss = String(s%60).padStart(2,'0');
          timerEl.textContent = `Session timer: ${m}:${ss}`; if (s>0) s--;
        }; tick(); setInterval(tick, 1000);

        form.addEventListener('submit', async (e) => {
          e.preventDefault(); statusEl.textContent = 'Sending…';
          if (!window.FORM_ENDPOINT) { statusEl.textContent = 'Form endpoint missing (config.js).'; return; }
          try{
            const data = new FormData(form);
            data.append('_subject', 'Diluted Stories · Contact form');
            const res = await fetch(window.FORM_ENDPOINT, {
              method: 'POST',
              body: data,
              headers: { 'Accept':'application/json' },
              mode: 'cors',
              redirect: 'follow'
            });
            if (res.ok){ form.hidden = true; thankYou.hidden = false; statusEl.textContent=''; }
            else{
              const j = await res.json().catch(()=>null);
              statusEl.textContent = (j && j.errors && j.errors[0]?.message) || 'Submission failed. Please try again.';
            }
          }catch(err){ console.error(err); statusEl.textContent = 'Network error. Please try again.'; }
        });
      }
    };
  })();
})();
