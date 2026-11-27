// ==UserScript==
// @name         Score Upgrading - Input Nilai (Linear)
// @namespace    sekolah.score-upgrade
// @version      1.0.0
// @description  Konversi nilai linear (proporsional) pada kolom "Nilai ini", siswa per siswa, otomatis berhenti di siswa terakhir.
// @match        https://sistem.smkdiponegorobanyuputih.sch.id/guru/input-nilai/penilaian*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /* ---------------------------------------------------------------
   * Rumus (Konversi Nilai Linear, min-max):
   *   baru = Min + (nilai - nilaiAsliTerendah) / (nilaiAsliTertinggi - nilaiAsliTerendah) * (Max - Min)
   *   -> siswa terendah  = Min Score (misal KKM)
   *   -> siswa tertinggi = Max Score
   *   -> siswa lain      = proporsional di antaranya
   * --------------------------------------------------------------- */

  const STORE_KEY = 'scoreUpgrade.settings.v1';
  const DEFAULTS = { min: 68, max: 95, decimals: '0', direction: 'nearest', even: false, delay: 150 };

  let cfg = Object.assign({}, DEFAULTS, loadCfg());
  const originals = new Map(); // nama -> nilai asli (baseline), supaya Run berulang tidak "double upgrade"
  let running = false;
  let stopFlag = false;

  /* ------------------------------ util ------------------------------ */
  function loadCfg() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveCfg() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(cfg)); } catch (e) { /* abaikan */ }
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (id) => document.getElementById(id);

  function setStatus(msg, type) {
    const el = $('su-status');
    if (!el) return;
    el.textContent = msg;
    el.style.color = type === 'err' ? '#f87171' : type === 'ok' ? '#4ade80' : '#cbd5e1';
  }

  /* --------------------------- scan halaman --------------------------- */
  const INPUT_SEL = 'input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=button]):not([type=submit]):not([type=file])';

  function scanStudents() {
    // Filter "Hanya yang belum tuntas" harus mati, karena min/max dihitung dari SEMUA siswa.
    const filterOn = [...document.querySelectorAll('input[type=checkbox]')].find(
      (c) => c.checked && /belum tuntas/i.test((c.closest('label') || c.parentElement || c).innerText || '')
    );
    if (filterOn) {
      setStatus('Matikan dulu centang "Hanya yang belum tuntas", lalu klik lagi.', 'err');
      return null;
    }

    const panel = $('su-panel');
    const inputs = [...document.querySelectorAll(INPUT_SEL)].filter(
      (i) => !(panel && panel.contains(i)) && i.offsetParent !== null
    );

    const list = inputs.map((input) => {
      // naik ke ancestor terbesar yang hanya berisi 1 input = baris siswa
      let row = input;
      while (
        row.parentElement &&
        row.parentElement !== document.body &&
        row.parentElement.querySelectorAll(INPUT_SEL).length === 1
      ) row = row.parentElement;

      const text = (row.innerText || '').trim();
      const m = text.match(/(\d+)\.\s*([^\n]+)/);
      let name = m ? m[2] : text.split('\n')[0];
      name = name.replace(/\s+[LP]\s*$/, '').trim();
      return { name, input, row };
    });

    // Baseline nilai asli: simpan sekali per nama
    list.forEach((s) => {
      if (!originals.has(s.name)) {
        const v = parseFloat(String(s.input.value).replace(',', '.'));
        originals.set(s.name, isNaN(v) ? null : v);
      }
      s.orig = originals.get(s.name);
    });
    return list;
  }

  /* ----------------------------- hitung ----------------------------- */
  function finalize(v, lo, hi) {
    const up = cfg.direction === 'up';
    let r;
    if (cfg.even) {
      // selalu bilangan genap (bulat)
      r = up ? Math.ceil(v / 2 - 1e-9) * 2 : Math.round(v / 2) * 2;
      lo = Math.ceil(lo / 2) * 2;
      hi = Math.floor(hi / 2) * 2;
    } else if (cfg.decimals === 'none') {
      r = v;
    } else {
      const f = Math.pow(10, Number(cfg.decimals));
      r = up ? Math.ceil(v * f - 1e-9) / f : Math.round(v * f) / f;
    }
    r = Math.min(hi, Math.max(lo, r));
    return cfg.decimals === 'none' && !cfg.even ? Number(r.toFixed(4)) : Number(r.toFixed(2));
  }

  function compute(list) {
    const scored = list.filter((s) => s.orig !== null);
    if (!scored.length) return null;
    const oMin = Math.min(...scored.map((s) => s.orig));
    const oMax = Math.max(...scored.map((s) => s.orig));
    const { min, max } = cfg;
    scored.forEach((s) => {
      const t = oMax === oMin ? 0 : (s.orig - oMin) / (oMax - oMin);
      s.newVal = finalize(min + t * (max - min), min, max);
    });
    return { scored, oMin, oMax };
  }

  /* ------------------------- tulis ke input ------------------------- */
  function setValue(input, val) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    input.focus();
    setter.call(input, String(val));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function highlight(row, on) {
    row.style.outline = on ? '2px solid #38bdf8' : '';
    row.style.outlineOffset = on ? '-2px' : '';
  }

  /* ----------------------------- aksi ----------------------------- */
  function readCfgFromUI() {
    cfg.min = parseFloat($('su-min').value);
    cfg.max = parseFloat($('su-max').value);
    cfg.decimals = $('su-dec').value;
    cfg.direction = $('su-dir').value;
    cfg.even = $('su-even').checked;
    cfg.delay = Math.max(0, parseInt($('su-delay').value, 10) || 0);
    if (isNaN(cfg.min) || isNaN(cfg.max) || cfg.min > cfg.max) {
      setStatus('Min Score harus angka dan <= Max Score.', 'err');
      return false;
    }
    saveCfg();
    return true;
  }

  function preview() {
    if (!readCfgFromUI()) return;
    const list = scanStudents();
    if (!list) return;
    const res = compute(list);
    if (!res) return setStatus('Tidak ada nilai terisi yang ditemukan.', 'err');
    console.table(res.scored.map((s) => ({ Nama: s.name, Asli: s.orig, Baru: s.newVal })));
    setStatus(
      `${res.scored.length}/${list.length} siswa. Asli ${res.oMin}–${res.oMax} → Baru ${cfg.min}–${cfg.max}. Detail di Console (F12).`,
      'ok'
    );
  }

  async function run() {
    if (running) return;
    if (!readCfgFromUI()) return;
    const list = scanStudents();
    if (!list) return;
    const res = compute(list);
    if (!res) return setStatus('Tidak ada nilai terisi yang ditemukan.', 'err');

    running = true;
    stopFlag = false;
    $('su-run').disabled = true;
    let done = 0;

    for (const s of res.scored) {
      if (stopFlag) break;
      s.row.scrollIntoView({ block: 'center', behavior: 'auto' });
      highlight(s.row, true);
      setValue(s.input, s.newVal);
      done++;
      setStatus(`(${done}/${res.scored.length}) ${s.name}: ${s.orig} → ${s.newVal}`);
      await sleep(cfg.delay);
      highlight(s.row, false);
    }

    running = false;
    $('su-run').disabled = false;
    if (stopFlag) setStatus(`Dihentikan di ${done}/${res.scored.length}.`, 'err');
    else setStatus(`Selesai: ${done} siswa. Periksa lalu klik "Simpan nilai".`, 'ok');
  }

  async function restore() {
    if (running) return;
    const list = scanStudents();
    if (!list) return;
    let n = 0;
    for (const s of list) {
      if (s.orig === null) continue;
      setValue(s.input, s.orig);
      n++;
    }
    setStatus(`Nilai asli dikembalikan (${n} siswa).`, 'ok');
  }

  function rescan() {
    originals.clear();
    const list = scanStudents();
    if (list) setStatus(`Baseline baru: nilai saat ini dijadikan nilai asli (${list.length} siswa).`, 'ok');
  }

  /* ------------------------------ UI ------------------------------ */
  function buildUI() {
    if ($('su-panel')) return;
    const p = document.createElement('div');
    p.id = 'su-panel';
    p.style.cssText =
      'position:fixed;top:12px;right:12px;z-index:2147483647;width:260px;background:#0f172a;color:#e2e8f0;' +
      'border:1px solid #334155;border-radius:10px;padding:10px;font:12px/1.4 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.5)';
    const f = 'width:100%;box-sizing:border-box;background:#1e293b;color:#e2e8f0;border:1px solid #475569;border-radius:6px;padding:4px 6px;';
    const b = 'border:0;border-radius:6px;padding:6px 8px;cursor:pointer;color:#fff;font-weight:600;';
    p.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <b>Score Upgrading</b><span id="su-toggle" style="cursor:pointer;padding:0 6px">–</span>
      </div>
      <div id="su-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          <label>Min Score<input id="su-min" type="number" step="any" style="${f}"></label>
          <label>Max Score<input id="su-max" type="number" step="any" style="${f}"></label>
          <label>Pembulatan
            <select id="su-dec" style="${f}">
              <option value="0">Bulat</option><option value="1">1 desimal</option>
              <option value="2">2 desimal</option><option value="none">Tanpa pembulatan</option>
            </select></label>
          <label>Arah
            <select id="su-dir" style="${f}">
              <option value="nearest">Terdekat</option><option value="up">Selalu ke atas</option>
            </select></label>
        </div>
        <label style="display:flex;gap:6px;align-items:center;margin:8px 0 4px">
          <input id="su-even" type="checkbox"> Selalu bilangan genap
        </label>
        <label>Jeda per siswa (ms)<input id="su-delay" type="number" min="0" style="${f}"></label>
        <div style="display:flex;gap:6px;margin-top:8px">
          <button id="su-preview" style="${b}background:#475569;flex:1">Preview</button>
          <button id="su-run" style="${b}background:#0284c7;flex:1">Run</button>
          <button id="su-stop" style="${b}background:#dc2626">Stop</button>
        </div>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button id="su-restore" style="${b}background:#475569;flex:1">Kembalikan asli</button>
          <button id="su-rescan" style="${b}background:#475569;flex:1">Baseline baru</button>
        </div>
        <div id="su-status" style="margin-top:8px;min-height:30px;word-break:break-word">Siap.</div>
      </div>`;
    document.body.appendChild(p);

    $('su-min').value = cfg.min;
    $('su-max').value = cfg.max;
    $('su-dec').value = cfg.decimals;
    $('su-dir').value = cfg.direction;
    $('su-even').checked = cfg.even;
    $('su-delay').value = cfg.delay;

    $('su-toggle').onclick = () => {
      const body = $('su-body');
      const hide = body.style.display !== 'none';
      body.style.display = hide ? 'none' : '';
      $('su-toggle').textContent = hide ? '+' : '–';
    };
    $('su-preview').onclick = preview;
    $('su-run').onclick = run;
    $('su-stop').onclick = () => { stopFlag = true; };
    $('su-restore').onclick = restore;
    $('su-rescan').onclick = rescan;
    $('su-even').onchange = () => { $('su-dec').disabled = $('su-even').checked; };
    $('su-dec').disabled = cfg.even;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUI);
  else buildUI();
})();
