import type { FC } from 'hono/jsx'

/** Create page hosts the full SPA-like flow: input -> analyze -> preview -> create. */
export const CreatePage: FC<{ initialTab?: 'text' | 'upload' }> = ({ initialTab }) => {
  return (
    <section class="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div class="mb-6">
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">إنشاء نموذج جديد</h1>
        <p class="mt-1.5 text-sm text-zinc-400">الصق نص الاستبيان أو ارفع ملف Word، ثم راجع المعاينة قبل الإنشاء.</p>
      </div>

      <div id="step-input" class="rounded-2xl border border-line bg-bg-card overflow-hidden shadow-card">
        <div class="flex border-b border-line" role="tablist">
          <button
            id="tab-text"
            class={`flex-1 px-4 py-3 text-sm font-medium ${initialTab === 'upload' ? 'text-zinc-400' : 'text-white bg-white/[0.03]'}`}
            type="button"
            role="tab"
          >
            <i data-lucide="type" class="inline h-4 w-4 align-[-3px] ml-1"></i> نص مباشر
          </button>
          <button
            id="tab-upload"
            class={`flex-1 px-4 py-3 text-sm font-medium border-r border-line ${initialTab === 'upload' ? 'text-white bg-white/[0.03]' : 'text-zinc-400'}`}
            type="button"
            role="tab"
          >
            <i data-lucide="upload-cloud" class="inline h-4 w-4 align-[-3px] ml-1"></i> ملف Word
          </button>
        </div>

        {/* Text panel */}
        <div id="panel-text" class={`p-5 ${initialTab === 'upload' ? 'hidden' : ''}`}>
          <label class="text-xs text-zinc-500">ألصق نص الاستبيان (يدعم العربية والإنجليزية)</label>
          <textarea
            id="raw-text"
            dir="auto"
            rows={14}
            placeholder={`مثال:\n\nعنوان: استبيان رضا العملاء\n\nما اسمك؟ (مطلوب)\n\nما مستواك الدراسي؟\nبكالوريوس\nماجستير\nدكتوراه\n\nهل توصي بخدماتنا؟\nنعم\nلا\n\nقيّم تجربتك:\nأوافق بشدة\nأوافق\nمحايد\nلا أوافق\nلا أوافق بشدة\n\nما مقترحاتك للتحسين؟`}
            class="mt-2 w-full bg-bg-soft border border-line rounded-xl p-4 text-sm leading-7 focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/30 placeholder:text-zinc-600"
          ></textarea>
          <div class="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span id="text-count">0 / 60000</span>
            <button id="btn-clear-text" class="hover:text-white transition">مسح</button>
          </div>
        </div>

        {/* Upload panel */}
        <div id="panel-upload" class={`p-5 ${initialTab === 'upload' ? '' : 'hidden'}`}>
          <label
            for="file"
            class="flex flex-col items-center justify-center border-2 border-dashed border-line hover:border-brand-500/60 rounded-2xl p-10 cursor-pointer transition group"
          >
            <div class="h-12 w-12 rounded-2xl bg-brand-500/15 text-brand-300 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <i data-lucide="file-up" class="h-6 w-6"></i>
            </div>
            <div class="font-medium">اسحب الملف هنا أو اضغط للاختيار</div>
            <div class="text-xs text-zinc-500 mt-1">صيغة .docx فقط — الحد الأقصى 5MB</div>
            <input id="file" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" class="hidden" />
          </label>
          <div id="file-info" class="mt-3 text-sm text-zinc-400 hidden"></div>
        </div>

        <div class="border-t border-line p-4 flex items-center justify-between gap-3 bg-white/[0.01]">
          <div id="alert" class="text-sm text-rose-400 hidden"></div>
          <button
            id="btn-analyze"
            class="inline-flex items-center gap-2 bg-white text-bg font-semibold rounded-xl px-4 py-2.5 hover:bg-zinc-200 transition disabled:opacity-50"
          >
            <i data-lucide="sparkles" class="h-4 w-4"></i>
            <span id="btn-analyze-label">تحليل الأسئلة</span>
          </button>
        </div>
      </div>

      {/* Preview area (filled via JS) */}
      <div id="step-preview" class="hidden mt-8"></div>

      {/* Result area (filled via JS) */}
      <div id="step-result" class="hidden mt-8"></div>

      <template id="tpl-question">
        <div class="question-card rounded-xl border border-line bg-bg-card p-4" data-id="">
          <div class="flex items-start gap-3">
            <button class="drag-handle text-zinc-500 hover:text-white mt-1" title="إعادة ترتيب"><i data-lucide="grip-vertical" class="h-4 w-4"></i></button>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <input class="q-title flex-1 min-w-0 bg-transparent border-b border-line focus:border-brand-500 outline-none text-sm font-medium py-1" dir="auto" />
                <select class="q-type bg-bg-soft border border-line rounded-lg px-2 py-1 text-xs">
                  <option value="short_text">نص قصير</option>
                  <option value="long_text">نص طويل</option>
                  <option value="multiple_choice">اختيار من متعدد</option>
                  <option value="checkboxes">مربعات اختيار</option>
                  <option value="dropdown">قائمة منسدلة</option>
                  <option value="yes_no">نعم / لا</option>
                  <option value="likert_5">ليكرت 5</option>
                  <option value="scale">مقياس خطي</option>
                  <option value="email">بريد إلكتروني</option>
                  <option value="phone">رقم هاتف</option>
                  <option value="number">رقم</option>
                  <option value="date">تاريخ</option>
                  <option value="time">وقت</option>
                  <option value="section_header">عنوان قسم</option>
                  <option value="description">وصف/تعليمات</option>
                </select>
                <label class="text-xs text-zinc-400 flex items-center gap-1">
                  <input type="checkbox" class="q-required" /> مطلوب
                </label>
                <button class="q-delete text-rose-400 hover:text-rose-300" title="حذف"><i data-lucide="trash-2" class="h-4 w-4"></i></button>
              </div>
              <div class="q-options mt-3 space-y-1.5"></div>
              <button class="q-add-option text-xs text-brand-300 hover:underline mt-2 hidden">+ إضافة خيار</button>
            </div>
          </div>
        </div>
      </template>

      <script src="/static/create.js"></script>
    </section>
  )
}
