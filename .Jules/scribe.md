# Scribe's Journal

## 2025-12-16 - Code Documentation Standards
**Learning:** Functions without documentation are hard to maintain and debug for the team.
**Action:** Ensure every exported function (not ending in `_`) has a JSDoc block with `@description`, `@param` (with type), and `@return`.

## 2025-12-16 - Dead Code Elimination
**Learning:** Large codebases accumulate unused functions that bloat the project and confuse usage searches.
**Action:** Flag functions that are declared but never called within the project files. (Exception: `doGet`, `doPost`, `onOpen` triggers).

## 2025-12-16 - Project Structure
**Learning:** New developers struggle to find entry points.
**Action:** Maintain a clear mapping of entry points in the project documentation.
