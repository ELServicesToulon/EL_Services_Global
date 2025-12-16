# Palette's Journal

## 2024-05-22 - Icon-Only Buttons in Modern UI
**Learning:** Icon-only buttons in Tailwind/utility-first designs are visually clean but often lack `aria-label`, making them invisible to screen readers.
**Action:** Always verify icon-only buttons (`send`, `close`, `menu`) have explicit `aria-label` or `title` attributes.

## 2024-05-22 - Chat Input Experience
**Learning:** Single-line `<input>` for chat interfaces frustrates users who need to send detailed messages or multi-step instructions.
**Action:** Prefer auto-expanding `<textarea>` for chat inputs. Ensure `Shift+Enter` creates a newline while `Enter` sends the message for a desktop-like experience.

## 2025-12-16 - Loading States & Feedback
**Learning:** Users often abandon actions or click multiple times if there is no visual feedback during server processing (`google.script.run`).
**Action:** Always show a loading spinner, skeleton loader, or disable the submit button immediately upon interaction. Use `google.script.host.close()` only after success is confirmed.

## 2025-12-16 - Mobile Responsiveness
**Learning:** The application is frequently used on mobile devices by delivery drivers in the field. Fixed widths or hover-dependent interactions break the experience.
**Action:** Use percentage-based widths or Flexbox/Grid for layouts. Ensure touch targets (buttons/inputs) are at least 44px in height and easy to tap.
