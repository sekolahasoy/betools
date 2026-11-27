// ==UserScript==
// @name         Essay Grader Floating Assistant
// @namespace    essay-grader.local
// @version      1.7.0
// @description  Floating grading assistant for essay score fields (answer under name, per-question settings, rounding).
// @match        *://cbt.smkdiponegorobanyuputih.sch.id/*
// @run-at       document-idle
// @noframes
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(() => {
  "use strict";

  // Prevent double injection.
  if (document.getElementById("essay-grader-panel")) return;

  const PANEL_CSS = `
#essay-grader-panel {
  position: fixed;
  top: 80px;
  right: 24px;
  width: 340px;
  z-index: 2147483647;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
  color: #172033;
  background: #ffffff;
  border: 1px solid #d9dee8;
  border-radius: 14px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, .18);
  overflow: hidden;
  user-select: none;
}

#essay-grader-panel * {
  box-sizing: border-box;
}

#essay-grader-panel .eg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 15px;
  color: #fff;
  background: #202938;
  cursor: move;
}

#essay-grader-panel .eg-title {
  font-size: 16px;
  font-weight: 700;
}

#essay-grader-panel .eg-subtitle {
  margin-top: 2px;
  font-size: 11px;
  opacity: .72;
}

#essay-grader-panel .eg-collapse {
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  color: #fff;
  background: rgba(255,255,255,.12);
  font-size: 20px;
  line-height: 30px;
  cursor: pointer;
}

#essay-grader-panel .eg-body {
  padding: 14px;
}

#essay-grader-panel .eg-label,
#essay-grader-panel .eg-section-title {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #667085;
  text-transform: uppercase;
  letter-spacing: .05em;
}

#essay-grader-panel .eg-question,
#essay-grader-panel .eg-fields input {
  width: 100%;
  height: 38px;
  border: 1px solid #cfd5df;
  border-radius: 8px;
  padding: 0 10px;
  background: #fff;
  color: #172033;
  font-size: 14px;
  outline: none;
}

#essay-grader-panel .eg-question:focus,
#essay-grader-panel .eg-fields input:focus {
  border-color: #4f7cff;
  box-shadow: 0 0 0 3px rgba(79,124,255,.12);
}

#essay-grader-panel .eg-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;
}

#essay-grader-panel .eg-fields label span {
  display: block;
  margin-bottom: 5px;
  font-size: 11px;
  color: #667085;
}

#essay-grader-panel .eg-divider {
  height: 1px;
  margin: 14px 0;
  background: #e6e9ef;
}

#essay-grader-panel .eg-score-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
}

#essay-grader-panel .eg-score-button {
  min-height: 58px;
  border: 1px solid #d4d9e2;
  border-radius: 9px;
  padding: 7px 4px;
  background: #f8f9fb;
  color: #172033;
  cursor: pointer;
  transition: transform .08s ease, background .08s ease, border-color .08s ease;
}

#essay-grader-panel .eg-score-button:hover {
  background: #eef3ff;
  border-color: #8ca8ff;
}

#essay-grader-panel .eg-score-button:active {
  transform: scale(.96);
}

#essay-grader-panel .eg-score-button strong {
  display: block;
  font-size: 18px;
  line-height: 22px;
}

#essay-grader-panel .eg-score-button span {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  color: #667085;
}

#essay-grader-panel .eg-current {
  margin-top: 13px;
  padding: 11px;
  border-radius: 9px;
  background: #f4f6f9;
}

#essay-grader-panel .eg-student-count {
  font-size: 10px;
  font-weight: 700;
  color: #667085;
  text-transform: uppercase;
  letter-spacing: .04em;
}

#essay-grader-panel .eg-student-name {
  margin-top: 4px;
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}

#essay-grader-panel .eg-last-score {
  margin-top: 4px;
  font-size: 11px;
  color: #667085;
}

#essay-grader-panel .eg-status {
  min-height: 18px;
  margin-top: 10px;
  font-size: 11px;
  color: #257942;
}

#essay-grader-panel .eg-status.error {
  color: #b42318;
}

#essay-grader-panel .eg-help {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
  font-size: 10px;
  color: #98a2b3;
}

#essay-grader-panel.collapsed {
  width: 190px;
}

#essay-grader-panel.collapsed .eg-body {
  display: none;
}

#essay-grader-panel.dragging {
  opacity: .94;
  cursor: grabbing;
}

@media (max-width: 600px) {
  #essay-grader-panel {
    top: 10px;
    right: 10px;
    width: 280px;
  }
}

#essay-grader-panel .eg-debug {
  margin-top: 4px;
  font-size: 10px;
  color: #98a2b3;
}

#essay-grader-panel .eg-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  margin-top: 10px;
}

#essay-grader-panel .eg-nav button {
  height: 34px;
  border: 1px solid #d4d9e2;
  border-radius: 8px;
  background: #f8f9fb;
  color: #172033;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

#essay-grader-panel .eg-nav button:hover {
  background: #eef3ff;
  border-color: #8ca8ff;
}

#essay-grader-panel .eg-nav button:active {
  transform: scale(.97);
}

/* v1.6: student's answer shown under the name */
#essay-grader-panel .eg-answer {
  margin-top: 8px;
  padding: 9px 10px;
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid #e0e4ec;
  border-radius: 8px;
  background: #fff;
  color: #172033;
  font-size: 13px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
  cursor: text;
}

#essay-grader-panel .eg-answer[hidden] {
  display: none;
}

#essay-grader-panel .eg-answer.empty {
  color: #98a2b3;
  font-style: italic;
}

/* v1.7: tabs + settings */
#essay-grader-panel .eg-body {
  max-height: calc(100vh - 170px);
  overflow-y: auto;
}

#essay-grader-panel .eg-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-bottom: 12px;
  padding: 3px;
  border-radius: 9px;
  background: #eef0f4;
}

#essay-grader-panel .eg-tabs button {
  height: 30px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #667085;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

#essay-grader-panel .eg-tabs button.active {
  background: #fff;
  color: #172033;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .12);
}

#essay-grader-panel .eg-tab[hidden] {
  display: none;
}

#essay-grader-panel .eg-select {
  width: 100%;
  height: 38px;
  border: 1px solid #cfd5df;
  border-radius: 8px;
  padding: 0 10px;
  background: #fff;
  color: #172033;
  font-size: 14px;
  outline: none;
}

#essay-grader-panel .eg-select:focus {
  border-color: #4f7cff;
  box-shadow: 0 0 0 3px rgba(79,124,255,.12);
}

#essay-grader-panel .eg-cfg-line {
  margin-top: 6px;
  font-size: 11px;
  color: #667085;
}

#essay-grader-panel .eg-qrow {
  display: grid;
  grid-template-columns: 36px 1fr 1fr;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}

#essay-grader-panel .eg-qhead {
  font-size: 11px;
  color: #667085;
}

#essay-grader-panel .eg-qrows {
  max-height: 220px;
  overflow-y: auto;
  padding-right: 2px;
}

#essay-grader-panel .eg-qno {
  font-size: 13px;
  font-weight: 700;
  color: #172033;
}

#essay-grader-panel .eg-qrow input,
#essay-grader-panel .eg-grace {
  width: 100%;
  height: 32px;
  border: 1px solid #cfd5df;
  border-radius: 8px;
  padding: 0 8px;
  background: #fff;
  color: #172033;
  font-size: 13px;
  outline: none;
  user-select: text;
}

#essay-grader-panel .eg-qrow input:focus,
#essay-grader-panel .eg-grace:focus {
  border-color: #4f7cff;
  box-shadow: 0 0 0 3px rgba(79,124,255,.12);
}

#essay-grader-panel .eg-check {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: #172033;
  cursor: pointer;
}

#essay-grader-panel .eg-check input {
  width: 16px;
  height: 16px;
  margin: 0;
}

#essay-grader-panel .eg-nav-single {
  grid-template-columns: 1fr;
}

#essay-grader-panel .eg-reset {
  color: #b42318;
}
`;

  function injectCSS(text) {
    if (typeof GM_addStyle === "function") {
      GM_addStyle(text);
    } else {
      const style = document.createElement("style");
      style.textContent = text;
      (document.head || document.documentElement).appendChild(style);
    }
  }
  injectCSS(PANEL_CSS);

  const LOG = (...a) => console.log("[EssayGrader]", ...a);

  const DEFAULTS = [
    { weight: 10, items: 5 },
    { weight: 10, items: 5 },
    { weight: 10, items: 5 },
    { weight: 10, items: 5 },
    { weight: 10, items: 5 },
    { weight: 10, items: 2 },
    { weight: 10, items: 2 },
    { weight: 10, items: 2 },
    { weight: 10, items: 2 },
    { weight: 10, items: 2 }
  ];

  const DEFAULT_SETTINGS = {
    followPageWeight: true, // page's "Bobot maksimal" overrides the weight
    roundStep: 0.5,         // round scores UP to this step (0 = no rounding)
    grace: 1                // points given for 0 correct items (0 = none)
  };
  const ROUND_STEPS = [0, 0.25, 0.5, 1];

  const state = {
    question: 1,
    configs: DEFAULTS.map(x => ({ ...x })),
    currentInput: null,
    currentIndex: 0,
    inputs: [],
    panel: null,
    statusTimer: null,
    pageInfo: { question: null, weight: null },
    lastPageQuestion: null,
    tab: "grade",
    settings: { ...DEFAULT_SETTINGS }
  };

  const STORAGE_KEY = "essayGraderSettings";

  // ------------------------------------------------------------------
  // Settings
  // ------------------------------------------------------------------
  function sanitizeSettings(s) {
    s = s || {};
    const step = Number(s.roundStep);
    const grace = s.grace === undefined ? DEFAULT_SETTINGS.grace : Number(s.grace);
    return {
      followPageWeight: s.followPageWeight !== false,
      roundStep: ROUND_STEPS.includes(step) ? step : DEFAULT_SETTINGS.roundStep,
      grace: Number.isFinite(grace) && grace >= 0 ? grace : DEFAULT_SETTINGS.grace
    };
  }

  function sanitizeConfigs(list) {
    if (!Array.isArray(list) || !list.length) return null;
    const out = [];
    for (const x of list) {
      const weight = Number(x && x.weight);
      const items = Math.floor(Number(x && x.items));
      if (!Number.isFinite(weight) || weight <= 0) return null;
      if (!Number.isFinite(items) || items < 1) return null;
      out.push({ weight, items });
    }
    return out;
  }

  function clampQuestion(q) {
    return Math.min(state.configs.length, Math.max(1, Number(q) || 1));
  }

  function loadSettings() {
    try {
      const saved = GM_getValue(STORAGE_KEY, null);
      if (saved) {
        const configs = sanitizeConfigs(saved.configs);
        if (configs) state.configs = configs;
        state.settings = sanitizeSettings(saved.settings);
        if (Number.isInteger(saved.question)) state.question = clampQuestion(saved.question);
      }
    } catch (err) {
      LOG("storage load failed", err);
    }
    render();
    renderSettings();
    syncFromPage();
  }

  function saveSettings() {
    try {
      GM_setValue(STORAGE_KEY, {
        configs: state.configs,
        question: state.question,
        settings: state.settings
      });
    } catch (err) {
      LOG("storage save failed", err);
    }
  }

  function getConfig() {
    return state.configs[state.question - 1] || state.configs[0];
  }

  function roundUp(value, step) {
    if (!step || step <= 0) return value;
    // epsilon avoids float noise (e.g. 6.000000001 -> 6.5)
    return Math.ceil(value / step - 1e-9) * step;
  }

  function calculateScore(correct) {
    const { weight, items } = getConfig();
    const w = Number(weight);
    if (correct === 0) return Math.min(Number(state.settings.grace) || 0, w);
    const raw = (w * correct) / Number(items);
    return Math.min(roundUp(raw, Number(state.settings.roundStep)), w);
  }

  function formatScore(value) {
    if (!Number.isFinite(value)) return "0";
    return Number(value.toFixed(4)).toString();
  }

  function isPanelElement(el) {
    return !!(el && el.closest && el.closest("#essay-grader-panel"));
  }

  function setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  // ------------------------------------------------------------------
  // Read "Soal no. N" and "Bobot maksimal W" from the page
  // ------------------------------------------------------------------
  function readPageInfo() {
    const info = { question: null, weight: null };
    if (!document.body) return info;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return NodeFilter.FILTER_REJECT;
        if (isPanelElement(p)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let node;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue;
      if (info.question === null) {
        const m = text.match(/Soal\s*(?:no\.?|nomor)?\s*(\d+)/i);
        if (m) info.question = Number(m[1]);
      }
      if (info.weight === null) {
        const m = text.match(/Bobot\s*maksimal\s*(\d+(?:[.,]\d+)?)/i);
        if (m) info.weight = Number(m[1].replace(",", "."));
      }
      if (info.question !== null && info.weight !== null) break;
    }
    return info;
  }

  // When the page's question number changes, follow it automatically.
  function syncFromPage() {
    const info = readPageInfo();
    state.pageInfo = info;

    const q = info.question;
    if (q && q >= 1 && q !== state.lastPageQuestion) {
      state.lastPageQuestion = q;
      if (q > state.configs.length) {
        setStatus(`Page is on question ${q}, but Settings only has ${state.configs.length}. Add it in Settings.`, true);
      } else {
        state.question = q;
        if (state.settings.followPageWeight && info.weight && info.weight > 0) {
          getConfig().weight = info.weight;
        }
        saveSettings();
        render();
        renderSettings();
        setStatus(`Synced with page: Question ${q}`);
      }
    }
    updateDebug();
  }

  function updateDebug() {
    if (!state.panel) return;
    const el = state.panel.querySelector(".eg-debug");
    const { question, weight } = state.pageInfo;
    setText(
      el,
      `Page: Soal ${question ?? "?"} · max ${weight ?? "?"} · ${state.inputs.length} fields`
    );
  }

  // ------------------------------------------------------------------
  // Score input detection
  // ------------------------------------------------------------------
  const FIELD_TYPES = new Set(["number", "text", "tel"]);

  function isCandidate(input) {
    if (!(input instanceof HTMLInputElement)) return false;
    if (!input.isConnected || isPanelElement(input)) return false;
    if (!FIELD_TYPES.has(input.type)) return false;
    if (input.disabled || input.readOnly) return false;
    const rect = input.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return false;
    if (getComputedStyle(input).visibility === "hidden") return false;
    return true;
  }

  function hasScoreHint(input) {
    return (
      input.hasAttribute("max") ||
      /\/\s*\d+/.test(input.parentElement?.innerText || "")
    );
  }

  function columnOf(input) {
    const cell = input.closest("td,th");
    return cell ? cell.cellIndex : -1;
  }

  function sameGroup(a, b) {
    if (a.type !== b.type) return false;
    if (columnOf(a) !== columnOf(b)) return false;
    if (a.closest("table") !== b.closest("table")) return false;
    return true;
  }

  function autoDetectInputs() {
    const cands = [...document.querySelectorAll("input")].filter(isCandidate);

    let pool = cands.filter(i => i.type === "number" && hasScoreHint(i));
    if (!pool.length) pool = cands.filter(i => i.type === "number");
    if (!pool.length) pool = cands.filter(i => i.closest("td"));

    const groups = [];
    for (const input of pool) {
      const group = groups.find(g => sameGroup(g[0], input));
      if (group) group.push(input);
      else groups.push([input]);
    }
    groups.sort((a, b) => b.length - a.length);
    return groups[0] || [];
  }

  function refreshInputs() {
    const cur =
      state.currentInput && isCandidate(state.currentInput) ? state.currentInput : null;

    if (cur) {
      const curHint = hasScoreHint(cur);
      state.inputs = [...document.querySelectorAll("input")].filter(
        i => isCandidate(i) && sameGroup(cur, i) && hasScoreHint(i) === curHint
      );
      state.currentIndex = Math.max(0, state.inputs.indexOf(cur));
    } else {
      state.inputs = autoDetectInputs();
      state.currentIndex = Math.min(state.currentIndex, Math.max(0, state.inputs.length - 1));
      state.currentInput = state.inputs[state.currentIndex] || null;
    }

    updateCurrentStudent();
    updateDebug();
  }

  // Returns the student's name (first line of the row) and their answer
  // (everything else in the row that is not a bare number / "/ N" maximum).
  function studentInfoForInput(input) {
    if (!input) return { name: "No student selected", answer: "" };

    // Climb to the smallest ancestor that holds this student's row only.
    let el = input.parentElement;
    let best = null;
    for (let i = 0; i < 8 && el; i++) {
      if (el.querySelectorAll("input").length > 1) break;
      best = el;
      el = el.parentElement;
    }
    if (!best) return { name: "Current student", answer: "" };

    const lines = (best.innerText || "")
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean)
      .filter(s => !/^\d+$/.test(s) && !/^\/\s*\d/.test(s));

    // Answers shown inside read-only textareas are not part of innerText.
    for (const ta of best.querySelectorAll("textarea")) {
      const v = (ta.value || "").trim();
      if (v && !lines.some(l => l.includes(v))) lines.push(v);
    }

    return {
      name: lines[0] || "Current student",
      answer: lines.slice(1).join("\n")
    };
  }

  function setCurrentInput(input) {
    if (!input) return;
    state.currentInput = input;
    state.currentIndex = state.inputs.indexOf(input);
    if (state.currentIndex < 0) state.currentIndex = 0;

    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
    updateCurrentStudent();
  }

  // ------------------------------------------------------------------
  // Back / Next navigation (fix mistakes without writing anything)
  // ------------------------------------------------------------------
  function moveStudent(delta) {
    refreshInputs();
    if (!state.inputs.length || !state.currentInput) {
      setStatus("No score box found. Click a student's score box first.", true);
      return;
    }
    const idx = state.inputs.indexOf(state.currentInput);
    const target = idx + delta;
    if (target < 0) {
      setStatus("Already at the first student.", true);
      return;
    }
    if (target >= state.inputs.length) {
      setStatus("Already at the last student.", true);
      return;
    }
    setCurrentInput(state.inputs[target]);
    setStatus(delta < 0 ? "Back to previous student" : "Skipped to next student");
  }

  // ------------------------------------------------------------------
  // Writing the score
  // ------------------------------------------------------------------
  function setInputValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (setter) setter.call(input, value);
    else input.value = value;

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    // If the page's framework reverted the value, retry by simulating typing.
    setTimeout(() => {
      if (input.value === value) return;
      try {
        input.focus({ preventScroll: true });
        input.select();
        document.execCommand("insertText", false, value);
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } catch (err) {
        LOG("fallback typing failed", err);
      }
    }, 60);
  }

  function writeScore(score) {
    refreshInputs();

    if (!state.inputs.length || !state.currentInput) {
      setStatus("No score box found. Click a student's score box first.", true);
      return;
    }

    const input = state.currentInput;
    const max = input.max !== "" ? Number(input.max) : NaN;
    if (Number.isFinite(max) && score > max) {
      setStatus(`Score ${formatScore(score)} exceeds field maximum ${max}.`, true);
      return;
    }

    const value = formatScore(score);
    setInputValue(input, value);
    setStatus(`Entered ${value} / ${getConfig().weight}`);

    const nextIndex = state.inputs.indexOf(input) + 1;
    if (nextIndex < state.inputs.length) {
      state.currentIndex = nextIndex;
      state.currentInput = state.inputs[nextIndex];
      window.setTimeout(() => setCurrentInput(state.currentInput), 80);
    } else {
      setStatus(`Entered ${value}. Last student reached.`);
    }

    updateCurrentStudent();
  }

  // ------------------------------------------------------------------
  // Panel UI
  // ------------------------------------------------------------------
  function setStatus(message, error = false) {
    const el = state.panel?.querySelector(".eg-status");
    if (!el) return;
    setText(el, message);
    el.classList.toggle("error", error);

    clearTimeout(state.statusTimer);
    if (!error) {
      state.statusTimer = setTimeout(() => setText(el, "Ready"), 2500);
    }
  }

  function updateCurrentStudent() {
    if (!state.panel) return;

    const nameEl = state.panel.querySelector(".eg-student-name");
    const answerEl = state.panel.querySelector(".eg-answer");
    const countEl = state.panel.querySelector(".eg-student-count");
    const lastEl = state.panel.querySelector(".eg-last-score");

    const total = state.inputs.length;
    const idx = state.currentInput ? state.inputs.indexOf(state.currentInput) : -1;

    const info = studentInfoForInput(state.currentInput);
    setText(nameEl, info.name);
    if (answerEl) {
      setText(answerEl, info.answer || (state.currentInput ? "(no answer text found in this row)" : ""));
      answerEl.classList.toggle("empty", !info.answer);
      answerEl.hidden = !state.currentInput;
    }
    setText(countEl, total
      ? `Student ${Math.max(1, idx + 1)} / ${total}`
      : "No score fields detected");

    if (lastEl && state.currentInput) {
      setText(lastEl, state.currentInput.value
        ? `Current score: ${state.currentInput.value} / ${getConfig().weight}`
        : "Current score: —");
    }
  }

  function makeButton(correct, score) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "eg-score-button";
    button.innerHTML = `<strong>${correct}</strong><span>${formatScore(score)} pts</span>`;
    // Keep focus on the page's score box.
    button.addEventListener("mousedown", event => event.preventDefault());
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      writeScore(score);
    });
    return button;
  }

  function render() {
    if (!state.panel) return;

    const cfg = getConfig();
    const sel = state.panel.querySelector(".eg-question");
    if (sel.options.length !== state.configs.length) {
      sel.innerHTML = state.configs
        .map((_, i) => `<option value="${i + 1}">Question ${i + 1}</option>`)
        .join("");
    }
    sel.value = String(state.question);
    setText(
      state.panel.querySelector(".eg-cfg-line"),
      `Weight ${formatScore(Number(cfg.weight))} · ${cfg.items} items`
    );

    const grid = state.panel.querySelector(".eg-score-grid");
    grid.innerHTML = "";

    for (let i = 0; i <= cfg.items; i++) {
      grid.appendChild(makeButton(i, calculateScore(i)));
    }

    updateCurrentStudent();
  }

  function renderSettings() {
    if (!state.panel) return;
    const rows = state.panel.querySelector(".eg-qrows");
    rows.innerHTML = "";

    state.configs.forEach((cfg, i) => {
      const row = document.createElement("div");
      row.className = "eg-qrow";
      row.innerHTML =
        `<span class="eg-qno">${i + 1}</span>` +
        `<input type="number" min="0" step="any">` +
        `<input type="number" min="1" step="1">`;
      const [w, it] = row.querySelectorAll("input");
      w.value = cfg.weight;
      it.value = cfg.items;
      w.addEventListener("change", e => updateConfig(i, "weight", e.target.value));
      it.addEventListener("change", e => updateConfig(i, "items", e.target.value));
      rows.appendChild(row);
    });

    state.panel.querySelector(".eg-follow").checked = state.settings.followPageWeight;
    state.panel.querySelector(".eg-step").value = String(state.settings.roundStep);
    state.panel.querySelector(".eg-grace").value = state.settings.grace;
  }

  function setTab(name) {
    state.tab = name;
    if (!state.panel) return;
    for (const t of ["grade", "settings"]) {
      state.panel.querySelector(`.eg-tab-${t}`).hidden = t !== name;
      state.panel.querySelector(`.eg-tabbtn-${t}`).classList.toggle("active", t === name);
    }
    if (name === "settings") renderSettings();
  }

  function changeQuestion(value) {
    const q = clampQuestion(value);
    state.question = q;
    saveSettings();
    render();
    setStatus(`Question ${q} selected`);
  }

  function updateConfig(index, field, value) {
    const n = Number(value);
    const cfg = state.configs[index];
    const valid =
      cfg && Number.isFinite(n) && (field === "weight" ? n > 0 : n >= 1);
    if (!valid) {
      renderSettings(); // restore the previous value
      setStatus("Invalid value", true);
      return;
    }

    if (field === "weight") cfg.weight = n;
    if (field === "items") cfg.items = Math.floor(n);

    saveSettings();
    if (index === state.question - 1) render();
    setStatus(`Question ${index + 1} saved`);
  }

  function addQuestion() {
    const last = state.configs[state.configs.length - 1] || { weight: 10, items: 3 };
    state.configs.push({ ...last });
    saveSettings();
    render();
    renderSettings();
    setStatus(`Question ${state.configs.length} added`);
  }

  function removeLastQuestion() {
    if (state.configs.length <= 1) {
      setStatus("At least one question is required.", true);
      return;
    }
    state.configs.pop();
    state.question = clampQuestion(state.question);
    saveSettings();
    render();
    renderSettings();
    setStatus("Last question removed");
  }

  function applyGeneralSettings() {
    const p = state.panel;
    const follow = p.querySelector(".eg-follow").checked;
    const step = Number(p.querySelector(".eg-step").value);
    const graceRaw = Number(p.querySelector(".eg-grace").value);

    const wasFollowing = state.settings.followPageWeight;
    state.settings = sanitizeSettings({
      followPageWeight: follow,
      roundStep: step,
      grace: Number.isFinite(graceRaw) ? graceRaw : state.settings.grace
    });
    saveSettings();
    render();
    renderSettings();
    if (follow && !wasFollowing) {
      state.lastPageQuestion = null; // re-read the page's weight now
      syncFromPage();
    }
    setStatus("Settings saved");
  }

  function resetSettings() {
    if (!window.confirm("Reset all weights, items and options to defaults?")) return;
    state.configs = DEFAULTS.map(x => ({ ...x }));
    state.settings = { ...DEFAULT_SETTINGS };
    state.question = 1;
    state.lastPageQuestion = null;
    saveSettings();
    render();
    renderSettings();
    syncFromPage();
    setStatus("Reset to defaults");
  }

  function exportSettings() {
    const data = JSON.stringify(
      { app: "essay-grader", version: 1, configs: state.configs, settings: state.settings },
      null,
      2
    );
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "essay-grader-settings.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setStatus("Settings exported");
  }

  function importSettings(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const configs = sanitizeConfigs(data.configs);
        if (!configs) throw new Error("bad configs");
        state.configs = configs;
        state.settings = sanitizeSettings(data.settings);
        state.question = clampQuestion(state.question);
        state.lastPageQuestion = null;
        saveSettings();
        render();
        renderSettings();
        syncFromPage();
        setStatus("Settings imported");
      } catch (err) {
        LOG("import failed", err);
        setStatus("Import failed: not a valid settings file", true);
      }
    };
    reader.onerror = () => setStatus("Import failed: cannot read file", true);
    reader.readAsText(file);
  }

  function makePanel() {
    const panel = document.createElement("aside");
    panel.id = "essay-grader-panel";
    panel.innerHTML = `
      <div class="eg-header">
        <div>
          <div class="eg-title">Essay Grader</div>
          <div class="eg-subtitle">Follows the page's question number</div>
        </div>
        <button class="eg-collapse" type="button" title="Minimize">−</button>
      </div>

      <div class="eg-body">
        <div class="eg-tabs">
          <button class="eg-tabbtn-grade active" type="button" data-tab="grade">Grade</button>
          <button class="eg-tabbtn-settings" type="button" data-tab="settings">Settings</button>
        </div>

        <div class="eg-tab eg-tab-grade">
          <label class="eg-label">Question</label>
          <select class="eg-select eg-question"></select>
          <div class="eg-cfg-line"></div>

          <div class="eg-divider"></div>

          <div class="eg-current">
            <div class="eg-student-count">No score fields detected</div>
            <div class="eg-student-name">No student selected</div>
            <div class="eg-answer" hidden></div>
            <div class="eg-last-score">Current score: —</div>
          </div>

           <div class="eg-divider"></div>

          <div class="eg-section-title">Correct items</div>
          <div class="eg-score-grid"></div>

          <div class="eg-nav">
            <button class="eg-back" type="button" title="Previous student (Alt+Up)">◀ Back</button>
            <button class="eg-next" type="button" title="Next student (Alt+Down)">Next ▶</button>
          </div>

          <div class="eg-help">
            <span>Click a score</span>
            <span>→ auto-advance</span>
          </div>
        </div>

        <div class="eg-tab eg-tab-settings" hidden>
          <div class="eg-section-title">Questions</div>
          <div class="eg-qrow eg-qhead"><span>No.</span><span>Weight</span><span>Items</span></div>
          <div class="eg-qrows"></div>
          <div class="eg-nav">
            <button class="eg-add" type="button">+ Add question</button>
            <button class="eg-remove" type="button">− Remove last</button>
          </div>

          <div class="eg-divider"></div>

          <label class="eg-check">
            <input class="eg-follow" type="checkbox">
            <span>Follow page weight ("Bobot maksimal")</span>
          </label>
          <div class="eg-fields">
            <label>
              <span>Round up to</span>
              <select class="eg-select eg-step">
                <option value="0">No rounding</option>
                <option value="0.25">0.25</option>
                <option value="0.5">0.5</option>
                <option value="1">1</option>
              </select>
            </label>
            <label>
              <span>Points for 0 correct</span>
              <input class="eg-grace" type="number" min="0" step="any">
            </label>
          </div>

          <div class="eg-divider"></div>

          <div class="eg-nav">
            <button class="eg-export" type="button">Export</button>
            <button class="eg-import" type="button">Import</button>
          </div>
          <div class="eg-nav eg-nav-single">
            <button class="eg-reset" type="button">Reset to defaults</button>
          </div>
          <input class="eg-file" type="file" accept="application/json,.json" hidden>
        </div>

        <div class="eg-status">Ready</div>
        <div class="eg-debug"></div>
      </div>
    `;

    document.body.appendChild(panel);
    state.panel = panel;

    const q = sel => panel.querySelector(sel);

    q(".eg-question").addEventListener("change", e => changeQuestion(e.target.value));
    q(".eg-collapse").addEventListener("click", () => {
      panel.classList.toggle("collapsed");
      q(".eg-collapse").textContent = panel.classList.contains("collapsed") ? "+" : "−";
    });

    // Tabs, navigation and settings buttons never steal focus from the page.
    const press = (sel, fn) => {
      const btn = q(sel);
      btn.addEventListener("mousedown", e => e.preventDefault());
      btn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        fn();
      });
    };
    press(".eg-tabbtn-grade", () => setTab("grade"));
    press(".eg-tabbtn-settings", () => setTab("settings"));
    press(".eg-back", () => moveStudent(-1));
    press(".eg-next", () => moveStudent(1));
    press(".eg-add", addQuestion);
    press(".eg-remove", removeLastQuestion);
    press(".eg-reset", resetSettings);
    press(".eg-export", exportSettings);
    press(".eg-import", () => q(".eg-file").click());

    q(".eg-file").addEventListener("change", e => {
      importSettings(e.target.files && e.target.files[0]);
      e.target.value = "";
    });
    q(".eg-follow").addEventListener("change", applyGeneralSettings);
    q(".eg-step").addEventListener("change", applyGeneralSettings);
    q(".eg-grace").addEventListener("change", applyGeneralSettings);

    makeDraggable(panel, q(".eg-header"));
    render();
    renderSettings();
  }

  function makeDraggable(panel, handle) {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    handle.addEventListener("mousedown", e => {
      if (e.target.closest("button")) return;
      dragging = true;
      const rect = panel.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      panel.classList.add("dragging");
      e.preventDefault();
    });

    document.addEventListener("mousemove", e => {
      if (!dragging) return;
      panel.style.left = `${Math.max(4, e.clientX - offsetX)}px`;
      panel.style.top = `${Math.max(4, e.clientY - offsetY)}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    });

    document.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      panel.classList.remove("dragging");
    });
  }

  // ------------------------------------------------------------------
  // Events
  // ------------------------------------------------------------------
  document.addEventListener("focusin", event => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (isPanelElement(target)) return;
    if (!isCandidate(target)) return;

    state.currentInput = target;
    refreshInputs();
  });

  document.addEventListener("keydown", event => {
    if (isPanelElement(event.target)) return;

    if (event.altKey && event.key === "ArrowRight") {
      event.preventDefault();
      changeQuestion(state.question + 1);
    }
    if (event.altKey && event.key === "ArrowLeft") {
      event.preventDefault();
      changeQuestion(state.question - 1);
    }
    if (event.altKey && event.key === "ArrowUp") {
      event.preventDefault();
      moveStudent(-1);
    }
    if (event.altKey && event.key === "ArrowDown") {
      event.preventDefault();
      moveStudent(1);
    }
  }, true);

  // ------------------------------------------------------------------
  // DOM watching (throttled, ignores our own panel -> no feedback loop)
  // ------------------------------------------------------------------
  let refreshTimer = null;

  function tick() {
    refreshInputs();
    syncFromPage();
  }

  function scheduleRefresh() {
    if (refreshTimer !== null) return;
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      tick();
    }, 300);
  }

  const observer = new MutationObserver(mutations => {
    const relevant = mutations.some(m => {
      const el = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      return !isPanelElement(el);
    });
    if (relevant) scheduleRefresh();
  });

  function start() {
    makePanel();
    loadSettings();

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    setTimeout(tick, 300);
    setTimeout(tick, 1000);
    setTimeout(tick, 2500);
    LOG("started on", location.href);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
