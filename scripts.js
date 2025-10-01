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
  const Forms = {
    initContactForm(cfg){
      const form = document.getElementById(cfg.formId);
      const comments = document.querySelector(cfg.commentSelector);
      const counter = document.querySelector(cfg.counterSelector);
      const dropzone = document.getElementById(cfg.dropzoneId);
      const fileInput = document.getElementById(cfg.fileInputId);
      const fileNameEl = document.getElementById(cfg.fileNameId);
      const statusEl = document.getElementById(cfg.statusId);
      const timerEl = document.getElementById(cfg.timerId);
      const thankYou = document.getElementById(cfg.thankYouId);

      // Word limit
      const MAX_WORDS = 500;
      comments.addEventListener('input', () => {
        const words = countWords(comments.value);
        if (words > MAX_WORDS){
          // Trim to closest 500 words
          comments.value = comments.value.trim().split(/\s+/).slice(0, MAX_WORDS).join(' ');
        }
        const current = Math.min(words, MAX_WORDS);
        counter.textContent = `${current} / ${MAX_WORDS} words`;
      });

      // Drag & Drop
      initDropzone(dropzone, fileInput, fileNameEl);

      // Gentle countdown: 5 minutes
      let seconds = 5 * 60;
      const tick = () => {
        const m = String(Math.floor(seconds / 60)).padStart(2,'0');
        const s = String(seconds % 60).padStart(2,'0');
        timerEl.textContent = `Session timer: ${m}:${s}`;
        if (seconds > 0) seconds -= 1;
      };
      tick();
      setInterval(tick, 1000);

      // Submit handler
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        statusEl.textContent = 'Sending…';

        if (!window.FORM_ENDPOINT || !/^https?:\/\//.test(window.FORM_ENDPOINT)){
          statusEl.textContent = 'Form endpoint not configured. Please set FORM_ENDPOINT in config.js.';
          return;
        }

        try{
          const data = new FormData(form);
          // Add a subject or source tag for your inbox filter
          data.append('_subject', 'Diluted Stories · Contact form');

          const res = await fetch(window.FORM_ENDPOINT, {
            method: 'POST',
            body: data
          });

          if (res.ok){
            form.hidden = true;
            thankYou.hidden = false;
            statusEl.textContent = '';
          } else {
            statusEl.textContent = 'Something went wrong. Please try again later.';
          }
        }catch(err){
          console.error(err);
          statusEl.textContent = 'Network error. Please try again.';
        }
      });
    }
  };
  window.Forms = Forms; // export
})();
