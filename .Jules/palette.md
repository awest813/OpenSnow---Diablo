## 2026-03-04 - Screen Reader Compatibility for Loading Bars
**Learning:** Loading progress bars that only rely on visual width scaling (`span` with dynamic `%` width) completely hide their progress context from screen readers. Since loading states can persist for several seconds (e.g., MPQ compression), this creates an ambiguous "dead zone" for visually impaired users.
**Action:** Always append `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` to dynamic width progress spans.
## 2024-03-08 - Accessible Touch Overlays
**Learning:** Standard mobile touch control overlays implemented with `<div>` elements natively lack accessibility properties, rendering them completely invisible to screen readers and keyboard navigation.
**Action:** Always add `role="button"`, `tabIndex={0}`, and explicit `aria-label` attributes to custom touch overlay interactions to ensure inclusive design.
## 2024-05-15 - Remove 'Click here' anti-pattern in links and buttons
**Learning:** Using 'Click here' as text for links or buttons significantly degrades accessibility, scannability, and UX. It provides no context for screen readers and forces users to read surrounding text to understand the action.
**Action:** Eliminate the 'Click here' anti-pattern. Ensure interactive elements use concise, actionable phrases (e.g., 'Compress the MPQ' or 'Download DIABDAT.MPQ') and move lengthy explanatory text outside the button.
