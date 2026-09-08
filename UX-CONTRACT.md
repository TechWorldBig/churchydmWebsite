# JSC YDM UI contract

## Sources and ownership

| Concern | Source of truth | UI owner |
| --- | --- | --- |
| Admin authentication and session authorization | `api/_lib/security.ts` | `src/data/adminSession.ts`, `src/pages/Admin.tsx` |
| Members, attendance, programs, gallery and weekly-program writes | Server API handlers | Existing admin forms and tables |
| Weekly program archive | `api/weekly-programs.ts` | `src/components/WeeklyPrograms.tsx` |
| Admin visual tokens | `DESIGN.md` and `src/index.css` shared classes | Existing shared classes |

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | Native `<select>` | `premium-ui.json` | Platform-owned popup | Keyboard selection and narrow-screen check |
| Date | Native `input[type="date"]` | `premium-ui.json` | Platform-owned calendar | Date value and keyboard entry |
| Scrollbar | Global application stylesheet | `src/index.css` | Archive-table geometry only | Archive scroll at long content |
| CRUD | Server API handlers | `api/*.ts` | Admin forms and tables | Authorized create, delete, and failure states |

## Admin authentication

The sign-in form calls `POST /api/auth/login` with same-origin JSON. A successful sign-in receives only an opaque HttpOnly session cookie. Invalid credentials, expired sessions, and protected mutations recover through the existing inline sign-in state. `/admin/dashboard` is a protected server route: unauthenticated requests receive `401`; authenticated requests continue to `/admin`.

## Weekly-program archive

The public program section is absent when there are no active rows. Rows expire after their program date and become archive records. The admin archive has an internal maximum-height scroll surface; each date row has one PDF download action for that week's records. The action is disabled only when no corresponding archive row exists.

## Feedback and destructive actions

Existing forms keep entered values on recoverable errors and show the current success/error message inline. Deletes use the established admin action pattern; a later shared confirmation primitive should be adopted before expanding destructive workflows.
