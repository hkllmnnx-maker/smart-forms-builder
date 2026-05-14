import type { FC } from 'hono/jsx'

export const DashboardPage: FC<{ user: any; stats: { total: number; success: number; failed: number } }> = ({ user, stats }) => (
  <section class="max-w-6xl mx-auto px-4 sm:px-6 py-12">
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">مرحباً، {user.name || user.email} 👋</h1>
        <p class="mt-1 text-zinc-400 text-sm">ابدأ بإنشاء نموذج جديد أو تصفح سجل النماذج.</p>
      </div>
      <a href="/create" class="inline-flex items-center gap-2 bg-white text-bg font-semibold rounded-xl px-4 py-2.5 hover:bg-zinc-200 transition">
        <i data-lucide="plus" class="h-4 w-4"></i> نموذج جديد
      </a>
    </div>

    <div class="grid sm:grid-cols-3 gap-4 mt-8">
      <Stat icon="layers" label="إجمالي النماذج" value={stats.total} />
      <Stat icon="check-circle-2" label="ناجحة" value={stats.success} accent="text-emerald-400" />
      <Stat icon="alert-circle" label="فشلت" value={stats.failed} accent="text-rose-400" />
    </div>

    <div class="grid md:grid-cols-2 gap-4 mt-8">
      <a href="/create" class="rounded-2xl border border-line bg-bg-card p-6 hover:border-brand-500/40 transition group">
        <div class="h-11 w-11 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center mb-3">
          <i data-lucide="wand-2" class="h-5 w-5"></i>
        </div>
        <div class="font-semibold text-lg">إنشاء نموذج من نص</div>
        <p class="text-sm text-zinc-400 mt-1.5">الصق أسئلة الاستبيان وسنحلّلها تلقائياً.</p>
      </a>
      <a href="/create?tab=upload" class="rounded-2xl border border-line bg-bg-card p-6 hover:border-brand-500/40 transition group">
        <div class="h-11 w-11 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center mb-3">
          <i data-lucide="file-up" class="h-5 w-5"></i>
        </div>
        <div class="font-semibold text-lg">رفع ملف Word</div>
        <p class="text-sm text-zinc-400 mt-1.5">يدعم ملفات .docx حتى 5 ميجابايت.</p>
      </a>
    </div>

    <div class="mt-10 rounded-2xl border border-line bg-bg-card p-6">
      <div class="flex items-center justify-between">
        <div class="font-semibold">نصائح لنتائج أفضل</div>
        <a href="/history" class="text-sm text-brand-300 hover:underline">عرض السجل ←</a>
      </div>
      <ul class="mt-3 text-sm text-zinc-400 space-y-1.5 list-disc pr-5">
        <li>ضع كل سؤال في سطر، والخيارات في أسطر تالية.</li>
        <li>استخدم عبارات مثل "أوافق بشدة، أوافق، محايد..." لتفعيل ليكرت تلقائياً.</li>
        <li>أضف "(مطلوب)" بعد السؤال لجعله إلزامياً.</li>
        <li>اكتب "أخرى:" لإضافة خيار "أخرى" مع حقل نصي.</li>
      </ul>
    </div>
  </section>
)

const Stat = ({ icon, label, value, accent }: any) => (
  <div class="rounded-2xl border border-line bg-bg-card p-5">
    <div class="flex items-center gap-3">
      <div class="h-10 w-10 rounded-xl bg-white/[0.04] border border-line flex items-center justify-center">
        <i data-lucide={icon} class={`h-5 w-5 ${accent || 'text-brand-300'}`}></i>
      </div>
      <div>
        <div class="text-xs text-zinc-500">{label}</div>
        <div class="text-2xl font-bold">{value}</div>
      </div>
    </div>
  </div>
)
