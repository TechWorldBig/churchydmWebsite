# churchWebsite

## JSC Youth Development Ministry

React + TypeScript + Vite + Tailwind CSS + Framer Motion site built from the five supplied JSC campus screenshots.

## Run

```bash
npm install
npm run dev
```

The local Vite development server deliberately blocks the database-backed member, attendance, gallery, update, and administrator routes. It never loads those production records. `/api/assistant` runs locally using the server-only Gemini key from `.env.local`.

## Production build

```bash
npm run build
```

On Vercel, members and attendance are stored through the server-side Neon API. No member, attendance, login, or metadata data is stored in browser `localStorage`.

## Neon and Vercel setup

The app now includes Vercel serverless API routes for shared members and attendance data. In the Vercel project settings, add this environment variable for Production, Preview, and Development:

```env
DATABASE_URL=your_neon_postgres_connection_string
# POSTGRES_URL also works if that is the variable provided by Vercel/Neon
```

The value must be the Neon Postgres connection string and must never be placed in `VITE_` variables or committed to Git. The first API request creates the `members`, `attendance`, and `system_metadata` tables automatically.

## YDM assistant setup

The scoped YDM and Bible assistant uses the Gemini generateContent API. Add this server-side environment variable in the Vercel project settings for Production, Preview, and Development:

```env
GEMINI_API_KEY=your_gemini_api_key
# Optional; defaults to gemini-2.5-flash
GEMINI_MODEL=gemini-2.5-flash
```

Never expose the key through a `VITE_` variable. The dedicated Bible-reference lookup, member lookup, and attendance lookup continue to use their existing data sources.

For local chat, set GEMINI_API_KEY in .env.local and restart npm run dev. For hosted chat, set the same variable in Vercel and redeploy. Responses support custom preaching topics, missionary stories and simple Bible explanations in the requested language.

Language behavior follows the user's current request. An explicitly named language takes priority, otherwise Tamil or Malayalam script is detected automatically, and the saved English/Tamil/Malayalam preference is used for language-neutral prompts such as a bare Bible reference. Short follow-up questions continue in the prior answer's language.

## Chat security and production deployment

- Gemini credentials stay in server environment variables and HTTP authentication headers, never in browser code or model prompts. `.env.local` is Git-ignored. Every build scans client artifacts for configured secrets and common credential formats and fails if found.
- Sensitive questions return exactly `Ask church or bible related questions`; unrelated questions return exactly `Ask ydm or bible related questions`, in all languages. Deterministic filters run on both client and server; server validation also applies to direct API requests. A separate AI review checks generated answers and mixed-topic requests before release. Review failures never release an unchecked answer.
- Requests require JSON, have body/field limits and a shared provider deadline, and receive non-cacheable responses. Provider errors and request bodies are not logged. Supplied conversation history is untrusted and filtered. The model has no file, database, shell or credential-reading tools.
- On Vercel, chat limits use atomic Neon counters shared by all instances: 12 requests per IP per minute and 120 total per minute. `POST /api/auth/login` allows 5 attempts per IP per 15 minutes and returns `429` with `Retry-After` after that limit. Requests fail closed if the limiter database is unavailable. Local development uses an in-memory chat limiter. Configure Gemini quotas and optional edge/WAF protections for traffic abuse.
- Rotate any key shared in chat, set its replacement as `GEMINI_API_KEY` in Vercel, restrict it to the Gemini API, and redeploy. This repository cannot rotate Google credentials or configure Vercel account protections.
- Member, attendance and gallery writes require a server-verified administrator session and same-origin JSON requests. The first configured administrator sign-in creates an `admin_credentials` record in Neon with a bcrypt `password_hash`; the raw password is never stored in Neon. Sessions use opaque random tokens in HttpOnly, SameSite=Strict cookies (Secure and host-scoped in production). Only token hashes are stored in Neon; logout revokes the session, expiry is enforced server-side, and a changed stored password hash invalidates existing sessions. Browser storage cannot grant authorization. `/admin/dashboard` is server-protected and returns `401` without a valid session.

The server-only credential design follows [Google's key guidance](https://ai.google.dev/gemini-api/docs/api-key). Input filtering and independent output review follow [OWASP's prompt injection guidance](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html). Model scope checks reduce risk but cannot guarantee perfect resistance to every prompt injection.

## Administrator deployment setup

The old password embedded in browser code has been removed and must not be reused. Generate a new random local administrator password with:

```bash
node scripts/configure-admin.mjs
```

The script stores `ADMIN_USERNAME` and `ADMIN_PASSWORD` privately in Git-ignored `.env.local` without printing either credential. Copy those two values into the Vercel project's server environment settings for the desired environments, alongside `DATABASE_URL` and `GEMINI_API_KEY`, then redeploy. Never prefix secrets with `VITE_`. The administrator password must have at least 16 characters. Administrator login stays disabled until configured. The local Vite server deliberately blocks admin/database APIs; browser tests use isolated mocked data.

The database role must be able to create the `admin_sessions` and `api_rate_limits` tables as well as existing app tables. Production login and write flows must be smoke-tested with the configured deployment; automated local tests do not modify real member data. Public member and attendance pages retain their existing visibility, so publish only member details approved for public display.

## Verification

```bash
npm ci
npm run build
npx playwright install chromium webkit
npm test
```

The build type-checks frontend and API code and scans client artifacts for secrets. The test suite covers API refusal rules, authorization and CSRF rejection, session handling, input validation, chat, admin forms, gallery and attendance. Responsive tests visit every page at 320, 390, 768, 844 (landscape), 1366 and 1440 CSS-pixel widths, plus iPhone WebKit. They check page/control overflow, chat bounds, keyboard navigation and automated axe WCAG A/AA rules, and save screenshots under `test-results/`. View `playwright-report/index.html` after a run. Automated checks are not a full WCAG certification or physical-device test.

GitHub Actions runs the build, dependency audit and browser suite on main pushes and pull requests, using immutable action revisions and read-only repository permissions. Credentials and local reports are excluded from Git.
