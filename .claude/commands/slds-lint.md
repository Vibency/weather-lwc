# SLDS Linter & Validator

Perform a full Salesforce Lightning Design System (SLDS) lint and validation pass on all LWC components in this project. Work through each check category below, report every finding with file path + line number, and produce a summary at the end.

---

## Scope

Find all LWC component files:
- HTML templates: `force-app/**/lwc/**/*.html`
- CSS files: `force-app/**/lwc/**/*.css`
- JS files: `force-app/**/lwc/**/*.js` (exclude `*.test.js`)

---

## HTML Template Checks

### 1. Deprecated BEM double-dash class names
SLDS switched from `--` modifier syntax to `_` (underscore) modifiers in SLDS 2.
Flag any class matching the pattern `slds-[a-z]+(--)[a-z]`.

Examples of violations:
- `slds-text-heading--large` → should be `slds-text-heading_large`
- `slds-button--brand` → should be `slds-button_brand`
- `slds-media--center` → should be `slds-media_center`

### 2. Hardcoded inline styles with raw color or size values
Flag any `style="..."` attribute that contains a hex color (`#[0-9a-fA-F]{3,6}`), `rgb(`, or a raw `px`/`rem` font-size/color value not referencing a CSS custom property (`var(--`).

### 3. Missing ARIA attributes on interactive SLDS patterns
- `slds-progress-bar` elements must have `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
- `slds-spinner` elements must have `role="status"` and an assistive text element with class `slds-assistive-text`.
- Any `<div>` or `<span>` with an `onclick` handler should have `role` and `tabindex`.

### 4. Deprecated or non-standard SLDS utility classes
Flag any of the following known deprecated classes:
- `slds-truncate` used outside a flex container (should be inside `slds-has-flexi-truncate` or `slds-truncate` on direct child)
- `slds-page-header` without `role="banner"`
- `slds-form-element__control` without a sibling `slds-form-element__label`
- `slds-hide` / `slds-show` (use conditional rendering `lwc:if` instead for LWC)

### 5. `slds-icon` usage without a title or assistive text
Every `<lightning-icon>` must have an `alternative-text` attribute (maps to assistive text). Flag any missing it.

### 6. Invalid `slds-size_*` fractions
`slds-size_*-of-*` denominators must be one of: 1, 2, 3, 4, 5, 6, 7, 12. Flag any denominator outside this set.

---

## CSS Checks

### 7. Hardcoded color values outside fallback position
In SLDS 2, colors must come from `--slds-g-*` or `--slds-c-*` tokens. A hardcoded hex/rgb is only acceptable as a `var(--token, <fallback>)` second argument.

Flag any CSS property (e.g., `color:`, `background:`, `background-color:`, `border-color:`, `fill:`) whose value contains a raw hex (`#`) or `rgb(` **not** inside a `var(...)` fallback.

### 8. Use of deprecated `--lwc-*` tokens
`--lwc-*` design tokens are deprecated in SLDS 2. Flag any `--lwc-` prefixed CSS custom property reference.

### 9. Component tokens must use `--slds-c-` prefix pattern
Custom component-level tokens defined in `:host` should follow `--slds-c-<component>-<property>` naming. Flag tokens that start with `--` but don't follow either `--slds-g-`, `--slds-c-`, or a project-namespaced prefix convention.

### 10. No raw `!important` overrides on SLDS classes
`!important` may break SLDS theming hooks. Flag any `!important` declaration on a rule targeting an `slds-` class.

### 11. `:global()` usage audit
`:global(.slds-*)` overrides bypass SLDS styling hooks and can cause theme-breaking. Flag each occurrence and note whether a `--slds-c-*` hook exists that should be used instead.

### 12. Direct element selectors overriding SLDS
Rules like `button { ... }` or `a { color: ... }` inside a component stylesheet override SLDS base styles. Flag bare element selectors (no class/id qualifier) that set visual properties.

---

## JS Checks

### 13. Dynamic class construction using string concatenation of SLDS classes
Flag patterns like `'slds-' + variable` or template literals `` `slds-${variable}` `` — these break static analysis and can produce invalid class names.

### 14. Programmatic `style` property assignments with hardcoded values
Flag `this.template.querySelector(...).style.<prop> = '<hex-or-raw-value>'` — styles should use CSS custom properties instead.

---

## Reporting Format

For each finding output:

```
[SEVERITY] CHECK-## | <file>:<line>
  → <violation description>
  → Fix: <recommended fix>
```

Severity levels:
- `[ERROR]`   — breaks SLDS 2 compatibility or accessibility
- `[WARNING]` — deprecated pattern, will cause issues in future releases
- `[INFO]`    — best-practice deviation, not immediately harmful

After all findings, output a **Summary Table**:

| Check | File | Errors | Warnings | Info |
|-------|------|--------|----------|------|
| ...   | ...  | ...    | ...      | ...  |

End with:
- Total error count
- Total warning count
- Overall SLDS compliance score (0–100): `100 − (errors × 5) − (warnings × 2) − (info × 0.5)`, clamped to 0.
- Top 3 highest-priority fixes to address first.
