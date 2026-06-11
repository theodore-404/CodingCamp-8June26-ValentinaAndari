# Implementation Plan: Expense & Budget Visualizer

## Overview

The implementation refines and extends the existing single-file vanilla JS app (`html/index.html`, `css/style.css`, `js/script.js`) to satisfy every acceptance criterion in the requirements document. Work is organized into layers: validation hardening, persistence robustness, render completeness, sorting, budget/over-limit UI, monthly summary, theme toggle, responsive CSS polish, and a Vitest + fast-check property-based test suite. No build toolchain is introduced; Chart.js is loaded from the jsDelivr CDN.

---

## Tasks

- [ ] 1. Harden form validation with inline error messages
  - [ ] 1.1 Replace the single `alert()` guard with per-field inline error rendering
    - In `js/script.js`, implement `validateForm(name, amount, category)` that returns `{ valid, errors }` where `errors` is an object with keys `name`, `amount`, `category`
    - Validation rules: name must be non-empty/non-whitespace and ≤ 100 chars; amount must be a number > 0; category must be a non-empty string present in `categories[]`
    - Render error messages as `<p class="field-error">` elements inserted immediately below each invalid `<input>` / `<select>` in `index.html`; clear previous errors at the start of each submit attempt
    - On valid submit, call `addTransaction(name, amount, category)` instead of the inline push; on invalid submit, do NOT create a transaction and do NOT show a toast
    - _Requirements: 1.7, 2.1, 2.2, 2.3, 2.4_

  - [ ]* 1.2 Write property test — Property 4: Invalid name rejected
    - File: `tests/script.test.js`
    - Use `fc.oneof(fc.stringMatching(/^\s+$/), fc.string({ minLength: 101 }))` to generate bad names
    - Assert `validateForm(badName, 1, "Food").valid === false` and `errors.name` is set
    - Assert `transactions` array is unchanged
    - Tag: `// Feature: expense-budget-visualizer, Property 4: Invalid name rejected`
    - **Property 4: Invalid Name Input Rejected**
    - **Validates: Requirements 2.1, 1.7**

  - [ ]* 1.3 Write property test — Property 5: Invalid amount rejected
    - Use `fc.oneof(fc.constant(""), fc.integer({ max: 0 }))` to generate bad amounts
    - Assert `validateForm("Valid Name", badAmount, "Food").valid === false` and `errors.amount` is set
    - Assert `transactions` array is unchanged
    - Tag: `// Feature: expense-budget-visualizer, Property 5: Invalid amount rejected`
    - **Property 5: Invalid Amount Input Rejected**
    - **Validates: Requirements 2.2, 1.7**

  - [ ]* 1.4 Write property test — Property 6: Multiple simultaneous validation errors
    - Use `fc.subarray(["name","amount","category"], { minLength: 2 })` to pick combinations of invalid fields
    - For each combination, submit all-bad values and assert `errors` contains a key for every field in the combination
    - Tag: `// Feature: expense-budget-visualizer, Property 6: Multiple errors simultaneous`
    - **Property 6: Multiple Simultaneous Validation Errors**
    - **Validates: Requirements 2.4**

- [ ] 2. Implement robust `addTransaction` and localStorage persistence
  - [ ] 2.1 Extract `addTransaction(name, amount, category)` as a named function in `js/script.js`
    - Creates `{ name, amount: Number(amount), category, date: new Date().toISOString() }` and pushes to `transactions[]`
    - Wraps `saveTransactions()` in a `try/catch`; on failure calls `showToast("Could not save changes.")`
    - Calls `renderTransactions()`, `updateBalance()`, `updateChart()`, `renderMonthlySummary()`
    - Clears all form fields (value `""`, select reset to placeholder `""`)
    - Calls `showToast("Transaction added")`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 2.2 Harden `init` localStorage loading with `try/catch`
    - Wrap `JSON.parse(localStorage.getItem("transactions"))` in a `try/catch`; if it throws OR result is not an array, set `transactions = []` and call `showToast("Saved data could not be loaded.")`
    - Apply same guard to `categories` (fall back to `["Food","Transport","Fun"]`) and `budgetLimit` (fall back to `0`)
    - _Requirements: 7.1, 7.3_

  - [ ]* 2.3 Write property test — Property 1: Transaction addition round-trip
    - Generate valid transaction inputs with `fc.record({ name: fc.string({minLength:1,maxLength:100}).filter(s=>s.trim().length>0), amount: fc.integer({min:1}), category: fc.constantFrom("Food","Transport","Fun") })`
    - Call `addTransaction(name, amount, category)`; assert last element of `transactions[]` matches the input; assert `JSON.parse(localStorage.getItem("transactions"))` also contains that entry
    - Tag: `// Feature: expense-budget-visualizer, Property 1: Transaction addition round-trip`
    - **Property 1: Transaction Addition Round-Trip (State + Persistence)**
    - **Validates: Requirements 1.1, 1.4, 7.2**

  - [ ]* 2.4 Write property test — Property 10: localStorage restore round-trip
    - Serialize an arbitrary array of valid transaction objects to `localStorage.setItem("transactions", JSON.stringify(arr))`
    - Re-run the load/init logic; assert `transactions` equals `arr` element-for-element (no drops, no additions)
    - Tag: `// Feature: expense-budget-visualizer, Property 10: localStorage restore round-trip`
    - **Property 10: localStorage Restore Round-Trip**
    - **Validates: Requirements 7.1, 7.2**

- [ ] 3. Checkpoint — verify add/validate/persist tasks
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement `deleteTransaction` with persistence guard and balance/chart updates
  - [ ] 4.1 Wrap `deleteTransaction(realIndex)` splice + save in `try/catch`
    - On `saveTransactions()` failure, call `showToast("Could not save changes.")`; still update DOM so UI is consistent
    - After splice, call `saveTransactions()`, `renderTransactions()`, `updateBalance()`, `updateChart()`, `renderMonthlySummary()`, `showToast("Transaction deleted")`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 4.2 Write property test — Property 7: Deletion removes exactly one, preserves order
    - Use `fc.array(transactionArb, {minLength:1}).chain(arr => fc.tuple(fc.constant(arr), fc.integer({min:0, max:arr.length-1})))`
    - Before deletion, snapshot `transactions` length and elements; call `deleteTransaction(i)`; assert length is `n-1`, deleted item not present at any index, all others in original relative order
    - Tag: `// Feature: expense-budget-visualizer, Property 7: Deletion removes one, preserves order`
    - **Property 7: Deletion Removes Exactly One Transaction and Preserves Order**
    - **Validates: Requirements 3.1, 5.2**

- [ ] 5. Implement and test `updateBalance` and `getSortedTransactions`
  - [ ] 5.1 Ensure `updateBalance` sums all `transaction.amount` values and applies over-limit CSS class
    - Set `#balance` text to `"Total: Rp" + total`; apply `.over-limit-balance` when `budgetLimit > 0 && total > budgetLimit`, remove otherwise
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 5.2 Write property test — Property 2: Balance equals sum of transaction amounts
    - Use `fc.array(transactionArb)` to generate `transactions`; call `updateBalance()` (or the pure sum logic extracted from it); assert displayed integer equals `transactions.reduce((s,t) => s+t.amount, 0)`
    - Tag: `// Feature: expense-budget-visualizer, Property 2: Balance equals sum`
    - **Property 2: Balance Equals Sum of Transaction Amounts**
    - **Validates: Requirements 1.2, 3.2, 4.1, 4.2, 4.5**

  - [ ] 5.3 Ensure `getSortedTransactions` returns a shallow copy for all four sort modes
    - Verify `"default"` returns insertion order; `"amount-asc"` / `"amount-desc"` sort numerically; `"category"` uses `localeCompare`; original `transactions[]` must not be mutated in any case
    - _Requirements: 5.2_

  - [ ]* 5.4 Write property test — Property 9: Sorted view does not mutate source array
    - Use `fc.tuple(fc.array(transactionArb), fc.constantFrom("default","amount-asc","amount-desc","category"))`
    - Snapshot `transactions` before call; call `getSortedTransactions()`; assert snapshot equals `transactions` after call; assert returned array is a permutation of `transactions`
    - Tag: `// Feature: expense-budget-visualizer, Property 9: Sorted view does not mutate source`
    - **Property 9: Sorted View Does Not Mutate Source Array**
    - **Validates: Requirements 5.2**

- [ ] 6. Implement `renderTransactions` with over-limit highlighting and empty state
  - [ ] 6.1 Implement full `renderTransactions()` render loop
    - When `transactions.length === 0`, inject `<p id="emptyState">No transactions yet.</p>`
    - For each sorted item: render `.transaction-item` div with `{name} — Rp{amount} — {category}` span and Delete button
    - Add `.over-limit` class + ⚠️ icon when `budgetLimit > 0 && item.amount > budgetLimit`
    - Delete button uses `onclick="deleteTransaction(realIndex)"` where `realIndex = transactions.indexOf(item)`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 6.2 Write property test — Property 8: Rendering contains required fields
    - Use `fc.array(transactionArb, {minLength:1})` to set `transactions`; call `renderTransactions()`; for each item assert the rendered HTML contains `item.name`, `"Rp" + item.amount`, `item.category`, and a `<button>` element
    - Tag: `// Feature: expense-budget-visualizer, Property 8: Rendering contains required fields`
    - **Property 8: Transaction Rendering Contains Required Fields**
    - **Validates: Requirements 5.1**

- [ ] 7. Implement `updateChart` with category aggregation
  - [ ] 7.1 Implement category-totals aggregation and Chart.js pie chart creation/destruction
    - Aggregate `totals[category] += amount` for all transactions; filter to labels where `totals[k] > 0`
    - When no data: destroy existing chart, show `#chartPlaceholder`, hide `<canvas>`
    - Otherwise: destroy existing chart, create new `Chart` of type `"pie"` with `generateColors(n)` palette; wrap in `try/catch` logging CDN failure to console
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 7.2 Write property test — Property 3: Category totals aggregation
    - Use `fc.array(transactionArb, {minLength:1})`; extract the aggregation logic from `updateChart` into a pure helper `aggregateCategoryTotals(transactions)`; assert each category key equals the sum of amounts for that category in the input; assert categories with zero total are absent
    - Tag: `// Feature: expense-budget-visualizer, Property 3: Category totals aggregation`
    - **Property 3: Category Totals Aggregation**
    - **Validates: Requirements 1.3, 3.3, 6.1, 6.2, 6.3**

- [ ] 8. Checkpoint — verify balance, sort, render, chart tasks
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement `renderMonthlySummary` with over-limit card highlighting
  - [ ] 9.1 Implement `renderMonthlySummary()` with month grouping, category breakdown, and over-limit markup
    - Group by `"YYYY-MM"` key; sort newest-first (`unknown` last); for each month render `.month-card` with header (label + total) and `<ul>` category breakdown
    - Apply `.over-limit-card` to card and `.over-limit-amount` to total span when `budgetLimit > 0 && total > budgetLimit`; add ⚠️ icon to total
    - _Requirements: 1.3, 3.3, 6.1, 6.2_

- [ ] 10. Implement budget limit set/clear and `renderBudgetStatus`
  - [ ] 10.1 Wire `budgetSaveBtn` and `budgetClearBtn` event handlers
    - Save: validate positive number via `alert`; set `budgetLimit`; `localStorage.setItem("budgetLimit", budgetLimit)`; call `renderBudgetStatus()`, `renderTransactions()`, `updateBalance()`, `renderMonthlySummary()`; toast
    - Clear: `budgetLimit = 0`; `localStorage.removeItem("budgetLimit")`; clear `budgetInput.value`; call render functions; toast
    - `renderBudgetStatus()`: when limit > 0 set text + `.budget-active` class; else clear text and class
    - _Requirements: (budget feature — implicit in design)_

- [ ] 11. Implement theme toggle and persistence
  - [ ] 11.1 Implement `initTheme()`, `applyTheme(theme)`, and `themeToggle` click handler
    - `initTheme()` reads `localStorage.getItem("theme")` (default `"light"`) and calls `applyTheme`
    - `applyTheme(theme)` sets `document.body.setAttribute("data-theme", theme)`, updates button text (`"☀️ Light"` / `"🌙 Dark"`), and writes `localStorage.setItem("theme", theme)`
    - Click handler reads current `data-theme` and toggles between `"light"` and `"dark"`
    - _Requirements: (theme feature — implicit in design)_

- [ ] 12. Implement `renderCategories`, custom category add/reset
  - [ ] 12.1 Wire category add, reset, and `renderCategories`
    - `renderCategories()` rebuilds `<select id="category">` from `categories[]`, always prepending the `"Choose Category"` placeholder option
    - Add handler: trim input, alert if empty, case-insensitive duplicate check via `alert`, push + `saveCategories()` + `renderCategories()` + toast
    - Reset handler: `window.confirm` guard, reset to `["Food","Transport","Fun"]`, save, render, toast
    - _Requirements: (category feature — implicit in design)_

- [ ] 13. Add responsive CSS for mobile layouts
  - [ ] 13.1 Verify and complete `@media (max-width: 480px)` rules in `css/style.css`
    - All `<form>` inputs, selects, and submit button at `width: 100%`; `#addCategorySection` as `flex-direction: column`; `#budgetInputRow` wraps; `#listControls` stacks vertically; `#expenseChart` has `max-width: 100%`; no horizontal overflow at 320 px
    - Confirm viewport meta tag `content="width=device-width, initial-scale=1.0"` is present in `index.html`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 14. Set up Vitest + fast-check test scaffolding
  - [ ] 14.1 Create `package.json` and install Vitest and fast-check
    - Create `package.json` at workspace root with `"type": "module"`, `"scripts": { "test": "vitest --run" }`, `"devDependencies": { "vitest": "2.2.5", "fast-check": "3.22.0", "@vitest/coverage-v8": "2.2.5", "jsdom": "26.1.0" }`
    - Create `vitest.config.js` configuring `environment: "jsdom"` and `globals: true`
    - Create `tests/script.test.js` with boilerplate imports and helper `transactionArb` factory shared across all property tests
    - _Requirements: (testing infrastructure — enables all property test tasks)_

- [ ] 15. Extract pure helper functions and wire all property tests
  - [ ] 15.1 Extract `aggregateCategoryTotals(transactions)` as a pure exportable function in `js/script.js`
    - Returns `{ [category]: totalAmount }` for categories with `totalAmount > 0`; used internally by `updateChart` and tested independently
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 15.2 Confirm all ten property test stubs (tasks 1.2–1.4, 2.3–2.4, 4.2, 5.2, 5.4, 6.2, 7.2) are complete and pass with ≥ 100 iterations each
    - Run `npm test` and confirm zero failures
    - _Requirements: all requirements covered by Properties 1–10_

- [ ] 16. Final checkpoint — full test suite green
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All property tests require ≥ 100 fast-check iterations (fast-check default is 100)
- Each property test file begins with `// Feature: expense-budget-visualizer, Property N: ...`
- The `transactionArb` helper should be defined once at the top of `tests/script.test.js` and reused by all tests
- No build toolchain is added; `package.json` is only for running Vitest
- `js/script.js` must remain loadable directly from `index.html` via a `<script>` tag (use conditional exports or a thin adapter if pure functions need to be imported by tests)
- Checkpoints validate incremental progress and keep the app in a runnable state throughout implementation

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["14.1"] },
    { "id": 1, "tasks": ["1.1", "2.2", "13.1"] },
    { "id": 2, "tasks": ["2.1", "4.1", "5.1", "5.3", "9.1", "10.1", "11.1", "12.1"] },
    { "id": 3, "tasks": ["6.1", "7.1", "15.1"] },
    { "id": 4, "tasks": ["1.2", "1.3", "1.4", "2.3", "2.4", "4.2", "5.2", "5.4", "6.2", "7.2"] },
    { "id": 5, "tasks": ["15.2"] }
  ]
}
```
