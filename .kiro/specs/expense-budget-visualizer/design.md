# Design Document — Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a mobile-friendly single-page application (SPA) built with plain HTML, CSS, and Vanilla JavaScript. It runs entirely in the browser with no backend: all state is held in module-level global variables and persisted to the browser's `localStorage`. The app lets users record daily expense transactions, review them in a sortable list, visualize spending by category via a Chart.js pie chart, set a per-transaction budget limit with over-limit highlighting, manage custom categories, and toggle between light and dark themes.

Because the app uses no build toolchain or module bundler, the architecture is intentionally flat: one HTML file, one CSS file, one JS file, and Chart.js loaded from the jsDelivr CDN.

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Browser (SPA)                       │
│                                                        │
│  index.html  ──  style.css                             │
│       │                                                │
│  script.js                                             │
│  ├─ Global State   (transactions[], categories[],      │
│  │                  budgetLimit, chart)                 │
│  ├─ Init           (runs on page load)                  │
│  ├─ Event Listeners (form submit, sort, budget, theme) │
│  ├─ Render Functions (DOM manipulation)                │
│  │   ├─ renderTransactions()                           │
│  │   ├─ renderCategories()                             │
│  │   ├─ updateBalance()                                │
│  │   ├─ updateChart()                                  │
│  │   ├─ renderMonthlySummary()                         │
│  │   └─ renderBudgetStatus()                           │
│  ├─ Mutation Functions (add, delete, validate)         │
│  └─ Persistence Layer (localStorage read/write)        │
│                                                        │
│  CDN: https://cdn.jsdelivr.net/npm/chart.js            │
│  localStorage keys: transactions, categories,          │
│                     budgetLimit, theme                 │
└────────────────────────────────────────────────────────┘
```

The data flow is unidirectional: user gestures trigger event listeners → mutation functions update global state → render functions re-paint the relevant DOM sections → persistence functions sync state to `localStorage`.

---

## Components and Interfaces

### Global State Variables

| Variable | Type | localStorage key | Default |
|---|---|---|---|
| `transactions` | `Transaction[]` | `"transactions"` | `[]` |
| `categories` | `string[]` | `"categories"` | `["Food","Transport","Fun"]` |
| `budgetLimit` | `number` | `"budgetLimit"` | `0` (no limit) |
| `chart` | `Chart \| null` | — | `null` |

**Transaction object shape:**
```js
{
  name:     string,   // item description, 1–100 non-whitespace chars
  amount:   number,   // positive integer (Rupiah)
  category: string,   // must be a value present in categories[]
  date:     string    // ISO 8601 string (new Date().toISOString())
}
```

### Initialization (`init`)

Runs once on page load. Calls in order:
1. `renderCategories()` — populates the `<select>` from `categories[]`
2. `renderTransactions()` — renders the transaction list
3. `updateBalance()` — displays running total
4. `updateChart()` — draws or hides the pie chart
5. `renderMonthlySummary()` — renders monthly breakdown cards
6. `renderBudgetStatus()` — shows current budget limit status
7. `initTheme()` — reads `"theme"` from `localStorage` and applies it

### Form & Validation

**`validateForm(name, amount, category) → { valid: boolean, errors: object }`**

Validation rules:
- `name`: must not be empty/whitespace-only, must be ≤ 100 characters
- `amount`: must be a number > 0 (integer Rupiah; browser `type="number"` prevents non-numeric input)
- `category`: must be a non-empty string present in `categories[]`

On invalid submit: inline error messages are rendered below each invalid field. No toast is shown. The transaction array is not modified.

On valid submit: calls `addTransaction(name, amount, category)`.

### Transaction Mutations

**`addTransaction(name, amount, category)`**
1. Creates a `Transaction` object with `date = new Date().toISOString()`
2. Pushes to `transactions[]`
3. Calls `saveTransactions()`
4. Calls `renderTransactions()`, `updateBalance()`, `updateChart()`, `renderMonthlySummary()`
5. Clears all form fields (value reset to `""`, select reset to placeholder)
6. Calls `showToast("Transaction added")`

**`deleteTransaction(realIndex)`**
1. Splices `transactions[realIndex]` from the array
2. Calls `saveTransactions()`
3. Calls `renderTransactions()`, `updateBalance()`, `updateChart()`, `renderMonthlySummary()`
4. Calls `showToast("Transaction deleted")`

### Render Functions

**`renderTransactions()`**
- Reads `sortSelect.value` and calls `getSortedTransactions()` to get a view-ordered copy
- Renders each item as a `.transaction-item` div with: `{name} — Rp{amount} — {category}` and a Delete button
- Items with `amount > budgetLimit` (when limit is active) get the `.over-limit` class and a ⚠️ icon
- When `transactions.length === 0`, renders the empty-state paragraph

**`getSortedTransactions() → Transaction[]`**

Returns a **shallow copy** of `transactions[]` sorted by the current `sortSelect.value`:
- `"default"` — insertion order (no sort)
- `"amount-asc"` — ascending by amount
- `"amount-desc"` — descending by amount
- `"category"` — alphabetical by category (`localeCompare`)

The original `transactions[]` array is **never mutated** by sorting.

**`renderCategories()`**
- Rebuilds the `<select id="category">` options from `categories[]`
- Always prepends the `"Choose Category"` placeholder option

**`updateBalance()`**
- Sums all `transaction.amount` values
- Sets `#balance` text to `"Total: Rp" + total`
- Applies `.over-limit-balance` class when `budgetLimit > 0 && total > budgetLimit`

**`updateChart()`**
- Aggregates `totals[category] += amount` for all transactions
- Filters to labels/data where `totals[category] > 0`
- If empty, destroys any existing chart, shows `#chartPlaceholder`, hides canvas
- Otherwise, destroys any existing chart instance and creates a new `Chart` (type `"pie"`) with `generateColors(n)` palette

**`renderMonthlySummary()`**
- Groups transactions by `"YYYY-MM"` key derived from `item.date`
- Sorts month keys newest-first (`unknown` date falls last)
- For each month: renders a `.month-card` div with a header (`month label` + `Rp{total}`) and a `<ul>` category breakdown
- Applies `.over-limit-card` and `.over-limit-amount` classes when month total exceeds `budgetLimit`

**`renderBudgetStatus()`**
- When `budgetLimit > 0`: sets `#budgetStatus` text and `.budget-active` class
- When `budgetLimit === 0`: clears text and class

### Category Management

**`addCategoryBtn` click handler**
- Trims `newCategoryInput.value`; alerts if empty
- Case-insensitive duplicate check against `categories[]`; alerts if duplicate
- Pushes to `categories[]`, calls `saveCategories()`, `renderCategories()`, shows toast

**`resetCategoriesBtn` click handler**
- Confirms with user via `window.confirm`
- Resets `categories = ["Food", "Transport", "Fun"]`
- Calls `saveCategories()`, `renderCategories()`, shows toast

### Budget Limit

**`budgetSaveBtn` click handler**
- Validates `budgetInput.value` is a positive number
- Sets `budgetLimit`, writes `localStorage.setItem("budgetLimit", budgetLimit)`
- Calls `renderBudgetStatus()`, `renderTransactions()`, `updateBalance()`, `renderMonthlySummary()`
- Shows toast

**`budgetClearBtn` click handler**
- Sets `budgetLimit = 0`, removes `localStorage` key
- Clears `budgetInput.value`
- Calls render functions, shows toast

### Theme Toggle

**`initTheme()`** — reads `localStorage.getItem("theme")`, defaults to `"light"`, calls `applyTheme(saved)`.

**`applyTheme(theme)`** — sets `document.body.setAttribute("data-theme", theme)`, updates button text, writes to `localStorage`.

**`themeToggle` click** — reads current `data-theme`, toggles between `"light"` and `"dark"`.

### Toast

**`showToast(message)`**
- Sets `#toast` text, sets `display: "block"`
- After 3 seconds, sets `display: "none"`

### Persistence Layer

**`saveTransactions()`** — `localStorage.setItem("transactions", JSON.stringify(transactions))`

**`saveCategories()`** — `localStorage.setItem("categories", JSON.stringify(categories))`

Budget and theme are saved inline within their respective handlers.

---

## Data Models

### Transaction (runtime object)

```js
{
  name:     string,   // 1–100 chars, non-whitespace
  amount:   number,   // positive integer (Rupiah)
  category: string,   // element of categories[]
  date:     string    // ISO 8601, e.g. "2025-06-08T14:32:00.000Z"
}
```

### localStorage Schema

| Key | Serialized type | Example |
|---|---|---|
| `"transactions"` | JSON array of Transaction | `[{"name":"Lunch","amount":25000,"category":"Food","date":"2025-06-08T..."}]` |
| `"categories"` | JSON array of strings | `["Food","Transport","Fun","Coffee"]` |
| `"budgetLimit"` | Numeric string | `"50000"` |
| `"theme"` | String literal | `"dark"` or `"light"` |

### Chart Data Structure (runtime, not persisted)

```js
{
  labels: string[],         // category names with totals > 0
  datasets: [{
    data: number[],         // parallel totals for each label
    backgroundColor: string[] // hex color palette
  }]
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Transaction Addition Round-Trip (State + Persistence)

*For any* valid transaction (non-empty name ≤ 100 chars, positive amount, valid category), after calling `addTransaction`, the transaction array should contain that transaction as its last element, and parsing `localStorage.getItem("transactions")` should yield an array also containing that transaction.

**Validates: Requirements 1.1, 1.4, 7.2**

---

### Property 2: Balance Equals Sum of Transaction Amounts

*For any* array of transactions, the value displayed by `updateBalance` (the integer after the "Rp" prefix) should equal the arithmetic sum of all `transaction.amount` values in the array.

**Validates: Requirements 1.2, 3.2, 4.1, 4.2, 4.5**

---

### Property 3: Category Totals Aggregation

*For any* array of transactions, the object produced by the category-aggregation step inside `updateChart` should assign to each category key a value equal to the sum of all `amount` fields among transactions with that category. Categories with no transactions should not appear as keys (or have value 0, which is then filtered out).

**Validates: Requirements 1.3, 3.3, 6.1, 6.2, 6.3**

---

### Property 4: Invalid Name Input Rejected

*For any* string that is either composed entirely of whitespace characters or has length greater than 100 characters, the form validation logic should return an error for the item-name field and should leave the `transactions` array unchanged.

**Validates: Requirements 2.1, 1.7**

---

### Property 5: Invalid Amount Input Rejected

*For any* numeric value that is ≤ 0, or for an absent/empty amount field, the form validation logic should return an error for the amount field and should leave the `transactions` array unchanged.

**Validates: Requirements 2.2, 1.7**

---

### Property 6: Multiple Simultaneous Validation Errors

*For any* combination of invalid fields (empty name, non-positive amount, missing category), the validator should produce error messages for every invalid field in a single pass — it must not short-circuit after the first failure.

**Validates: Requirements 2.4**

---

### Property 7: Deletion Removes Exactly One Transaction and Preserves Order

*For any* transaction array of length n ≥ 1 and any valid index i, after calling `deleteTransaction(i)` the resulting array should have length n − 1, should not contain the deleted item at any position, and the relative order of all remaining items (those at indices < i and > i in the original array) should be preserved.

**Validates: Requirements 3.1, 5.2**

---

### Property 8: Transaction Rendering Contains Required Fields

*For any* non-empty transaction array, the HTML rendered by `renderTransactions` for each transaction item should contain the item's name, its amount formatted as "Rp{integer}", its category string, and a Delete button element.

**Validates: Requirements 5.1**

---

### Property 9: Sorted View Does Not Mutate Source Array

*For any* transaction array and any sort mode (`"default"`, `"amount-asc"`, `"amount-desc"`, `"category"`), calling `getSortedTransactions` should return an array that is a permutation of the source array, and the source `transactions` array should remain identical to its state before the call.

**Validates: Requirements 5.2**

---

### Property 10: localStorage Restore Round-Trip

*For any* valid JSON-serialized array of transaction objects stored under the key `"transactions"` in `localStorage`, the initialization sequence should load exactly those transactions into the `transactions` global — neither dropping entries nor injecting additional ones.

**Validates: Requirements 7.1, 7.2**

---

## Error Handling

| Scenario | Handling |
|---|---|
| Form submitted with invalid fields | Inline error messages shown below each invalid field; transaction NOT created; no toast |
| `localStorage` write failure on add/delete | Catch block shows an error Toast: "Could not save changes." |
| `localStorage` unavailable or corrupt JSON on load | `try/catch` around `JSON.parse`; initialize to empty array; show Toast "Saved data could not be loaded." |
| Parsed `localStorage` value is not an array | Same as corrupt JSON — fall back to `[]` |
| Duplicate category name (case-insensitive) | `alert()` "That category already exists." |
| Category name is empty/whitespace | `alert()` "Please enter a category name." |
| Budget input is empty or non-positive | `alert()` "Please enter a positive limit amount." |
| Chart.js not loaded (CDN failure) | `updateChart` will throw; a `try/catch` wrapper logs the error to console; the placeholder remains visible |

---

## Testing Strategy

### Unit Tests (example-based)

Unit tests cover deterministic, concrete behaviors where specific inputs produce specific outputs. They are particularly useful for:

- Empty-state rendering (no transactions → empty-state message; no chart → placeholder)
- Toast lifecycle (shown immediately, hidden after 3 s)
- Theme persistence (applied from `localStorage` on init; toggled correctly)
- `localStorage` error paths (unavailable storage, corrupt JSON)
- Budget clear/set single examples

Recommended tool: **Vitest** (zero-config, runs in jsdom environment).

### Property-Based Tests

Property-based testing (PBT) validates universal behaviors across hundreds of generated inputs. Each property below corresponds to a Correctness Property in this document.

Recommended library: **fast-check** (JavaScript PBT library, works with Vitest).

Minimum **100 iterations** per property test. Each test is tagged with a comment referencing the property.

```js
// Feature: expense-budget-visualizer, Property 1: Transaction addition round-trip
```

| Property | fast-check Arbitraries |
|---|---|
| P1 — Addition round-trip | `fc.record({ name: fc.string({minLength:1,maxLength:100}), amount: fc.integer({min:1}), category: fc.constantFrom(...categories) })` |
| P2 — Balance equals sum | `fc.array(transactionArb)` |
| P3 — Category totals aggregation | `fc.array(transactionArb, {minLength:1})` |
| P4 — Invalid name rejected | `fc.oneof(whitespaceStringArb, fc.string({minLength:101}))` |
| P5 — Invalid amount rejected | `fc.oneof(fc.constant(""), fc.integer({max:0}))` |
| P6 — Multiple errors simultaneous | `fc.subarray(["name","amount","category"], {minLength:2})` |
| P7 — Deletion removes one, preserves order | `fc.array(transactionArb, {minLength:1}).chain(arr => fc.tuple(fc.constant(arr), fc.integer({min:0,max:arr.length-1})))` |
| P8 — Rendering contains required fields | `fc.array(transactionArb, {minLength:1})` |
| P9 — Sorted view does not mutate source | `fc.tuple(fc.array(transactionArb), fc.constantFrom("default","amount-asc","amount-desc","category"))` |
| P10 — localStorage restore round-trip | `fc.array(transactionArb)` |

### Integration / Smoke Tests

- Chart.js CDN script tag present in `index.html`
- Viewport meta tag present with `content="width=device-width, initial-scale=1.0"`
- At viewport width 320 px, no horizontal overflow (CSS computed style check or screenshot regression)
- At viewport width 480 px, form inputs computed width equals container width
- Canvas element has `max-width: 100%` applied
