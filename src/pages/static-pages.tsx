import type { FC } from 'hono/jsx'

const Wrap: FC<{ title: string; subtitle?: string; children?: any }> = ({ title, subtitle, children }) => (
  <section class="max-w-3xl mx-auto px-4 sm:px-6 py-12">
    <h1 class="text-3xl font-bold tracking-tight">{title}</h1>
    {subtitle && <p class="mt-2 text-zinc-400">{subtitle}</p>}
    <div class="prose-style mt-8 space-y-5 text-zinc-300 leading-8">{children}</div>
  </section>
)

export const PrivacyPage: FC = () => (
  <Wrap title="سياسة الخصوصية" subtitle="نحرص على حماية بياناتك واحترام خصوصيتك.">
    <h3 class="text-white font-semibold">البيانات التي نجمعها</h3>
    <p>عند تسجيل الدخول بواسطة Google نحصل على: المعرف الفريد (sub)، بريدك الإلكتروني، اسمك المعروض، وصورتك الرمزية (إن وُجدت). نحتفظ بـ refresh token مشفّر باستخدام AES-GCM في قاعدة بياناتنا لتمكين إنشاء النماذج لاحقاً دون إعادة تسجيل الدخول كل مرة.</p>
    <h3 class="text-white font-semibold">البيانات التي لا نجمعها</h3>
    <p>لا نقرأ النماذج الأخرى من حسابك، ولا نصل إلى Drive أو البريد. الصلاحية الوحيدة المطلوبة هي إنشاء/تعديل Google Forms (forms.body).</p>
    <h3 class="text-white font-semibold">معالجة النص والملفات</h3>
    <p>عند تحليل نص أو رفع ملف Word، نعالج المحتوى مؤقتاً لاستخراج الأسئلة. لا نخزّن نص الأسئلة الكامل في قاعدة البيانات افتراضياً؛ نسجّل فقط بيانات وصفية (عنوان النموذج، عدد الأسئلة، الحالة، الرابط الناتج).</p>
    <h3 class="text-white font-semibold">الذكاء الاصطناعي</h3>
    <p>إذا قمت بتفعيل مزود AI (OpenAI أو Gemini)، يُرسل نص الأسئلة إلى مزود الخدمة عبر API لتحليلها. لا نشارك هويتك مع المزود.</p>
    <h3 class="text-white font-semibold">الاحتفاظ بالبيانات</h3>
    <p>يمكنك حذف حسابك في أي وقت من خلال إلغاء التفويض في إعدادات حساب Google أو من خلال الأداة، مما يُزيل بياناتك من قواعدنا.</p>
    <h3 class="text-white font-semibold">الأمان</h3>
    <p>نستخدم HTTPS دائماً، نشفّر refresh tokens، نحمي من CSRF عبر state parameter، ونطبّق Rate Limiting لمنع إساءة الاستخدام.</p>
    <h3 class="text-white font-semibold">التواصل</h3>
    <p>لأي استفسار حول الخصوصية: راجع المستودع الرسمي للأداة.</p>
  </Wrap>
)

export const TermsPage: FC = () => (
  <Wrap title="شروط الاستخدام" subtitle="باستخدامك للأداة فإنك توافق على الشروط التالية.">
    <h3 class="text-white font-semibold">الاستخدام المقبول</h3>
    <p>الأداة مخصصة لإنشاء استبيانات مشروعة. يُمنع استخدامها لإرسال محتوى مسيء أو ضار أو ينتهك القوانين أو سياسات Google.</p>
    <h3 class="text-white font-semibold">المسؤولية</h3>
    <p>تُقدَّم الأداة "كما هي" دون أي ضمانات صريحة أو ضمنية. أنت المسؤول الوحيد عن محتوى نماذجك واستجاباتها.</p>
    <h3 class="text-white font-semibold">حدود الاستخدام</h3>
    <p>تطبَّق حدود معدّل الطلبات (Rate Limiting) لمنع إساءة الاستخدام. قد نوقف الحسابات التي تنتهك الشروط.</p>
    <h3 class="text-white font-semibold">حقوق Google</h3>
    <p>Google Forms علامة تجارية لـ Google LLC، ولسنا تابعين لشركة Google. هذه الأداة وسيط يستخدم Google Forms API الرسمية.</p>
  </Wrap>
)

export const PermissionsPage: FC = () => (
  <Wrap title="الصلاحيات المطلوبة من Google" subtitle="نطلب فقط الصلاحيات الضرورية لعمل الأداة — لا أكثر.">
    <ul class="space-y-3 list-disc pr-5">
      <li><strong>openid / email / profile</strong> — لتحديد هويتك وتسجيل دخولك (الاسم، البريد، الصورة). لا نحصل على كلمة المرور.</li>
      <li><strong>https://www.googleapis.com/auth/forms.body</strong> — لإنشاء وتعديل النماذج التي تنشئها أنت داخل هذه الأداة. لا تُتيح هذه الصلاحية قراءة ملفاتك الأخرى ولا الوصول إلى Drive.</li>
    </ul>
    <p>يمكنك إلغاء التفويض في أي وقت من <a class="text-brand-300 hover:underline" target="_blank" rel="noopener" href="https://myaccount.google.com/permissions">صفحة صلاحيات حسابك في Google</a>.</p>
    <p>قواعدنا:</p>
    <ul class="space-y-2 list-disc pr-5">
      <li>لا نطلب صلاحية Drive أو Gmail أو الاتصالات.</li>
      <li>refresh token مشفّر في قاعدة البيانات (AES-GCM).</li>
      <li>access tokens غير مُخزّنة — تُجلب عند الحاجة فقط.</li>
      <li>لا تُسجَّل أي tokens في السجلات (logs).</li>
    </ul>
  </Wrap>
)

export const ErrorPage: FC<{ reason?: string; status?: number }> = ({ reason, status }) => (
  <section class="max-w-md mx-auto px-4 sm:px-6 py-20 text-center">
    <div class="mx-auto h-14 w-14 rounded-2xl bg-rose-500/15 text-rose-300 flex items-center justify-center">
      <i data-lucide="alert-triangle" class="h-7 w-7"></i>
    </div>
    <h1 class="mt-5 text-2xl font-bold">حدث خطأ {status ? `(${status})` : ''}</h1>
    <p class="mt-2 text-zinc-400 text-sm">{reason || 'حدث خطأ غير متوقع. حاول مرة أخرى لاحقاً.'}</p>
    <div class="mt-6 flex items-center justify-center gap-2">
      <a href="/" class="bg-white text-bg font-medium rounded-xl px-4 py-2 hover:bg-zinc-200 transition">العودة للرئيسية</a>
      <a href="/login" class="border border-line rounded-xl px-4 py-2 hover:bg-white/5 transition">إعادة تسجيل الدخول</a>
    </div>
  </section>
)
