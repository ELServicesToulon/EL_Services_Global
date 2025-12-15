# Palette's Journal

## 2024-05-22 - Icon-Only Buttons in Modern UI
**Learning:** Icon-only buttons in Tailwind/utility-first designs are visually clean but often lack `aria-label`, making them invisible to screen readers.
**Action:** Always verify icon-only buttons (`send`, `close`, `menu`) have explicit `aria-label` or `title` attributes.

## 2024-05-22 - Chat Input Experience
**Learning:** Single-line `<input>` for chat interfaces frustrates users who need to send detailed messages or multi-step instructions.
**Action:** Prefer auto-expanding `<textarea>` for chat inputs. Ensure `Shift+Enter` creates a newline while `Enter` sends the message for a desktop-like experience.
