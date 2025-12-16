# Bolt's Journal

## 2025-12-16 - Minimize Server Calls
**Learning:** `google.script.run` is asynchronous and has high latency (client-server round trip). Making multiple sequential calls drastically slows down the UI.
**Action:** Batch data retrieval into a single server-side function call that returns a JSON object containing all necessary data.

## 2025-12-16 - Spreadsheet Optimization
**Learning:** Reading (`getValue`) or writing (`setValue`) to Spreadsheets cell-by-cell is extremely slow due to API overhead.
**Action:** Use `range.getValues()` to read and `range.setValues()` to write entire 2D arrays in a single operation. Minimize use of `flush()` inside loops.

## 2025-12-16 - Cache Service Usage
**Learning:** Repeatedly fetching static data (like configuration or lists) from Spreadsheets is inefficient.
**Action:** Use `CacheService.getScriptCache()` to store frequently accessed, non-sensitive data for up to 6 hours. Implement a cache-first strategy.
