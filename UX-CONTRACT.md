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

## Certificates

`/admin/certificates` is a separate admin section and uses the existing admin session. It reads saved members, attendance, and program points; it does not create certificate records. The selected year controls both award calculations. Perfect attendance requires a Present record for every meeting date recorded in that year. Bible Quiz, Bible Reference, and Song Survey awards rank total points separately for Kutties, Junior, and Senior members; tied scores share the same place. The admin selects a recipient, previews the landscape certificate, and uses the browser print dialog to save an A4 landscape PDF. If refreshing the source data fails, certificates are unavailable until a successful refresh.

The same screen places YDM membership cards below Certificates. The admin selects a saved member, previews the card, and prints it as a standard 85.6 × 54 mm card. The card displays the saved name, role, seniority, gender, unique YDM member number, YDM logo, and profile photo when available; initials are used when a photo is missing.

## Feedback and destructive actions

Existing forms keep entered values on recoverable errors and show the current success/error message inline. Deletes use the established admin action pattern; a later shared confirmation primitive should be adopted before expanding destructive workflows.

## Annual theme builder

The protected Yearly Report screen begins with an Annual Theme Builder. Admins can edit the year, bilingual theme, Scripture and annual message, review a bright dimensional preview with the YDM logo, and download a landscape A4 PDF without saving draft content to the database. The theme artwork does not include signature fields.

The Yearly Report below it produces a database-informed, two-page minimum A4 narrative in English or Tamil. Page one covers vision, membership, leadership and attendance; page two covers biblical learning, weekly ministry, gallery-event testimony, thanksgiving and the coming-year spiritual focus. Private contact details are excluded.

## Annual speeches

`/admin/annual-speeches` is a protected section beside Certificates. It prepares editable Year Welcome Speech and Vote of Thanks documents from the selected year's member totals, attendance activity, program participation, weekly programs and gallery-event descriptions. Admins choose English or Tamil and download each document as an A4 PDF. Contact details, addresses and birth dates are excluded from generated content.

## Christmas cake cover

`/admin/cake-cover` is a protected section beside Certificates. It provides an editable Christmas and New Year cake-distribution cover with the YDM logo, Luke 2:11, sender and year. The live preview matches the single square cover centered on its downloadable A4 portrait PDF.
