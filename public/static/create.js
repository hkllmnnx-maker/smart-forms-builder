/* Smart Forms Builder — front-end controller for /create page */
(function () {
  'use strict';

  const $ = (s, ctx) => (ctx || document).querySelector(s);
  const $$ = (s, ctx) => Array.from((ctx || document).querySelectorAll(s));

  const state = {
    activeTab: 'text',
    analysis: null,
    creating: false,
  };

  function init() {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'upload') switchTab('upload');

    $('#tab-text').addEventListener('click', () => switchTab('text'));
    $('#tab-upload').addEventListener('click', () => switchTab('upload'));

    const ta = $('#raw-text');
    ta.addEventListener('input', () => {
      $('#text-count').textContent = ta.value.length.toLocaleString('ar') + ' / 60,000';
    });
    $('#btn-clear-text').addEventListener('click', () => { ta.value = ''; ta.dispatchEvent(new Event('input')); });

    const fileInput = $('#file');
    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      const info = $('#file-info');
      if (f) {
        info.classList.remove('hidden');
        info.innerHTML = `<i data-lucide="file" class="inline h-4 w-4 align-[-3px] ml-1"></i> <strong>${escapeHtml(f.name)}</strong> — ${(f.size / 1024).toFixed(1)} KB`;
        if (window.lucide) lucide.createIcons();
      } else {
        info.classList.add('hidden');
      }
    });

    $('#btn-analyze').addEventListener('click', runAnalyze);

    if (window.lucide) lucide.createIcons();
  }

  function switchTab(t) {
    state.activeTab = t;
    $('#tab-text').classList.toggle('bg-white/[0.03]', t === 'text');
    $('#tab-text').classList.toggle('text-white', t === 'text');
    $('#tab-text').classList.toggle('text-zinc-400', t !== 'text');
    $('#tab-upload').classList.toggle('bg-white/[0.03]', t === 'upload');
    $('#tab-upload').classList.toggle('text-white', t === 'upload');
    $('#tab-upload').classList.toggle('text-zinc-400', t !== 'upload');
    $('#panel-text').classList.toggle('hidden', t !== 'text');
    $('#panel-upload').classList.toggle('hidden', t !== 'upload');
  }

  function setAlert(msg, type) {
    const el = $('#alert');
    if (!msg) { el.classList.add('hidden'); el.textContent = ''; return; }
    el.classList.remove('hidden');
    el.textContent = msg;
    el.className = 'text-sm ' + (type === 'success' ? 'text-emerald-400' : 'text-rose-400');
  }

  function setLoading(loading, label) {
    const btn = $('#btn-analyze');
    btn.disabled = !!loading;
    const lab = $('#btn-analyze-label');
    if (loading) {
      lab.innerHTML = (label || 'جارٍ التحليل') + ' <span class="dot-loader"><span></span><span></span><span></span></span>';
    } else {
      lab.textContent = label || 'تحليل الأسئلة';
    }
  }

  async function runAnalyze() {
    setAlert('');
    try {
      let result;
      if (state.activeTab === 'text') {
        const text = $('#raw-text').value.trim();
        if (!text) { setAlert('الرجاء إدخال نص الأسئلة أولاً.'); return; }
        if (text.length > 60000) { setAlert('النص طويل جداً (الحد الأقصى 60,000 حرف).'); return; }
        setLoading(true, 'جارٍ تحليل النص');
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'فشل التحليل');
        result = data.result;
        result.__sourceKind = 'text';
      } else {
        const file = $('#file').files && $('#file').files[0];
        if (!file) { setAlert('الرجاء اختيار ملف Word.'); return; }
        if (file.size > 5 * 1024 * 1024) { setAlert('الملف يتجاوز الحد الأقصى 5MB.'); return; }
        if (!file.name.toLowerCase().endsWith('.docx')) { setAlert('الملف يجب أن يكون بصيغة .docx'); return; }
        setLoading(true, 'جارٍ قراءة الملف');
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'فشل قراءة الملف');
        result = data.result;
        result.__sourceKind = 'docx';
      }
      state.analysis = result;
      renderPreview(result);
    } catch (e) {
      console.error(e);
      setAlert(e.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }

  function renderPreview(result) {
    const wrap = $('#step-preview');
    wrap.innerHTML = '';
    wrap.classList.remove('hidden');
    const realCount = result.questions.filter(q => q.type !== 'section_header' && q.type !== 'description').length;

    const header = document.createElement('div');
    header.className = 'rounded-2xl border border-line bg-bg-card p-5';
    header.innerHTML = `
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div class="flex-1 min-w-0">
          <label class="text-xs text-zinc-500">عنوان النموذج</label>
          <input id="form-title" class="mt-1 w-full bg-bg-soft border border-line rounded-lg px-3 py-2 text-base font-semibold focus:outline-none focus:border-brand-500/60" dir="auto" />
          <label class="text-xs text-zinc-500 mt-3 block">وصف النموذج (اختياري)</label>
          <textarea id="form-desc" rows="2" dir="auto" class="mt-1 w-full bg-bg-soft border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500/60"></textarea>
        </div>
        <div class="text-left">
          <div class="text-xs text-zinc-500">المصدر</div>
          <div class="text-xs text-zinc-300 mt-0.5">${result.source === 'hybrid' ? 'هجين (قواعد + AI)' : result.source === 'ai' ? 'AI' : 'قواعد ذكية'}</div>
          <div class="text-xs text-zinc-500 mt-2">عدد الأسئلة</div>
          <div class="text-lg font-bold">${result.questions.length}</div>
        </div>
      </div>
    `;
    wrap.appendChild(header);
    $('#form-title').value = result.formTitle || '';
    $('#form-desc').value = result.formDescription || '';

    const list = document.createElement('div');
    list.id = 'questions-list';
    list.className = 'mt-4 space-y-3';
    wrap.appendChild(list);

    result.questions.forEach((q) => list.appendChild(buildCard(q)));

    const actions = document.createElement('div');
    actions.className = 'mt-5 flex items-center justify-between gap-3 flex-wrap';
    actions.innerHTML = `
      <div class="flex items-center gap-2">
        <button id="add-q" class="border border-line rounded-xl px-3 py-2 text-sm hover:bg-white/5 transition">
          <i data-lucide="plus" class="inline h-4 w-4 align-[-3px] ml-1"></i> سؤال جديد
        </button>
        <button id="add-section" class="border border-line rounded-xl px-3 py-2 text-sm hover:bg-white/5 transition">
          <i data-lucide="folder-plus" class="inline h-4 w-4 align-[-3px] ml-1"></i> عنوان قسم
        </button>
      </div>
      <button id="btn-create" class="inline-flex items-center gap-2 bg-white text-bg font-semibold rounded-xl px-5 py-2.5 hover:bg-zinc-200 transition disabled:opacity-50">
        <i data-lucide="check" class="h-4 w-4"></i>
        <span id="btn-create-label">إنشاء النموذج في Google Forms</span>
      </button>
    `;
    wrap.appendChild(actions);

    $('#add-q').addEventListener('click', () => {
      const q = { id: 'q_' + Math.random().toString(36).slice(2, 10), type: 'short_text', title: 'سؤال جديد', required: false };
      result.questions.push(q);
      list.appendChild(buildCard(q));
      if (window.lucide) lucide.createIcons();
    });
    $('#add-section').addEventListener('click', () => {
      const q = { id: 'q_' + Math.random().toString(36).slice(2, 10), type: 'section_header', title: 'قسم جديد' };
      result.questions.push(q);
      list.appendChild(buildCard(q));
      if (window.lucide) lucide.createIcons();
    });
    $('#btn-create').addEventListener('click', submitCreate);

    enableDragSort(list);
    if (window.lucide) lucide.createIcons();

    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function buildCard(q) {
    const tpl = $('#tpl-question');
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = q.id;
    node._q = q;

    const titleEl = $('.q-title', node);
    const typeEl = $('.q-type', node);
    const reqEl = $('.q-required', node);
    const optionsEl = $('.q-options', node);
    const addOptBtn = $('.q-add-option', node);
    const delBtn = $('.q-delete', node);

    titleEl.value = q.title || '';
    typeEl.value = q.type || 'short_text';
    reqEl.checked = !!q.required;

    function refreshOptions() {
      const t = typeEl.value;
      const showOptions = ['multiple_choice', 'checkboxes', 'dropdown', 'likert_5'].includes(t);
      optionsEl.innerHTML = '';
      if (!showOptions) {
        addOptBtn.classList.add('hidden');
        if (t === 'section_header' || t === 'description') {
          reqEl.parentElement.style.visibility = 'hidden';
        } else {
          reqEl.parentElement.style.visibility = '';
        }
        return;
      }
      reqEl.parentElement.style.visibility = '';
      addOptBtn.classList.remove('hidden');
      const opts = q.options && q.options.length
        ? q.options
        : (t === 'likert_5'
            ? [{label:'أوافق بشدة'},{label:'أوافق'},{label:'محايد'},{label:'لا أوافق'},{label:'لا أوافق بشدة'}]
            : [{label:'خيار 1'},{label:'خيار 2'}]);
      q.options = opts;
      opts.forEach((o, idx) => optionsEl.appendChild(buildOptionRow(q, idx)));
    }

    function buildOptionRow(q, idx) {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2';
      row.innerHTML = `
        <input class="opt-label flex-1 bg-bg-soft border border-line rounded-lg px-3 py-1.5 text-sm" dir="auto" />
        <label class="text-xs text-zinc-400 flex items-center gap-1">
          <input type="checkbox" class="opt-other" /> أخرى
        </label>
        <button class="opt-del text-rose-400 hover:text-rose-300" title="حذف"><i data-lucide="x" class="h-4 w-4"></i></button>
      `;
      const o = q.options[idx];
      $('.opt-label', row).value = o.label || '';
      $('.opt-other', row).checked = !!o.isOther;
      $('.opt-label', row).addEventListener('input', (e) => { q.options[idx].label = e.target.value; });
      $('.opt-other', row).addEventListener('change', (e) => { q.options[idx].isOther = e.target.checked; });
      $('.opt-del', row).addEventListener('click', () => {
        q.options.splice(idx, 1);
        // rebuild
        const cards = $$('#questions-list .question-card');
        const card = cards.find(c => c.dataset.id === q.id);
        if (card) refreshOptionsExternal(card, q);
      });
      return row;
    }

    function refreshOptionsExternal(card, q) {
      const optionsEl2 = $('.q-options', card);
      optionsEl2.innerHTML = '';
      (q.options || []).forEach((_, idx) => optionsEl2.appendChild(buildOptionRow(q, idx)));
      if (window.lucide) lucide.createIcons();
    }

    titleEl.addEventListener('input', () => { q.title = titleEl.value; });
    typeEl.addEventListener('change', () => {
      q.type = typeEl.value;
      // Reset options when switching to/from option types
      if (q.type === 'yes_no') q.options = [{label:'نعم'},{label:'لا'}];
      else if (['multiple_choice','checkboxes','dropdown'].includes(q.type)) {
        if (!q.options || q.options.length < 2) q.options = [{label:'خيار 1'},{label:'خيار 2'}];
      } else if (q.type === 'likert_5') {
        q.options = [{label:'أوافق بشدة'},{label:'أوافق'},{label:'محايد'},{label:'لا أوافق'},{label:'لا أوافق بشدة'}];
      } else {
        q.options = undefined;
      }
      refreshOptions();
      if (window.lucide) lucide.createIcons();
    });
    reqEl.addEventListener('change', () => { q.required = reqEl.checked; });
    delBtn.addEventListener('click', () => {
      const list = $('#questions-list');
      const idx = state.analysis.questions.findIndex(x => x.id === q.id);
      if (idx >= 0) state.analysis.questions.splice(idx, 1);
      node.remove();
    });
    addOptBtn.addEventListener('click', () => {
      if (!q.options) q.options = [];
      q.options.push({ label: 'خيار جديد' });
      const optionsEl2 = $('.q-options', node);
      optionsEl2.appendChild(buildOptionRow(q, q.options.length - 1));
      if (window.lucide) lucide.createIcons();
    });

    refreshOptions();
    return node;
  }

  function enableDragSort(list) {
    let dragEl = null;
    list.addEventListener('dragstart', (e) => {
      const t = e.target.closest('.question-card');
      if (!t) return;
      dragEl = t;
      t.classList.add('opacity-40');
      e.dataTransfer.effectAllowed = 'move';
    });
    list.addEventListener('dragend', () => {
      if (dragEl) dragEl.classList.remove('opacity-40');
      dragEl = null;
      syncOrder();
    });
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!dragEl) return;
      const after = getDragAfter(list, e.clientY);
      if (after == null) list.appendChild(dragEl);
      else list.insertBefore(dragEl, after);
    });
    // Make drag handles enable dragging
    list.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('.drag-handle');
      if (handle) {
        const card = handle.closest('.question-card');
        if (card) card.setAttribute('draggable', 'true');
      } else {
        $$('.question-card', list).forEach(c => c.removeAttribute('draggable'));
      }
    });
  }
  function getDragAfter(list, y) {
    const els = $$('.question-card:not(.opacity-40)', list);
    let closest = null; let closestOffset = Number.NEGATIVE_INFINITY;
    for (const el of els) {
      const box = el.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closestOffset) { closestOffset = offset; closest = el; }
    }
    return closest;
  }
  function syncOrder() {
    const ids = $$('#questions-list .question-card').map(c => c.dataset.id);
    const map = new Map(state.analysis.questions.map(q => [q.id, q]));
    state.analysis.questions = ids.map(id => map.get(id)).filter(Boolean);
  }

  async function submitCreate() {
    if (state.creating) return;
    state.creating = true;
    const btn = $('#btn-create');
    const lab = $('#btn-create-label');
    btn.disabled = true;
    lab.innerHTML = 'جارٍ الإنشاء <span class="dot-loader"><span></span><span></span><span></span></span>';

    // Sync title/desc
    state.analysis.formTitle = $('#form-title').value.trim() || 'استبيان جديد';
    state.analysis.formDescription = $('#form-desc').value.trim() || undefined;

    try {
      const res = await fetch('/api/forms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ analysis: state.analysis, sourceKind: state.analysis.__sourceKind || 'text' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'فشل الإنشاء');
      renderResult(data.form);
    } catch (e) {
      console.error(e);
      lab.textContent = 'إنشاء النموذج في Google Forms';
      btn.disabled = false;
      alert(e.message || 'حدث خطأ غير متوقع');
    } finally {
      state.creating = false;
    }
  }

  function renderResult(form) {
    const wrap = $('#step-result');
    wrap.classList.remove('hidden');
    wrap.innerHTML = `
      <div class="rounded-3xl border border-emerald-500/30 bg-emerald-500/[0.04] p-8 shadow-card fade-in">
        <div class="flex items-center gap-3">
          <div class="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center">
            <i data-lucide="check-check" class="h-6 w-6"></i>
          </div>
          <div>
            <div class="text-lg font-bold">تم إنشاء النموذج بنجاح</div>
            <div class="text-sm text-zinc-400">${escapeHtml(form.title || '')}</div>
          </div>
        </div>
        <div class="mt-5 grid sm:grid-cols-2 gap-3">
          <a target="_blank" rel="noopener" href="${form.responderUri}" class="bg-white text-bg font-semibold rounded-xl px-4 py-3 text-center hover:bg-zinc-200 transition">
            فتح رابط النموذج
          </a>
          <a target="_blank" rel="noopener" href="${form.editUri}" class="border border-line rounded-xl px-4 py-3 text-center hover:bg-white/5 transition">
            تعديل في Google Forms
          </a>
        </div>
        <div class="mt-5 text-xs text-zinc-500 break-all">
          رابط النموذج: <span class="text-zinc-300">${escapeHtml(form.responderUri)}</span>
        </div>
        <div class="mt-6 flex items-center gap-2">
          <a href="/create" class="text-sm text-brand-300 hover:underline">إنشاء نموذج آخر</a>
          <span class="text-zinc-600">•</span>
          <a href="/history" class="text-sm text-brand-300 hover:underline">عرض السجل</a>
        </div>
      </div>
    `;
    $('#step-input').classList.add('opacity-60');
    $('#step-preview').classList.add('opacity-60');
    if (window.lucide) lucide.createIcons();
    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
