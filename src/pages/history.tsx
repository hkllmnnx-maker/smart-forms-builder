import type { FC } from 'hono/jsx'
import type { FormRow } from '../lib/db'

export const HistoryPage: FC<{ forms: FormRow[] }> = ({ forms }) => (
  <section class="max-w-5xl mx-auto px-4 sm:px-6 py-10">
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">سجل النماذج</h1>
        <p class="mt-1.5 text-sm text-zinc-400">جميع النماذج التي تم إنشاؤها من حسابك.</p>
      </div>
      <a href="/create" class="inline-flex items-center gap-2 bg-white text-bg font-semibold rounded-xl px-4 py-2.5 hover:bg-zinc-200 transition">
        <i data-lucide="plus" class="h-4 w-4"></i> نموذج جديد
      </a>
    </div>

    {forms.length === 0 ? (
      <div class="mt-10 rounded-2xl border border-line bg-bg-card p-12 text-center">
        <div class="mx-auto h-14 w-14 rounded-2xl bg-white/[0.04] border border-line flex items-center justify-center">
          <i data-lucide="inbox" class="h-6 w-6 text-zinc-500"></i>
        </div>
        <div class="mt-3 font-semibold">لا توجد نماذج بعد</div>
        <p class="text-sm text-zinc-400 mt-1">ابدأ بإنشاء نموذجك الأول الآن.</p>
        <a href="/create" class="mt-5 inline-flex items-center gap-2 bg-white text-bg font-semibold rounded-xl px-4 py-2 hover:bg-zinc-200 transition">
          <i data-lucide="sparkles" class="h-4 w-4"></i> إنشاء نموذج
        </a>
      </div>
    ) : (
      <div class="mt-8 space-y-3">
        {forms.map((f) => <FormRowCard f={f} key={String(f.id)} />)}
      </div>
    )}
  </section>
)

const FormRowCard: FC<{ f: FormRow }> = ({ f }) => {
  const statusClass =
    f.status === 'success' ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
    : f.status === 'failed' ? 'text-rose-300 bg-rose-500/10 border-rose-500/30'
    : 'text-amber-300 bg-amber-500/10 border-amber-500/30'

  const statusLabel = f.status === 'success' ? 'ناجح' : f.status === 'failed' ? 'فشل' : 'قيد التنفيذ'

  return (
    <div class="rounded-2xl border border-line bg-bg-card p-5 hover:border-brand-500/40 transition">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <div class="font-semibold truncate">{f.title || '(بدون عنوان)'}</div>
            <span class={`text-[10px] border rounded-md px-2 py-0.5 ${statusClass}`}>{statusLabel}</span>
            <span class="text-[10px] text-zinc-500 border border-line rounded-md px-2 py-0.5">{f.source_kind === 'docx' ? 'Word' : 'نص'}</span>
          </div>
          {f.description && <div class="text-sm text-zinc-400 mt-1 line-clamp-2">{f.description}</div>}
          <div class="mt-2 text-xs text-zinc-500 flex items-center gap-3 flex-wrap">
            <span><i data-lucide="list" class="inline h-3.5 w-3.5 align-[-2px] ml-1"></i> {f.question_count} سؤال</span>
            <span><i data-lucide="clock" class="inline h-3.5 w-3.5 align-[-2px] ml-1"></i> {new Date(f.created_at + 'Z').toLocaleString('ar')}</span>
          </div>
          {f.status === 'failed' && f.error_message && (
            <div class="text-xs text-rose-400 mt-2 line-clamp-2">{f.error_message}</div>
          )}
        </div>
        {f.status === 'success' && f.responder_url && (
          <div class="flex items-center gap-2">
            <a href={f.responder_url} target="_blank" rel="noopener" class="text-sm bg-white text-bg font-medium rounded-lg px-3 py-1.5 hover:bg-zinc-200 transition">
              فتح النموذج
            </a>
            {f.edit_url && (
              <a href={f.edit_url} target="_blank" rel="noopener" class="text-sm border border-line rounded-lg px-3 py-1.5 hover:bg-white/5 transition">
                تعديل
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
