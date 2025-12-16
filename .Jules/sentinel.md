# Sentinel's Journal

## 2025-12-16 - Secure API Handling
**Learning:** Hardcoding API keys in frontend code (HTML/JS) exposes them to the public, leading to security breaches.
**Action:** Always store API keys in `PropertiesService.getScriptProperties()` and access them via server-side functions. Never print keys to the console or include them in client-side artifacts.

## 2025-12-16 - HTML Output Sanitization
**Learning:** Directly outputting user input in HTML using `<?!= var ?>` can lead to Cross-Site Scripting (XSS) vulnerabilities.
**Action:** Use `HtmlService.createTemplateFromFile()` and print variables with `<?= var ?>` (context-aware escaping) by default. Only use `<?!= var ?>` if the content is trusted HTML and has been sanitized server-side.

## 2025-12-16 - Server-Side Validation
**Learning:** Client-side validation is for UX only and can be bypassed.
**Action:** Always re-validate all inputs (types, formats, permissions) in the `.gs` server-side functions before processing. Check `Session.getActiveUser().getEmail()` to verify authorization.
