/* script.js — KEYSKILL main logic */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const state = {
    duration: 60,
    remaining: 60,
    started: false,
    text: "",
    lang: "english",
    typedChars: 0,
    correctChars: 0,
    errors: 0,
    timerId: null
  };

  // Helper: compute WPM and accuracy
  function computeStats(elapsedSeconds) {
    const minutes = Math.max(elapsedSeconds, 1) / 60;
    const wpm = Math.round((state.correctChars / 5) / minutes);
    const accuracy = state.typedChars > 0 ?
      Math.round((state.correctChars / state.typedChars) * 100) : 100;
    return { wpm, accuracy };
  }

  // Save test result to localStorage
  function saveResult(result) {
    let history = JSON.parse(localStorage.getItem("typingHistory") || "[]");
    history.push(result);
    localStorage.setItem("typingHistory", JSON.stringify(history));
  }

  // Pick random text
  function pickText() {
    const pool = state.lang === "hindi" ? (window.hindiTexts || []) : (window.englishTexts || []);
    state.text = pool.length ? pool[Math.floor(Math.random() * pool.length)] : "No text available.";
    renderPassage($("#text-display"), state.text, 0);
  }

  // Render passage
  function renderPassage(target, text, cursorIndex = 0) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < text.length; i++) {
      const span = document.createElement("span");
      span.textContent = text[i];
      span.className = "char";
      if (i === cursorIndex) span.classList.add("current");
      frag.appendChild(span);
    }
    target.replaceChildren(frag);
  }

  // Test page init
  function initTestPage() {
    const textDisplay = $("#text-display");
    const textInput = $("#text-input");
    const wpmEl = $("#wpm");
    const accEl = $("#accuracy");
    const errEl = $("#errors");
    const timerEl = $("#timer");
    const btnStart = $("#btnStart");
    const btnReset = $("#btnReset");
    const langSel = $("#language");
    const durSel = $("#duration");

    function reset() {
      state.lang = langSel.value;
      state.duration = parseInt(durSel.value, 10) || 60;
      state.remaining = state.duration;
      state.started = false;
      state.typedChars = 0;
      state.correctChars = 0;
      state.errors = 0;
      clearInterval(state.timerId);

      textInput.value = "";
      textInput.disabled = true;
      wpmEl.textContent = "0";
      accEl.textContent = "100%";
      errEl.textContent = "0";
      timerEl.textContent = state.duration;

      btnReset.disabled = true;
      btnStart.disabled = false;

      pickText();
    }

    function start() {
      if (state.started) return;
      reset();
      state.started = true;
      textInput.disabled = false;
      textInput.focus();
      btnStart.disabled = true;
      btnReset.disabled = false;

      const t0 = Date.now();
      state.timerId = setInterval(() => {
        state.remaining = Math.max(state.duration - Math.floor((Date.now() - t0) / 1000), 0);
        timerEl.textContent = state.remaining;

        const elapsed = state.duration - state.remaining;
        const { wpm, accuracy } = computeStats(elapsed);
        wpmEl.textContent = wpm;
        accEl.textContent = `${accuracy}%`;
        errEl.textContent = state.errors;

        if (state.remaining <= 0) end();
      }, 200);
    }

    function end() {
      clearInterval(state.timerId);
      state.started = false;
      textInput.disabled = true;
      btnStart.disabled = false;

      // Save result on test end
      const result = {
        date: new Date().toLocaleString(),
        language: state.lang,
        duration: state.duration,
        wpm: state.correctChars ? Math.round(state.correctChars / 5 / (state.duration / 60)) : 0,
        accuracy: state.typedChars ? Math.round(state.correctChars / state.typedChars * 100) : 100,
        errors: state.errors,
      };
      saveResult(result);
    }

    textInput.addEventListener("input", () => {
      if (!state.started) return;
      const input = textInput.value;
      state.typedChars = input.length;
      state.correctChars = 0;
      state.errors = 0;

      const chars = textDisplay.querySelectorAll(".char");
      const compareLen = Math.min(input.length, state.text.length);

      for (let i = 0; i < state.text.length; i++) {
        const span = chars[i];
        if (!span) break;
        span.classList.remove("correct", "incorrect", "current");
        if (i < compareLen) {
          if (input[i] === state.text[i]) {
            span.classList.add("correct");
            state.correctChars++;
          } else {
            span.classList.add("incorrect");
            state.errors++;
          }
        }
      }

      const cursorIndex = Math.min(input.length, state.text.length - 1);
      if (chars[cursorIndex]) chars[cursorIndex].classList.add("current");

      if (input.length >= state.text.length) end();
    });

    btnStart.addEventListener("click", start);
    btnReset.addEventListener("click", reset);

    // New Test button handler
    const btnNewTest = $("#btnNewTest");
    if (btnNewTest) {
      btnNewTest.addEventListener("click", () => {
        reset();
      });
    }

    reset();
  }

  // New function to render progress chart using Chart.js
  function renderProgressChart() {
    const history = JSON.parse(localStorage.getItem("typingHistory")) || [];
    if (history.length === 0) return;

    const dates = history.map(item => item.date);
    const wpmData = history.map(item => item.wpm);

    const ctx = document.getElementById('progressChart')?.getContext('2d');
    if (!ctx) return;

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'WPM',
          data: wpmData,
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Typing Progress Over Time'
          }
        }
      }
    });
  }

  // Router
  document.addEventListener("DOMContentLoaded", () => {
    if ($("#text-display")) initTestPage();
    renderProgressChart(); // call chart render on DOM load
  });
})();
