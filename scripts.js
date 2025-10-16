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

  /* ================= CENTRAL ARTICLES DATA ================= */
  // One source of truth used by index and articles pages.
  window.ARTICLES = {
    'right-to-repair': {
      title: 'What is the Right to Repair movement?',
      meta: 'By R. Correia · 8 min read',
      imgAlt: 'Phone repair on a lit workbench',
      imgSrc: 'https://source.unsplash.com/PZLgTUAhxMM/1600x900',
      excerpt: 'How targeted legislation can curb e-waste and extend device lifespans.',
      body: [
        '<p>The Right to Repair movement argues that consumers and independent repairers should have practical access to parts, tools, manuals and diagnostics needed to fix modern devices.</p>',
        '<p>Supporters say this extends product lifespans, cuts e-waste and lowers costs while keeping local repair economies alive.</p>',
        '<h3>Why it matters</h3>',
        '<ul><li>Less e-waste → lower environmental impact.</li><li>Cheaper fixes and longer device lifespans.</li><li>More competition and innovation in repair services.</li></ul>',
        '<p>Policy frameworks differ by region, but the direction is clear: repair should be a right, not a privilege.</p>'
      ]
    },
    'cost-of-betting': {
      title: 'The cost of betting against the stock market',
      meta: 'By R. Correia · 6 min read',
      imgAlt: 'Red stock chart on a trading screen',
      imgSrc: 'https://images.unsplash.com/photo-1549421263-3c8b5f69f4c1?auto=format&fit=crop&w=1600&q=80',
      excerpt: 'Investigating why 84% of CFD users lose money.',
      body: [
        '<p>Shorting looks attractive during drawdowns, but indices have an upward drift and compounding works against shorts.</p>',
        '<h3>Why most retail shorts lose</h3>',
        '<ul><li>Baseline market drift is up; timing has to be perfect.</li><li>Volatility spikes and margin calls force exits early.</li><li>Spreads, fees and financing erode returns quietly.</li></ul>',
        '<p>For most investors, risk sizing and diversification beat outright directional shorts.</p>'
      ]
    },
    'retail-style': {
      title: 'Quiet luxury & heritage retail',
      meta: 'By R. Correia · 6 min read',
      imgAlt: 'Refined boutique aesthetic',
      imgSrc: 'https://images.unsplash.com/photo-1520975922323-364e138278bd?auto=format&fit=crop&w=1600&q=80',
      excerpt: 'How restrained aesthetics keep legacy houses resilient.',
      body: [
        '<p>Quiet luxury values craft over noise: natural fibres, hand-finished details, muted palettes. Heritage retail survives slowdowns by leaning into those values while updating formats and service.</p>',
        '<h3>Playbook</h3>',
        '<ul><li><strong>Edit over excess:</strong> tighter assortments and seasonal capsules.</li><li><strong>Service as moat:</strong> alterations, repair and clienteling.</li><li><strong>Right-sized stores:</strong> smaller footprints with better product storytelling.</li><li><strong>Digital craft:</strong> calm UX, fast pages, clear imagery.</li></ul>',
        '<p>The mix of restraint and service builds trust — and keeps legacy houses resilient when footfall tightens.</p>'
      ]
    }
  };

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

    function open(id){
      const d = window.ARTICLES[id]; if(!d) return;
      $('#articleTitle').textContent = d.title;
      $('#articleContent .article-meta').textContent = d.meta;
      const img = $('#articleContent .article-hero'); img.alt = d.imgAlt; img.src = d.imgSrc;
      $('#articleContent .article-body').innerHTML = (d.body||[]).join('');
      scale = 1; $('#articleContent .article-body').style.fontSize = '1rem';

      const modal = $('#articleModal'); modal.hidden = false;
      document.body.classList.add('modal-open'); // lock background scroll
      const panel = modal.querySelector('.ds-modal__panel'); panel.focus({ preventScroll:true });
      prevFocus = document.activeElement;

      document.getElementById('btnRead')?.addEventListener('click', () => TTS.toggle($('#articleContent').innerText));
      document.getElementById('btnAplus')?.addEventListener('click', () => { scale=Math.min(1.4, scale+0.05); $('#articleContent .article-body').style.fontSize=scale+'rem'; });
      document.getElementById('btnAminus')?.addEventListener('click', () => { scale=Math.max(0.9, scale-0.05); $('#articleContent .article-body').style.fontSize=scale+'rem'; });
    }
    function close(){
      const modal = document.getElementById('articleModal');
      modal.hidden = true; document.body.classList.remove('modal-open'); TTS.stop();
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
      if (location.hash) history.pushState('', document.title, location.pathname + location.search);
    }

    // Intercept any card-link with hash
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a.card-link'); if(!a) return;
      const h = a.getAttribute('href') || ''; if (!h.startsWith('#')) return;
      e.preventDefault(); const id = h.slice(1);
      if (window.ARTICLES[id]) { open(id); history.pushState(null,'',h); }
    });

    document.getElementById('articleModal')?.addEventListener('click', (e) => {
      if (e.target.matches('[data-close-modal]') || e.target.classList.contains('ds-modal__scrim')) close();
    });
    window.addEventListener('keydown', (e) => { if(e.key==='Escape' && !document.getElementById('articleModal').hidden) close(); });

    // Deep-link
    if (location.hash) window.requestAnimationFrame(() => {
      const id = location.hash.slice(1);
      if (window.ARTICLES[id]) open(id);
    });
    window.addEventListener('hashchange', () => {
      const id = location.hash.slice(1);
      if (!id) return close();
      if (window.ARTICLES[id]) open(id);
    });
  })();

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
