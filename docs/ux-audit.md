# Typography and UX audit

Date: 2026-10-15. Product: HouseFamily, hosted in the Darna repository.

This is a review of the implementation and selected browser interactions. It is not a usability study with family members or an accessibility certification. Priorities below reflect the likely effect on completing everyday household tasks.

## Findings and changes

| Priority | Finding and evidence | User impact | Change delivered |
| --- | --- | --- | --- |
| P1 | The Home page treated a failed item request as an empty list. Session lookup redirected to Welcome for any error. | Connection problems could look like a healthy home or a lost sign-in. | Separate loading, failure, and successful empty states; retry controls; only a 401 session error redirects to sign-in. A cached session can remain visible with a refresh error. |
| P1 | Sheets used `aria-modal` without native modal behavior. Browser inspection found focus on the page body, scrolling enabled, and Escape leaving Add open. | Keyboard users could lose their place or interact with the background. | Native dialogs, unique labels, initial focus, inert background, Escape dismissal, scroll locking, and focus restoration. Destructive confirmations initially focus Cancel and cannot be dismissed or submitted again while pending. |
| P1 | Both dashboard counters linked to the same unfiltered Needs page. Filtered empty categories reused the healthy-household message. | Users could not easily find the items represented by a counter. | Status-specific links; All needs / Needed / Low controls; combined status/category filtering; contextual empty messages and Clear filters. Opening and closing Add retains the status filter. |
| P1 | Add had no Back action after choosing an item, silently limited browse/search results, and retained abandoned custom fields. | Finding or changing an item required closing and restarting; some catalog items were unreachable through browsing. | Complete catalog results; Back preserves search/category; keyboard focus follows the detail/back transition; closing resets abandoned fields; failures preserve the form and offer retry. Existing item priority is preserved when selecting it. |
| P1 | Several mutation failures had no visible recovery. Shopping could claim there was nothing to buy even though no trip had merely been started. | Failed changes could feel successful or leave users without a next step. | Localized inline retry feedback for item, shopping, issue, and family actions; pending labels; a distinct ready-to-shop state; checked state and progress exposed to assistive technology. |
| P2 | The browser confirmed Geist loaded, but section headings rendered at weight 400. Arabic had no dedicated font. Weights varied between values such as 650, 680, and 750. | Weak hierarchy and device-dependent Arabic rendering made scanning less consistent. | DM Sans for English/French, Noto Sans Arabic for Arabic, explicit heading weights, 400/500/600/700 weight roles, readable controls/supporting text, and script-specific line spacing. Existing layouts and heading sizes are retained. |
| P2 | Refetch on window focus was disabled and mutation invalidation omitted related activity/trip data. | Returning to the app could show older family information. | Refresh stale queries on focus/reconnection; invalidate related activity data; update the active trip cache when starting/finishing shopping. This does not provide realtime delivery. |
| P2 | Toast timeouts could dismiss a newer message; search, status controls, and password visibility lacked clear accessible labels/states. | Feedback could disappear early, and assistive technology could miss the meaning of controls. | Replace previous toast timers and clean them up; retain feedback for five seconds; label search/password controls and expose selected/checked states. Pending labels and the welcome quotation are translated. |

## Typography decisions

- DM Sans is used for Latin text; Noto Sans Arabic is applied to the Arabic locale. The Latin wordmark retains DM Sans even in RTL layouts.
- Fonts use `next/font` with self-hosted assets and `display: swap`; Arabic is not preloaded on Latin-only pages.
- Body and main form controls are 16px. Supporting copy is normally at least 14px; compact navigation and badges retain smaller labels where necessary.
- Section headings use weight 600 and page headings use 700. Arabic uses more generous line height and normal letter spacing.
- No changes were made to the palette, logo artwork, household data schema, or REST API.

## Verification

- Automated regression tests cover dialog focus/scroll/dismissal, pending destructive confirmations, toast timing/cleanup, accessible password controls, failed Home requests and retry recovery, 401 versus temporary session failures, summary links, status/category empty states, invalid status parameters, preserving filters through Add, complete catalog browsing, selection Back, abandoned form reset, preserved forms on failed saves and successful retry, and failed shopping toggle/finish actions.
- The initial audit had 25 passing web tests and 13 passing API tests. Lint, strict type checks, and production builds pass.
- Browser checks confirmed DM Sans loading and 600-weight section headings in French, and Noto Sans Arabic loading with RTL alignment and increased line spacing.
- Native modal behavior was checked in the browser: initial heading focus, Tab remaining inside, Escape closing Add, focus returning to the launcher, body scroll restoration, and the LOW filter surviving closure.
- French and Arabic Home, Needs, Shopping, Family, Activity, and Issues were checked in browser-hosted responsive frames at 390, 430, 640, 768, 1024, 1280, and 1536 CSS pixels. No document-level horizontal overflow was found. At 390px, the Add sheet stayed inside the viewport and its content scrolled independently.
- The 640px checks cover reflow equivalent to a 1280px viewport at 200% zoom. A separate full browser zoom interaction and an exhaustive device/screen-reader matrix remain manual follow-ups. The collaborative browser's resize operation was unreliable, so responsive frames were used instead.
- English login was also checked in responsive frames at the same seven widths without horizontal overflow. English flow behavior is covered by automated tests; French desktop flows and French/Arabic responsive screens received direct browser inspection. Further cross-device visual review remains useful.

## Follow-up recommendations

| Priority | Recommendation | Reason / boundary |
| --- | --- | --- |
| P1 before production | Complete notification delivery, then gate the permission prompt and success message on real configuration/subscription success. | The current notification flow can say it is ready without a configured delivery path. This pass does not add VAPID configuration or a delivery worker. |
| P2 | Decide whether the website should display Darna throughout. | Repository naming changed, but the interface, emails, manifest, and documentation still use HouseFamily. Rebranding was not included in this pass. |
| P2 | Localize built-in catalog/category names while preserving user-entered household names. | French/Arabic screens still show English seeded item and category names. This requires a deliberate distinction between catalog translations and family-authored content. |
| P2 | Test core tasks with family members of different ages: add a need, correct its status, shop, and join an invitation. | A code review cannot establish whether labels and interaction patterns match real users' expectations. Observe completion, hesitation, mistakes, and recovery. |
| P2 | Review notification, validation, and authentication feedback with actual screen readers and mobile keyboards. | Native semantics and browser checks reduce common problems but do not replace assistive-technology testing. |
| P3 | Evaluate live updates only if focus/reconnect refresh is insufficient. | Polling, realtime transport, notification preferences, and ownership of concurrent edits need product decisions and backend work. |

## References

- [DM Sans](https://fonts.google.com/specimen/DM+Sans)
- [Noto Sans Arabic](https://fonts.google.com/noto/specimen/Noto+Sans+Arabic)
- [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

## Shopping response follow-up

A real HTTP check found that `GET /api/shopping/active` returned HTTP 200 with an empty body when no trip existed. The Nest Express adapter discards a directly returned `null`, while the browser helper expects valid JSON. This caused the generic load error even though the database lookup succeeded.

The controller now explicitly serializes its result as JSON, including literal `null`. A controller-level HTTP regression test checks the body, content type, active-trip response, and household requirement. Frontend response-parsing tests preserve error handling for malformed responses and real API failures. The running browser recovered through Retry and displayed Start shopping normally.

Validation: 13 API tests and 25 web tests passed; the web suite was rerun with `--maxWorkers=1` after a parallel run hit a test timeout under concurrent compilation load. Lint, type checks, and production builds passed.

## Onboarding and loading follow-up

- Creating a home now refreshes the session cache before navigating to the dashboard and shows a success toast. A failed session refresh offers recovery without creating another home. Revisiting onboarding checks for an existing household first.
- Initial content loading uses page-specific skeletons for Dashboard, Needs, Shopping, Family, Activity, and Home Issues. Route and data-loading fallbacks share components; startup uses a branded status, actions show small spinners, and background refreshes preserve content. Reduced-motion styles disable loader animation.
- Shopping waits for both the trip and required item data before showing an empty or ready state. Cached data stays visible after background request failures with retry feedback.
- Browser favicons use transparent 16px, 32px, and 48px derivatives of the existing transparent logo source, with new URLs to avoid reusing the previous opaque icons.
- The web suite now has 42 passing tests. Browser checks confirmed a single creation request, visible success feedback, dashboard navigation, slow dashboard/activity loading with navigation retained, and 390px mobile layouts including Arabic RTL without horizontal overflow. The temporary local test account and household were removed after verification. Lint, type checks, and the production web build passed.
