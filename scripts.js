/* scripts.js
   Shared behaviour: theme toggle, text size, text-to-speech (TTS), word limiter,
   drag & drop PDF, gentle countdown timer, and form submission via FORM_ENDPOINT.
   Keep things framework-free for GitHub Pages.
*/

(function(){
  const root = document.documentElement;

  /* THEME */
  const themeToggle = () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('ds-theme', next);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.setAttribute('aria-pressed', String(next === 'dark'));
  };
  const savedTheme = localStorage.getItem('ds-theme');
  if (savedTheme) root.setAttribute('data-theme', savedTheme);

  /* TEXT SIZE */
  function changeFontScale(delta){
    const current = parseFloat(getComputedStyle(root).getPropertyValue('--fontScale')) || 1;
    const next = Math.min(1.4, Math.max(0.9, current + delta));
    root.style.setProperty('--fontScale', String(next));
  }

  /* TTS (Web Speech API) */
  const A11Y = {
    ttsEnabled: false,
    ttsUtterance: null,
    targetEl: null,
    initTTSTarget(selector){
      this.targetEl = document.querySelector(selector) || document.body;
    },
    toggleTTS(){
      if (!('speechSynthesis' in window)) {
        alert('Text-to-speech is not supported by your browser.');
        return;
      }
      this.ttsEnabled = !this.ttsEnabled;
      const btn = document.getElementById('ttsToggle');
      if (btn) btn.setAttribute('aria-pressed', String(this.ttsEnabled));
      if (this.ttsEnabled) this.start();
      else this.stop();
    },
    start(){
      this.stop(); // stop if already speaking
      const text = this.targetEl ? this.targetEl.innerText : document.body.innerText;
      this.ttsUtterance = new SpeechSynthesisUtterance(text);
      this.ttsUtterance.rate = 1.0;
      window.speechSynthesis.speak(this.ttsUtterance);
    },
    stop(){
      if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
      this.ttsUtterance = null;
    }
  };
  window.A11Y = A11Y; // export

  /* WIRE HEADER CONTROLS */
  window.addEventListener('DOMContentLoaded', () => {
    const btnTheme = document.getElementById('themeToggle');
    const btnPlus = document.getElementById('textBigger');
    const btnMinus = document.getElementById('textSmaller');
    const btnTTS = document.getElementById('ttsToggle');

    if (btnTheme) btnTheme.addEventListener('click', themeToggle);
    if (btnPlus) btnPlus.addEventListener('click', () => changeFontScale(+0.05));
    if (btnMinus) btnMinus.addEventListener('click', () => changeFontScale(-0.05));
    if (btnTTS) btnTTS.addEventListener('click', () => A11Y.toggleTTS());
  });

  /* WORD LIMITER (500 words) */
  function countWords(str){
    return (str.trim().match(/\S+/g) || []).length;
  }

  /* DRAG & DROP */
  function initDropzone(dropzone, fileInput, fileNameEl){
    const openPicker = () => fileInput.click();
    const showFile = () => {
      const f = fileInput.files && fileInput.files[0];
      fileNameEl.textContent = f ? `Attached: ${f.name}` : '';
    };
    ['click','keydown'].forEach(ev => {
      dropzone.addEventListener(ev, e => {
        if (ev === 'click' || (ev === 'keydown' && (e.key === 'Enter' || e.key === ' '))){
          e.preventDefault(); openPicker();
        }
      });
    });
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault(); dropzone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files && files[0] && files[0].type === 'application/pdf'){
        fileInput.files = files;
        showFile();
      } else {
        alert('Please drop a PDF file.');
      }
    });
    fileInput.addEventListener('change', showFile);
  }

  /* FORM MODULE */
 /* ===== Contact form: Formspree + drag&drop PDF ===== */
(function(){
  function $(s){ return document.querySelector(s); }
  function countWords(str){ return (str.trim().match(/\S+/g) || []).length; }

  function initDropzone(dropzone, fileInput, fileNameEl){
    const openPicker = () => fileInput.click();
    const showFile   = () => {
      const f = fileInput.files && fileInput.files[0];
      fileNameEl.textContent = f ? `Attached: ${f.name}` : '';
    };

    // Click or keyboard activates the file picker
    dropzone.addEventListener('click', openPicker);
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); }
    });

    // Drag & drop
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault(); dropzone.classList.remove('dragover');
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      if (f.type !== 'application/pdf') { alert('Please select a PDF.'); return; }
      fileInput.files = e.dataTransfer.files;
      showFile();
    });

    fileInput.addEventListener('change', showFile);
  }

  window.Forms = {
    initContactForm(opts){
      const form       = document.getElementById(opts.formId);
      const comments   = document.querySelector(opts.commentSelector);
      const counter    = document.querySelector(opts.counterSelector);
      const dropzone   = document.getElementById(opts.dropzoneId);
      const fileInput  = document.getElementById(opts.fileInputId);
      const fileNameEl = document.getElementById(opts.fileNameId);
      const statusEl   = document.getElementById(opts.statusId);
      const timerEl    = document.getElementById(opts.timerId);
      const thankYou   = document.getElementById(opts.thankYouId);

      // word limit
      const MAX = 500;
      comments.addEventListener('input', () => {
        const n = Math.min(countWords(comments.value), MAX);
        if (n >= MAX) comments.value = comments.value.trim().split(/\s+/).slice(0, MAX).join(' ');
        counter.textContent = `${n} / ${MAX} words`;
      });

      // dropzone
      initDropzone(dropzone, fileInput, fileNameEl);

      // gentle timer (5m)
      let s = 5*60; const tick = () => {
        const m = String(Math.floor(s/60)).padStart(2,'0'), ss = String(s%60).padStart(2,'0');
        timerEl.textContent = `Session timer: ${m}:${ss}`; if (s>0) s--;
      }; tick(); setInterval(tick, 1000);

      // submit
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        statusEl.textContent = 'Sending…';

        if (!window.FORM_ENDPOINT) {
          statusEl.textContent = 'Form endpoint not configured (config.js).';
          return;
        }

        try{
          const data = new FormData(form);
          data.append('_subject', 'Diluted Stories · Contact form');

          // IMPORTANT for Formspree: Accept JSON so they avoid HTML redirect
          const res = await fetch(window.FORM_ENDPOINT, {
            method: 'POST',
            body: data,
            headers: { 'Accept': 'application/json' },
            mode: 'cors',            // allow cross-origin
            redirect: 'follow'       // follow if needed
          });

          if (res.ok){
            form.hidden = true;
            thankYou.hidden = false;
            statusEl.textContent = '';
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
})();
