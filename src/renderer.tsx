import { jsxRenderer } from 'hono/jsx-renderer'

interface LayoutProps {
  title?: string
  description?: string
  hideNav?: boolean
  user?: { id: string; email: string; name?: string | null; picture?: string | null } | null
  active?: string
}

export const renderer = jsxRenderer(({ children, title, description, hideNav, user, active }: any & LayoutProps) => {
  const pageTitle = title ? `${title} | منشئ النماذج الذكي` : 'منشئ النماذج الذكي'
  const desc = description || 'حوّل أسئلة الاستبيان إلى Google Form في ثوانٍ. الصق النص أو ارفع ملف Word، والذكاء الاصطناعي يبني النموذج لك.'

  return (
    <html lang="ar" dir="rtl" class="dark">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={desc} />
        <meta name="theme-color" content="#0b0b0f" />
        <title>{pageTitle}</title>
        <link rel="icon" type="image/svg+xml" href="/static/favicon.svg" />
        {/* Tailwind CDN */}
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
              darkMode: 'class',
              theme: {
                extend: {
                  fontFamily: {
                    sans: ['"Inter"', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
                  },
                  colors: {
                    bg: { DEFAULT: '#0b0b0f', soft: '#111118', card: '#13131c' },
                    line: { DEFAULT: 'rgba(255,255,255,0.08)', strong: 'rgba(255,255,255,0.16)' },
                    brand: {
                      50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd',
                      400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9',
                      800: '#5b21b6', 900: '#4c1d95'
                    },
                  },
                  boxShadow: {
                    glow: '0 0 0 1px rgba(139,92,246,0.35), 0 12px 40px -10px rgba(139,92,246,0.45)',
                    card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 60px -30px rgba(0,0,0,0.6)'
                  }
                }
              }
            }
          `
        }} />
        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Lucide icons */}
        <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
        <link href="/static/style.css" rel="stylesheet" />
      </head>
      <body class="bg-bg text-zinc-100 antialiased min-h-screen font-sans selection:bg-brand-500/40">
        {/* Decorative background */}
        <div aria-hidden="true" class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div class="absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full bg-brand-600/15 blur-3xl"></div>
          <div class="absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full bg-sky-500/10 blur-3xl"></div>
          <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),transparent_60%)]"></div>
        </div>

        {!hideNav && <Navbar user={user} active={active} />}

        <main class="relative">{children}</main>

        {!hideNav && <Footer />}

        <script dangerouslySetInnerHTML={{ __html: `if(window.lucide){lucide.createIcons();}` }} />
      </body>
    </html>
  )
})

function Navbar({ user, active }: { user?: any; active?: string }) {
  const link = (href: string, label: string, key: string) => (
    <a
      href={href}
      class={`px-3 py-2 text-sm rounded-lg transition hover:text-white ${active === key ? 'text-white bg-white/5' : 'text-zinc-400'}`}
    >
      {label}
    </a>
  )
  return (
    <header class="sticky top-0 z-40 border-b border-line/60 backdrop-blur-xl bg-bg/70">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <a href="/" class="flex items-center gap-2 group">
          <div class="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow">
            <i data-lucide="sparkles" class="h-5 w-5 text-white"></i>
          </div>
          <div class="leading-tight">
            <div class="font-semibold tracking-tight">منشئ النماذج الذكي</div>
            <div class="text-[11px] text-zinc-500">Smart Forms Builder</div>
          </div>
        </a>

        <nav class="hidden md:flex items-center gap-1">
          {link('/', 'الرئيسية', 'home')}
          {user && link('/dashboard', 'لوحة التحكم', 'dashboard')}
          {user && link('/create', 'إنشاء نموذج', 'create')}
          {user && link('/history', 'سجل النماذج', 'history')}
          {link('/privacy', 'الخصوصية', 'privacy')}
        </nav>

        <div class="flex items-center gap-2">
          {user ? (
            <div class="flex items-center gap-2">
              {user.picture && (
                <img src={user.picture} alt="" class="h-8 w-8 rounded-full border border-line" />
              )}
              <div class="hidden sm:block text-sm text-zinc-300 max-w-[140px] truncate">{user.name || user.email}</div>
              <a
                href="/api/auth/logout"
                class="text-xs text-zinc-400 hover:text-white border border-line rounded-lg px-3 py-1.5 transition"
              >
                خروج
              </a>
            </div>
          ) : (
            <a
              href="/login"
              class="inline-flex items-center gap-2 bg-white text-bg font-medium text-sm rounded-xl px-4 py-2 hover:bg-zinc-200 transition"
            >
              <i data-lucide="log-in" class="h-4 w-4"></i>
              تسجيل الدخول
            </a>
          )}
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer class="mt-24 border-t border-line/60">
      <div class="max-w-6xl mx-auto px-6 py-10 grid sm:grid-cols-3 gap-6 text-sm text-zinc-400">
        <div>
          <div class="text-white font-semibold mb-2">منشئ النماذج الذكي</div>
          <p class="leading-relaxed">أداة بسيطة وقوية لتحويل نصوص الاستبيانات إلى Google Forms جاهزة في حسابك.</p>
        </div>
        <div class="flex flex-col gap-2">
          <a class="hover:text-white" href="/privacy">سياسة الخصوصية</a>
          <a class="hover:text-white" href="/terms">شروط الاستخدام</a>
          <a class="hover:text-white" href="/permissions">الصلاحيات المطلوبة</a>
        </div>
        <div class="text-zinc-500">
          صنع بواسطة المطورين • للطلاب والباحثين والمدربين
        </div>
      </div>
    </footer>
  )
}
