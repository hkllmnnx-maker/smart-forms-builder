import type { FC } from 'hono/jsx'

export const LoginPage: FC<{ next?: string }> = ({ next }) => {
  const href = '/api/auth/login' + (next ? `?next=${encodeURIComponent(next)}` : '')
  return (
    <section class="max-w-md mx-auto px-4 sm:px-6 pt-20 pb-24">
      <div class="rounded-3xl border border-line bg-bg-card p-8 shadow-card fade-in">
        <div class="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow">
          <i data-lucide="lock-keyhole" class="h-6 w-6 text-white"></i>
        </div>
        <h1 class="mt-5 text-2xl font-bold text-center">تسجيل الدخول</h1>
        <p class="mt-2 text-sm text-center text-zinc-400">سجّل الدخول بحسابك في Google لإنشاء النماذج داخل حسابك مباشرةً.</p>

        <a
          href={href}
          class="mt-8 w-full inline-flex items-center justify-center gap-3 bg-white text-bg font-semibold rounded-xl px-4 py-3 hover:bg-zinc-200 transition"
        >
          <GoogleLogo />
          متابعة باستخدام Google
        </a>

        <div class="mt-6 text-xs text-zinc-500 leading-relaxed text-center">
          بالمتابعة فإنك توافق على
          {' '}<a class="text-brand-300 hover:underline" href="/terms">شروط الاستخدام</a>{' '}
          و
          {' '}<a class="text-brand-300 hover:underline" href="/privacy">سياسة الخصوصية</a>.
          <br />
          <a class="text-brand-300 hover:underline" href="/permissions">ما الصلاحيات التي نطلبها؟</a>
        </div>
      </div>
    </section>
  )
}

const GoogleLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="h-5 w-5">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.972 32.91 29.388 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.352 0-9.917-3.061-11.282-7.946l-6.522 5.025C9.5 39.556 16.227 44 24 44z"/>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.094 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </svg>
)
