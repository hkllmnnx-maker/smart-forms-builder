import type { FC } from 'hono/jsx'

export const LandingPage: FC<{ user?: any }> = ({ user }) => (
  <div>
    {/* HERO */}
    <section class="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
      <div class="text-center max-w-3xl mx-auto fade-in">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-line bg-white/[0.03] text-xs text-zinc-300 mb-6">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          مدعوم بالذكاء الاصطناعي — يدعم العربية بالكامل
        </div>
        <h1 class="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.15]">
          حوّل أسئلتك إلى
          <span class="block bg-gradient-to-l from-brand-300 via-brand-400 to-sky-400 bg-clip-text text-transparent">
            Google Form في ثوانٍ
          </span>
        </h1>
        <p class="mt-6 text-base sm:text-lg text-zinc-400 leading-relaxed">
          الصق نص الاستبيان أو ارفع ملف Word. الذكاء الاصطناعي يفهم الأسئلة، يحدد نوع كل سؤال،
          ثم ينشئ النموذج مباشرةً داخل حسابك في Google. أنت تراجع وتعدّل قبل الإنشاء.
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={user ? '/create' : '/login?next=%2Fcreate'}
            class="inline-flex items-center gap-2 bg-white text-bg font-semibold rounded-xl px-5 py-3 hover:bg-zinc-200 transition shadow-glow"
          >
            <i data-lucide="sparkles" class="h-5 w-5"></i>
            ابدأ الآن مجاناً
          </a>
          <a
            href="#how"
            class="inline-flex items-center gap-2 text-zinc-300 border border-line rounded-xl px-5 py-3 hover:bg-white/5 transition"
          >
            كيف يعمل؟
            <i data-lucide="arrow-left" class="h-4 w-4"></i>
          </a>
        </div>
        <p class="mt-4 text-xs text-zinc-500">لا نطلب إلا صلاحية إنشاء/تعديل Google Forms في حسابك.</p>
      </div>

      {/* Preview card */}
      <div class="mt-16 max-w-4xl mx-auto">
        <div class="rounded-2xl border border-line/80 bg-bg-card shadow-card overflow-hidden">
          <div class="flex items-center gap-2 px-4 py-3 border-b border-line/80 bg-white/[0.02]">
            <span class="h-3 w-3 rounded-full bg-red-500/70"></span>
            <span class="h-3 w-3 rounded-full bg-yellow-500/70"></span>
            <span class="h-3 w-3 rounded-full bg-green-500/70"></span>
            <span class="text-xs text-zinc-500 mr-3">معاينة الأسئلة</span>
          </div>
          <div class="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-line/60">
            <div class="p-5">
              <div class="text-xs text-zinc-500 mb-2">النص المُدخل</div>
              <pre class="text-sm whitespace-pre-wrap text-zinc-300 leading-7">
{`عنوان: استبيان رضا الطلاب

ما مستواك الدراسي؟
بكالوريوس
ماجستير
دكتوراه

هل تستخدم Google Forms؟
نعم
لا

ما رأيك في الخدمات؟
أوافق بشدة
أوافق
محايد
لا أوافق
لا أوافق بشدة`}
              </pre>
            </div>
            <div class="p-5">
              <div class="text-xs text-zinc-500 mb-2">النموذج الناتج</div>
              <div class="space-y-3">
                <PreviewQ title="ما مستواك الدراسي؟" type="اختيار من متعدد" opts={["بكالوريوس", "ماجستير", "دكتوراه"]} />
                <PreviewQ title="هل تستخدم Google Forms؟" type="نعم / لا" opts={["نعم", "لا"]} />
                <PreviewQ title="ما رأيك في الخدمات؟" type="ليكرت ٥" opts={["أوافق بشدة", "أوافق", "محايد", "لا أوافق", "لا أوافق بشدة"]} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* FEATURES */}
    <section id="how" class="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <div class="text-center max-w-2xl mx-auto">
        <h2 class="text-3xl sm:text-4xl font-bold tracking-tight">ميزات تجعلها أداتك المفضلة</h2>
        <p class="mt-3 text-zinc-400">دقة في التحليل، تحكم كامل قبل الإنشاء، وتصميم احترافي.</p>
      </div>

      <div class="mt-12 grid md:grid-cols-3 gap-4">
        <Feature icon="brain" title="تحليل ذكي هجين"
          desc="نظام قواعد دقيق يتعرف على ليكرت ونعم/لا واختيار متعدد، مع طبقة AI لحالات معقدة." />
        <Feature icon="file-text" title="دعم Word"
          desc="ارفع ملف .docx واستخرج الأسئلة تلقائياً. تحقق من النوع والحجم لمنع الملفات الخطرة." />
        <Feature icon="languages" title="عربية + إنجليزية"
          desc="واجهة RTL أصلية، وتحليل يفهم الترقيم العربي، علامات الاستفهام، وعبارات الموافقة." />
        <Feature icon="check-square" title="معاينة وتعديل"
          desc="عدّل نص السؤال، نوعه، خياراته، وأعد ترتيبه بالسحب والإفلات قبل الإنشاء." />
        <Feature icon="shield-check" title="أمان حقيقي"
          desc="OAuth مع state ضد CSRF، تشفير AES-GCM لـ refresh tokens، Rate limiting، وحدود مدخلات." />
        <Feature icon="zap" title="سريع وفوري"
          desc="يعمل على شبكة Cloudflare الطرفية، استجابة بأقل من ثانية لمعظم الطلبات." />
      </div>
    </section>

    {/* STEPS */}
    <section class="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <div class="grid md:grid-cols-4 gap-4">
        {[
          { n: '١', t: 'سجّل الدخول', d: 'بحساب Google الخاص بك.' },
          { n: '٢', t: 'ألصق النص أو ارفع Word', d: 'يدعم النصوص غير المرتبة.' },
          { n: '٣', t: 'راجع المعاينة', d: 'عدّل الأنواع والخيارات بسهولة.' },
          { n: '٤', t: 'احصل على الرابط', d: 'نموذج جاهز في حسابك.' }
        ].map((s) => (
          <div class="rounded-2xl border border-line bg-bg-card p-5">
            <div class="h-9 w-9 rounded-lg bg-brand-500/15 text-brand-300 flex items-center justify-center font-bold mb-3">{s.n}</div>
            <div class="font-semibold">{s.t}</div>
            <div class="text-sm text-zinc-400 mt-1">{s.d}</div>
          </div>
        ))}
      </div>
    </section>

    {/* CTA */}
    <section class="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <div class="rounded-3xl border border-line bg-gradient-to-br from-brand-900/30 to-bg-card p-10 text-center shadow-glow">
        <h3 class="text-2xl sm:text-3xl font-bold">جاهز لتجربتها؟</h3>
        <p class="mt-3 text-zinc-400">أنشئ نموذجك الأول الآن. مناسبة للطلاب، الخريجين، الباحثين، والمدربين.</p>
        <a
          href={user ? '/create' : '/login?next=%2Fcreate'}
          class="mt-6 inline-flex items-center gap-2 bg-white text-bg font-semibold rounded-xl px-5 py-3 hover:bg-zinc-200 transition"
        >
          <i data-lucide="rocket" class="h-5 w-5"></i> ابدأ الآن
        </a>
      </div>
    </section>
  </div>
)

const Feature = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
  <div class="rounded-2xl border border-line bg-bg-card p-5 hover:border-brand-500/40 transition group">
    <div class="h-10 w-10 rounded-xl bg-white/[0.04] border border-line flex items-center justify-center mb-4 group-hover:bg-brand-500/15 group-hover:border-brand-500/40 transition">
      <i data-lucide={icon} class="h-5 w-5 text-brand-300"></i>
    </div>
    <div class="font-semibold text-white">{title}</div>
    <p class="mt-1.5 text-sm text-zinc-400 leading-relaxed">{desc}</p>
  </div>
)

const PreviewQ = ({ title, type, opts }: { title: string; type: string; opts: string[] }) => (
  <div class="rounded-xl border border-line bg-white/[0.02] p-3">
    <div class="flex items-start justify-between gap-2">
      <div class="text-sm font-medium text-white">{title}</div>
      <span class="text-[10px] text-brand-300 bg-brand-500/10 border border-brand-500/30 rounded-md px-2 py-0.5 whitespace-nowrap">{type}</span>
    </div>
    <div class="mt-2 flex flex-wrap gap-1.5">
      {opts.map((o) => (
        <span class="text-xs text-zinc-300 border border-line bg-white/[0.03] rounded-md px-2 py-1">{o}</span>
      ))}
    </div>
  </div>
)
