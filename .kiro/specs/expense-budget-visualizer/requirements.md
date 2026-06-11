# Requirements Document

## Introduction

The Expense & Budget Visualizer is a mobile-friendly single-page web application that helps users track their daily spending. Users can add and delete transactions (each with a name, amount, and category), view a running total balance, browse a history of all transactions, and see a pie chart visualizing spending broken down by category. All data is persisted in the browser's Local Storage so it survives page refreshes without requiring a backend server. The app is built with plain HTML, CSS, and Vanilla JavaScript.

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application.
- **Transaction**: A single expense entry consisting of an item name, a monetary amount (in Rupiah), and a category.
- **Category**: A classification label for a transaction. Supported categories are Food, Transport, and Fun.
- **Balance**: The sum of the amounts of all current transactions displayed to the user.
- **Transaction_List**: The on-screen scrollable list showing all recorded transactions.
- **Chart**: The pie chart rendered on a `<canvas>` element using Chart.js that visualizes spending totals by category.
- **Local_Storage**: The browser's Web Storage API used to persist transaction data client-side.
- **Toast**: A brief, non-blocking notification message shown to the user after an action completes, displayed for 3 seconds.
- **Form**: The HTML input form used to add a new transaction.
- **Validator**: The client-side logic that checks Form inputs before a transaction is created.

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to add a new expense transaction, so that I can record what I spent money on.

#### Acceptance Criteria

1. WHEN a user fills in a non-empty item name (maximum 100 characters), a positive numeric amount between 0.01 and 999,999,999.99, and selects a valid category, and submits the Form, THE App SHALL create a new Transaction and append it to the Transaction_List.
2. WHEN a Transaction is successfully added, THE App SHALL update the Balance to reflect the new total.
3. WHEN a Transaction is successfully added, THE App SHALL update the Chart to reflect the new category totals.
4. WHEN a Transaction is successfully added, THE App SHALL persist all transactions to Local_Storage immediately.
5. WHEN a Transaction is successfully added, THE App SHALL display a Toast notification confirming the addition for 3 seconds.
6. WHEN a Transaction is successfully added, THE Form SHALL clear all input fields (text, number, and select reset to placeholder) so the user can enter the next transaction.
7. WHEN a user submits the Form with invalid data, THE Validator SHALL display an inline error message below the relevant field and SHALL NOT create a Transaction.

---

### Requirement 2: Validate Form Input

**User Story:** As a user, I want to be prevented from submitting incomplete or invalid data, so that only meaningful transactions are recorded.

#### Acceptance Criteria

1. WHEN a user submits the Form with an empty item name field (including whitespace-only input) or an item name exceeding 100 characters, THE Validator SHALL prevent the Transaction from being created and SHALL display an inline error message indicating the item name is required and must be 1–100 non-whitespace characters.
2. WHEN a user submits the Form with an empty, zero, or negative amount, THE Validator SHALL prevent the Transaction from being created and SHALL display an inline error message indicating a positive amount between 0.01 and 999,999,999.99 is required.
3. WHEN a user submits the Form without selecting a category, THE Validator SHALL prevent the Transaction from being created and SHALL display an inline error message indicating a category selection is required.
4. IF multiple fields are invalid when the Form is submitted, THEN THE Validator SHALL display error messages for all invalid fields simultaneously.

---

### Requirement 3: Delete a Transaction

**User Story:** As a user, I want to delete a transaction from the list, so that I can correct mistakes or remove entries I no longer need.

#### Acceptance Criteria

1. WHEN a user clicks the delete button on a Transaction entry, THE App SHALL remove that Transaction from the Transaction_List immediately.
2. WHEN a Transaction is deleted, THE App SHALL update the Balance to reflect the new total and SHALL display a Toast notification confirming the deletion for 3 seconds.
3. WHEN a Transaction is deleted, THE App SHALL update the Chart to reflect the new category totals.
4. WHEN a Transaction is deleted, THE App SHALL persist the updated transaction list to Local_Storage before the next user interaction is accepted.
5. IF Local_Storage write fails after a deletion, THEN THE App SHALL display a Toast notification informing the user that the change could not be saved persistently.

---

### Requirement 4: Display Balance

**User Story:** As a user, I want to see my total spending balance at a glance, so that I know how much I have spent in total.

#### Acceptance Criteria

1. THE App SHALL display the Balance as the sum of all transaction amounts in the Transaction_List, formatted with a "Rp" prefix and the integer part of the total (e.g., Rp15000), truncating any fractional part.
2. WHEN there are no transactions, THE App SHALL display a Balance of Rp0.
3. WHEN a Transaction is added, THE App SHALL recalculate and display the updated Balance within 1 second.
4. WHEN a Transaction is deleted, THE App SHALL recalculate and display the updated Balance within 1 second.
5. THE App SHALL include all transaction amounts in the Balance calculation regardless of their value, and the Balance label SHALL remain visible at all times.

---

### Requirement 5: Display Transaction History

**User Story:** As a user, I want to see a history of all my transactions, so that I can review what I have spent.

#### Acceptance Criteria

1. THE App SHALL display each Transaction in the Transaction_List showing the item name, amount formatted as "Rp[whole integer amount]" with no decimal places, category, and a delete button.
2. THE Transaction_List SHALL display transactions in the order they were added, with the most recently added transaction appearing last; after a deletion, the remaining transactions SHALL preserve their original relative order.
3. WHILE the Transaction_List contains more entries than fit in the visible area, THE App SHALL make only the Transaction_List area scrollable, keeping all elements outside it stationary and fully visible.
4. IF there are no transactions, THEN THE Transaction_List SHALL display an empty state message indicating no transactions have been added yet.

---

### Requirement 6: Visualize Spending by Category (Chart)

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL display spending totals broken down by category (Food, Transport, Fun) as a pie chart rendered on a `<canvas>` element.
2. WHEN the Transaction_List changes (due to an add or delete), THE App SHALL update the Chart to reflect the current spending totals per category.
3. WHEN a category has a spending total of zero, THE Chart SHALL exclude that category's segment from the pie chart to avoid misleading visuals.
4. THE Chart SHALL render using the Chart.js library loaded from the jsDelivr CDN (`https://cdn.jsdelivr.net/npm/chart.js`).
5. WHEN there are no transactions, THE App SHALL hide the Chart canvas and display a placeholder message prompting the user to add transactions.

---

### Requirement 7: Persist Data Across Sessions

**User Story:** As a user, I want my transactions to be saved when I close or refresh the page, so that I do not lose my spending history.

#### Acceptance Criteria

1. WHEN the App loads, IF Local_Storage contains a valid JSON array of transaction objects, THEN THE App SHALL restore those transactions to the Transaction_List, Balance, and Chart before any user interaction is possible.
2. WHEN a Transaction is added or deleted, THE App SHALL save the complete updated transaction list to Local_Storage as a JSON-serialized string using the key `"transactions"`.
3. IF Local_Storage is unavailable OR the stored value fails JSON.parse() OR the parsed value is not an array, THEN THE App SHALL initialize with an empty transaction list and display a Toast notification informing the user that saved data could not be loaded.

---

### Requirement 8: Mobile-Friendly Responsive Layout

**User Story:** As a user browsing on a phone, I want the app to display correctly on a small screen, so that I can use it comfortably without zooming or horizontal scrolling.

#### Acceptance Criteria

1. THE App SHALL use a single-column layout with no horizontal overflow at screen widths of 320 px and above.
2. THE App SHALL include a viewport meta tag with `content="width=device-width, initial-scale=1.0"` to ensure correct scaling on mobile devices.
3. WHILE the screen width is 480 px or below, THE App SHALL display all Form inputs (text, number, and select elements) and the submit button at 100% of the container width with no horizontal overflow.
4. THE Chart canvas SHALL have a CSS `max-width` of 100% of its container and SHALL maintain its aspect ratio, introducing no horizontal scrollbar at any supported screen width.
