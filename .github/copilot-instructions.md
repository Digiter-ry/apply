# Copilot / AI agent instructions — Apply (Jobs UI)

Purpose: give AI coding agents short, precise guidance to be productive in this repository's UI module.

Key facts

- This folder is a UI-only module (no backend in this directory). See `jobs/README.md` and the top-level `README.md` for project context.
- Local run: copy `jobs/` to your XAMPP htdocs (Windows: `C:\xampp\htdocs\apply\jobs`) and open `http://localhost/apply/jobs/`.
- Frontend is plain HTML/CSS/vanilla JS. No build tools, no package.json in this folder. Avoid introducing heavy build infra without coordination.

Important files

- `jobs/jobs.html` — main HTML shell and structure.
- `jobs/assets/js/jobs-ui.js` — single-file UI logic. Contains:
  - `state` object and `state.form` keys for all form fields
  - localStorage persistence key: `jobs-ui`
  - step navigation, client-side draft generation (no network calls), export (.txt), and mailto send
- `jobs/assets/css/jobs-ui.css` — layout, breakpoints (768/1024/1200px) and visual rules.
- `jobs/assets/i18n/manifest.json` and `jobs/assets/js/i18n.js` — language-related artefacts.

Conventions & patterns agents must follow

- State binding: form field `id` values map 1:1 to `state.form` keys in `jobs-ui.js`. When adding a new input:
  1. Add `<input>` / `<textarea>` to `jobs/jobs.html` with an `id`.
  2. Add the same key to `state.form` in `jobs-ui.js` and add the input binding (see existing for examples).
  3. Update character counters (`[data-for]`) if applicable and call `updateCounts()` where needed.
- Persistence: use the existing `localStorage` usage (`localStorage.getItem('jobs-ui')` / `setItem('jobs-ui', ...)`). Keep the same key unless intentionally changing migration behavior.
- Accessibility: the UI uses ARIA, live regions, and focus management patterns (see `renderGuide`, focus logic in `jobs-ui.js`). Preserve these patterns when refactoring.
- No secrets/keys: do not add `.env` or API keys inside `jobs/`. This subfolder is explicitly UI-only (see `jobs/README.md`). If you need backend access, wire it into the separate backend service and document the required API contract.

Concrete example — Add a new short-answer field "linkedin":

1. `jobs/jobs.html` — add input
   <input id="linkedin" name="linkedin" class="input" type="url" placeholder="LinkedIn-profiili" />
2. `jobs/assets/js/jobs-ui.js` — add `linkedin: ''` to `state.form` and add the same input binding in the existing field-binding list so it saves to state and triggers `persist()` and `updateCounts()`.
3. Optional: add a `.field` styling or helpers in `jobs-ui.css` if layout adjustments are needed.

Testing & validation

- Manual local test (fast): copy `jobs/` into XAMPP htdocs, start Apache, open `http://localhost/apply/jobs/` and exercise the flows (step navigation, draft creation, export, send).
- Search patterns useful for edits: state.form, localStorage.getItem('jobs-ui'), button ids toStep2 and toStep3, exportDocx, and template ids tpl-guide-\*

What agents should avoid

- Do not introduce server-side code or credentials in this folder. The backend belongs to a separate service (see top-level README roadmap notes).
- Avoid adding external CDNs or fonts; the project intentionally keeps no external fonts/CDNs in `jobs.html`.

If you change behavior that affects integration (for example, turning client-side draft generation into an API call):

- Update `jobs/README.md` and the top-level `README.md` describing the new contract.
- Add a short example contract in the repo (e.g., `docs/api-contracts/jobs-draft.md`) describing request/response shapes.

If anything in these instructions seems incomplete or you want me to include additional examples (tests, cypress/playwright snippets, or an API contract template), tell me which area and I will iterate.
