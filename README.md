# منشئ النماذج الذكي — Smart Forms Builder

أداة ويب احترافية تعمل بالذكاء الاصطناعي لإنشاء **Google Forms** تلقائياً من النصوص أو ملفات Word. تدعم العربية بالكامل (RTL)، مع تصميم احترافي، أمان عالي، ومحلل أسئلة هجين (قواعد + AI).

> **Live preview (sandbox):**  
> https://3000-iodkd4ssdqkaauor8znsn-0e616f0a.sandbox.novita.ai
>
> **GitHub:** https://github.com/hkllmnnx-maker/smart-forms-builder

---

## ✅ المميزات المنجزة (Completed features)

- **تسجيل دخول Google OAuth 2.0** مع `state` ضد CSRF و `access_type=offline` و `prompt=consent`.
- **تشفير refresh tokens** بـ AES-GCM (مفتاح مشتق من `SESSION_SECRET` عبر HMAC).
- **Session cookies موقعة** (HMAC-SHA256) + `HttpOnly`, `Secure`, `SameSite=Lax`.
- **محلل هجين للأسئلة**: قواعد ذكية تتعرف على ليكرت/نعم-لا/اختيار متعدد/قائمة/مربعات/أخرى/بريد/هاتف/تاريخ/وقت/رقم/نص قصير/نص طويل/قسم/وصف، مع طبقة AI اختيارية (OpenAI أو Gemini) للحالات المعقدة، مع validation و repair للمخطط النهائي.
- **استخراج Word (.docx)** داخل Cloudflare Worker بدون أي Node.js APIs (باستخدام `fflate` لفك ZIP + استخراج النص من `word/document.xml`).
- **إنشاء Google Form**: `forms.create` ثم `batchUpdate` يدعم كل أنواع الأسئلة بما فيها أقسام `pageBreakItem`.
- **معاينة كاملة قابلة للتعديل**: تعديل العنوان والوصف، تغيير نوع كل سؤال، إضافة/حذف خيارات، تفعيل/تعطيل "مطلوب"، خيار "أخرى"، **إعادة ترتيب بالسحب والإفلات**.
- **صفحات كاملة**: Landing، Login، Dashboard، Create (نص أو رفع Word)، History، Privacy، Terms، Permissions، 404/Error.
- **سجل النماذج** المنشأة لكل مستخدم مع روابط النموذج والتعديل وحالة كل عملية.
- **Rate limiting** ذكي مبني على D1 لكل مستخدم/IP لكل مسار.
- **Security headers** صارمة (CSP، HSTS، X-Frame-Options=DENY، Referrer-Policy، Permissions-Policy).
- **لا أسرار في الكود** — كل شيء عبر `.dev.vars` محلياً و `wrangler secret` في الإنتاج.
- **اختبارات حقيقية**: 26 اختبار وحدة + تكامل (analyzer, crypto, docx, integration) — كلها ناجحة.
- **بناء ناجح** كـ Cloudflare Pages Worker بحجم 125KB فقط.
- **تصميم RTL احترافي** بمستوى قريب من Linear/Vercel: Tailwind مع نظام ألوان/خطوط/تأثيرات متقن، Lucide icons، خط IBM Plex Sans Arabic، تأثيرات hover/focus/loading.

---

## 🌐 المسارات والـ URIs

### صفحات HTML
| المسار | الوصف |
| --- | --- |
| `GET /` | الصفحة الرئيسية (Landing) |
| `GET /login` | صفحة تسجيل الدخول |
| `GET /dashboard` | لوحة التحكم (تتطلب مصادقة) |
| `GET /create?tab=text\|upload` | صفحة إنشاء نموذج جديد |
| `GET /history` | سجل النماذج المنشأة |
| `GET /privacy` | سياسة الخصوصية |
| `GET /terms` | شروط الاستخدام |
| `GET /permissions` | شرح صلاحيات Google المطلوبة |
| `GET /error?reason=...` | صفحة خطأ احترافية |

### مسارات API
| المسار | الوصف |
| --- | --- |
| `GET /api/auth/login?next=...` | بدء OAuth (يُولّد `state` ويوجه إلى Google) |
| `GET /api/auth/callback?code&state` | استقبال OAuth code وإنشاء جلسة |
| `GET /api/auth/me` | معلومات المستخدم الحالي |
| `GET /api/auth/logout` | تسجيل خروج وإلغاء الجلسة |
| `POST /api/auth/revoke` | إلغاء تفويض Google وحذف refresh token |
| `POST /api/analyze` (auth) | تحليل نص → مخطط أسئلة (rate-limited: 30/min) |
| `POST /api/upload` (auth, multipart) | رفع .docx وتحليله (rate-limited: 15/min، ≤5MB) |
| `POST /api/forms/create` (auth) | إنشاء النموذج في Google Forms (rate-limited: 10/min) |
| `GET /api/forms` (auth) | جلب سجل النماذج للمستخدم |
| `GET /health` | فحص الصحة |

---

## 🧱 البنية (Tech stack)

- **Backend**: Hono 4 على Cloudflare Pages / Workers (Edge runtime).
- **Frontend**: JSX server-rendered + Vanilla JS (لا React/Bundles ثقيلة) + Tailwind CSS (CDN) + Lucide icons + خط IBM Plex Sans Arabic.
- **Database**: Cloudflare D1 (SQLite) — جداول: `users`, `sessions`, `oauth_states`, `generated_forms`, `rate_limits`.
- **AI Provider abstraction**: OpenAI (`gpt-4o-mini` افتراضي) أو Gemini (`gemini-2.0-flash`) أو لا شيء — يعمل بالكامل بدون AI.
- **Docx parsing**: `fflate` (pure JS ZIP) — يعمل داخل Worker بدون Node APIs.
- **Testing**: Vitest (26 tests).

---

## 📦 بنية المشروع

```
webapp/
├── src/
│   ├── index.tsx                 # نقطة الدخول (routes + middleware)
│   ├── renderer.tsx              # JSX layout (RTL، تصميم احترافي)
│   ├── lib/
│   │   ├── crypto.ts             # HMAC + AES-GCM + sha256
│   │   ├── cookies.ts            # Session/state cookies
│   │   ├── db.ts                 # D1 helpers + rate limiter
│   │   ├── middleware.ts         # auth, requireAuth, rate-limit, security headers
│   │   └── access-token.ts       # جلب access token من refresh المشفّر
│   ├── routes/
│   │   ├── auth.ts               # Google OAuth flow
│   │   └── api.ts                # analyze, upload, forms/create, history
│   ├── services/
│   │   ├── google-oauth.ts       # bare fetch لـ accounts.google.com
│   │   ├── google-forms.ts       # forms.create + batchUpdate
│   │   ├── analyzer.ts           # محلل هجين Rules + AI + schema validator
│   │   └── docx.ts               # استخراج نص من .docx عبر fflate
│   ├── pages/                    # JSX pages (landing, login, dashboard, ...)
│   └── types/                    # Bindings + Question schema
├── migrations/
│   └── 0001_initial_schema.sql   # جداول D1
├── public/static/                # css, js, favicon
├── tests/                        # 26 اختبار
├── ecosystem.config.cjs          # PM2
├── wrangler.jsonc                # Cloudflare Pages config (D1 binding)
├── vite.config.ts                # @hono/vite-build
└── .env.example / .dev.vars.example
```

---

## 🚀 كيفية التشغيل

### 1) إعداد Google Cloud Console
1. ادخل [Google Cloud Console](https://console.cloud.google.com/) ← أنشئ مشروعاً جديداً.
2. **APIs & Services → Library**: فعّل **Google Forms API**.
3. **OAuth consent screen**: اختر **External**، أضف اسم التطبيق + الإيميل + الـ scopes:
   - `openid`, `email`, `profile`
   - `https://www.googleapis.com/auth/forms.body`
4. **Credentials → Create credentials → OAuth client ID** → Web Application:
   - **Authorized redirect URI**: `http://localhost:3000/api/auth/callback` (محلياً) و/أو `https://<your-domain>/api/auth/callback`.
5. انسخ `Client ID` و `Client Secret` إلى `.dev.vars`.

### 2) إعداد البيئة المحلية
```bash
git clone https://github.com/hkllmnnx-maker/smart-forms-builder.git
cd smart-forms-builder
npm install

# اعداد متغيرات البيئة
cp .dev.vars.example .dev.vars
# عدّل .dev.vars وأضف:
#   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
#   SESSION_SECRET (شغّل: openssl rand -hex 32)
#   AI_PROVIDER=openai (اختياري) + OPENAI_API_KEY

# إعداد قاعدة البيانات
npm run db:migrate:local

# بناء + تشغيل
npm run build
pm2 start ecosystem.config.cjs
# الخدمة على http://localhost:3000
```

### 3) النشر إلى Cloudflare Pages (الإنتاج)
```bash
# تسجيل الدخول
npx wrangler login

# إنشاء قاعدة بيانات الإنتاج (مرة واحدة)
npx wrangler d1 create smart-forms-production
# انسخ database_id إلى wrangler.jsonc

# طبق migrations على قاعدة الإنتاج
npm run db:migrate:prod

# Secrets الإنتاج
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name smart-forms-builder
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name smart-forms-builder
npx wrangler pages secret put SESSION_SECRET --project-name smart-forms-builder
npx wrangler pages secret put GOOGLE_REDIRECT_URI --project-name smart-forms-builder
# اختياري:
npx wrangler pages secret put AI_PROVIDER --project-name smart-forms-builder
npx wrangler pages secret put OPENAI_API_KEY --project-name smart-forms-builder

# Deploy
npm run deploy:prod
```

---

## 🧪 الاختبارات

```bash
npm test
```

تشغيل 4 ملفات اختبار / 26 حالة:

- `tests/analyzer.test.ts` — التعرف على ليكرت، نعم/لا، اختيار متعدد، أخرى، أسئلة طويلة، email/phone، الأقسام، dropdown للقوائم الطويلة، checkboxes، required.
- `tests/crypto.test.ts` — توقيع الكوكيز والتلاعب بها، AES-GCM round-trip، توليد التوكنات.
- `tests/docx.test.ts` — استخراج نص عربي من docx مزيف، رفض ملف غير صالح.
- `tests/integration-analyze.test.ts` — استبيان كامل مختلط الأنواع.

نتيجة آخر تشغيل: ✅ **26/26 passed**.

---

## 🔒 المراجعة الأمنية

| البند | الحالة |
| --- | --- |
| لا hardcoded secrets | ✅ كل شيء عبر `.dev.vars` / `wrangler secret` |
| OAuth `state` ضد CSRF | ✅ موقّع وموثق في DB + cookie + استهلاك مرة واحدة |
| refresh tokens مشفّرة | ✅ AES-GCM بمفتاح مشتق من SESSION_SECRET |
| session cookies | ✅ HttpOnly + Secure + SameSite=Lax + موقّعة HMAC |
| لا token في logs | ✅ تم تنظيف console.error |
| Rate limiting | ✅ حدود لكل مسار/مستخدم/IP عبر D1 |
| Input validation | ✅ حدود طول النص (60K)، حجم الملف (5MB)، نوع MIME، magic bytes للـ docx |
| CSP صارم | ✅ default-src 'self' مع استثناءات محصورة |
| XSS | ✅ JSX يهرّب القيم تلقائياً + escape يدوي في JS |
| HSTS | ✅ max-age=63072000 |
| Frame-Options | ✅ DENY |
| Least privilege | ✅ `forms.body` فقط - لا Drive ولا Gmail |
| IDOR | ✅ كل استعلام مقيد بـ `user_id` |
| Error messages | ✅ لا تكشف تفاصيل داخلية للمستخدم |

---

## 🧠 نموذج البيانات

```
users(id PK, email, name, picture, refresh_token [AES-GCM], scopes, created_at, updated_at)
sessions(id PK, user_id FK, expires_at, ...)
oauth_states(state PK, expires_at, redirect_to)
generated_forms(id PK, user_id FK, google_form_id, title, description,
                responder_url, edit_url, question_count, status, error_message,
                source_kind text|docx, created_at)
rate_limits(key PK, count, window_started)
```

> ملاحظة: نص الأسئلة الكامل **لا يُخزَّن** في قاعدة البيانات — فقط بيانات وصفية. هذا قرار خصوصية واعٍ.

---

## 📝 ميزات لم تُنفَّذ بعد (Next steps)

- لوحة إدارية لاستعراض إحصائيات استخدام النظام.
- تصدير سجل النماذج كـ CSV.
- دعم استيراد من Excel/CSV بالإضافة إلى Word.
- معاينة شكل النموذج النهائي قبل الإنشاء (HTML render).
- إعادة الإنشاء بنقرة من سجل النماذج (clone).
- وضع نهاري (الواجهة حالياً ليلية افتراضياً، لكن البنية تدعم `dark` class).
- ترجمة كاملة EN (الواجهة جاهزة هيكلياً، تحتاج فقط ملفات i18n).
- توثيق Google OAuth verification الرسمي (مجهز لكنه يتطلب تقديم نموذج لـ Google).

---

## 📂 افتراضات تم اتخاذها (Assumptions)

- **مزود AI افتراضي**: `none` — الأداة تعمل بالكامل بمحرك القواعد. لتفعيل AI، عيّن `AI_PROVIDER=openai` + `OPENAI_API_KEY` (أو Gemini).
- **اسم المشروع على Cloudflare**: `smart-forms-builder` (يمكن تعديله).
- **اسم قاعدة D1**: `smart-forms-production` (يمكن تعديله بعد تعديل `wrangler.jsonc`).
- **عرض الأسئلة العربية**: نموذج Google Forms يدعم RTL تلقائياً عند احتواء الأسئلة على نص عربي.
- **حدود الإدخال**: 60,000 حرف للنص و5MB للملف — كافية لأي استبيان واقعي.

---

## 🤝 المساهمة

- الكود مقسم بوضوح: `lib/` (أدوات) + `services/` (منطق خارجي) + `routes/` (مسارات) + `pages/` (UI) + `types/` (عقد ثابت).
- كل تغيير: `npm run build` + `npm test` يجب أن ينجحا.

---

## 📜 الترخيص

MIT — استخدام حر للأغراض الشخصية والتعليمية والتجارية.
