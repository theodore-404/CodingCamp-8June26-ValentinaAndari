// ── State ────────────────────────────────────────────────────────────────────

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let categories   = JSON.parse(localStorage.getItem("categories"))   || ["Food", "Transport", "Fun"];
let budgetLimit  = Number(localStorage.getItem("budgetLimit")) || 0;
let chart;

// ── DOM refs ─────────────────────────────────────────────────────────────────

const form             = document.getElementById("transactionForm");
const itemName         = document.getElementById("itemName");
const amount           = document.getElementById("amount");
const categorySelect   = document.getElementById("category");
const newCategoryInput  = document.getElementById("newCategoryInput");
const addCategoryBtn    = document.getElementById("addCategoryButton");
const resetCategoriesBtn = document.getElementById("resetCategoriesButton");
const sortSelect       = document.getElementById("sortSelect");
const budgetInput      = document.getElementById("budgetInput");
const budgetSaveBtn    = document.getElementById("budgetSaveBtn");
const budgetClearBtn   = document.getElementById("budgetClearBtn");
const themeToggle      = document.getElementById("themeToggle");

// ── Init ─────────────────────────────────────────────────────────────────────

renderCategories();
renderTransactions();
updateBalance();
updateChart();
renderMonthlySummary();
renderBudgetStatus();
initTheme();

// ── Theme (dark / light) ─────────────────────────────────────────────────────

function initTheme() {
    const saved = localStorage.getItem("theme") || "light";
    applyTheme(saved);
}

function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    themeToggle.textContent = theme === "dark" ? "☀️ Light" : "🌙 Dark";
    localStorage.setItem("theme", theme);
}

themeToggle.addEventListener("click", function() {
    const current = document.body.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
});

// ── Add transaction ───────────────────────────────────────────────────────────

form.addEventListener("submit", function(event) {
    event.preventDefault();

    if (itemName.value.trim() === "" ||
        amount.value === "" ||
        categorySelect.value === "") {
        alert("Please fill in all fields!");
        return;
    }

    const transaction = {
        name:     itemName.value.trim(),
        amount:   Number(amount.value),
        category: categorySelect.value,
        date:     new Date().toISOString()
    };

    transactions.push(transaction);
    saveTransactions();
    renderTransactions();
    updateBalance();
    updateChart();
    renderMonthlySummary();
    showToast("Transaction added");

    // Clear form
    itemName.value = "";
    amount.value = "";
    categorySelect.value = "";
});

// ── Add custom category ───────────────────────────────────────────────────────

addCategoryBtn.addEventListener("click", function() {
    const name = newCategoryInput.value.trim();

    if (name === "") {
        alert("Please enter a category name.");
        return;
    }

    // Prevent duplicates (case-insensitive)
    const exists = categories.some(function(c) {
        return c.toLowerCase() === name.toLowerCase();
    });

    if (exists) {
        alert("That category already exists.");
        return;
    }

    categories.push(name);
    saveCategories();
    renderCategories();
    newCategoryInput.value = "";
    showToast("Category \"" + name + "\" added");
});

resetCategoriesBtn.addEventListener("click", function() {
    if (!confirm("Reset categories to Food, Transport, and Fun? Your transactions will not be affected.")) {
        return;
    }
    categories = ["Food", "Transport", "Fun"];
    saveCategories();
    renderCategories();
    showToast("Categories reset to default");
});

// ── Render categories into <select> ──────────────────────────────────────────

function renderCategories() {
    // Keep the placeholder, rebuild the rest
    categorySelect.innerHTML = "<option value=\"\">Choose Category</option>";

    categories.forEach(function(cat) {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });
}

// ── Budget limit ──────────────────────────────────────────────────────────────

budgetSaveBtn.addEventListener("click", function() {
    const val = Number(budgetInput.value);
    if (!budgetInput.value || val <= 0) {
        alert("Please enter a positive limit amount.");
        return;
    }
    budgetLimit = val;
    localStorage.setItem("budgetLimit", budgetLimit);
    renderBudgetStatus();
    renderTransactions();
    updateBalance();
    renderMonthlySummary();
    showToast("Spending limit set to Rp" + budgetLimit);
});

budgetClearBtn.addEventListener("click", function() {
    budgetLimit = 0;
    localStorage.removeItem("budgetLimit");
    budgetInput.value = "";
    renderBudgetStatus();
    renderTransactions();
    updateBalance();
    renderMonthlySummary();
    showToast("Spending limit cleared");
});

function renderBudgetStatus() {
    const status = document.getElementById("budgetStatus");
    if (budgetLimit > 0) {
        budgetInput.value = budgetLimit;
        status.textContent = "Active limit: Rp" + budgetLimit + " — transactions above this are highlighted.";
        status.className = "budget-active";
    } else {
        status.textContent = "No limit set.";
        status.className = "";
    }
}

// ── Sort ──────────────────────────────────────────────────────────────────────

sortSelect.addEventListener("change", renderTransactions);

// ── Render transaction list ───────────────────────────────────────────────────

function getSortedTransactions() {
    // Shallow copy so original order is never mutated
    const sorted = transactions.slice();
    const mode = sortSelect.value;

    if (mode === "amount-asc") {
        sorted.sort(function(a, b) { return a.amount - b.amount; });
    } else if (mode === "amount-desc") {
        sorted.sort(function(a, b) { return b.amount - a.amount; });
    } else if (mode === "category") {
        sorted.sort(function(a, b) { return a.category.localeCompare(b.category); });
    }
    // "default" — insertion order, no sort needed

    return sorted;
}

function renderTransactions() {
    const list = document.getElementById("transactionList");

    if (transactions.length === 0) {
        list.innerHTML = "<p id=\"emptyState\">No transactions yet.</p>";
        return;
    }

    const sorted = getSortedTransactions();

    list.innerHTML = "";
    sorted.forEach(function(item, sortedIndex) {
        // Find the real index in the original array for correct deletion
        const realIndex = transactions.indexOf(item);
        const overLimit = budgetLimit > 0 && item.amount > budgetLimit;
        list.innerHTML += `
        <div class="transaction-item${overLimit ? " over-limit" : ""}">
            <span>${item.name} — Rp${item.amount} — ${item.category}${overLimit ? " ⚠️" : ""}</span>
            <button onclick="deleteTransaction(${realIndex})">Delete</button>
        </div>`;
    });
}

// ── Delete transaction ────────────────────────────────────────────────────────

function deleteTransaction(index) {
    transactions.splice(index, 1);
    saveTransactions();
    renderTransactions();
    updateBalance();
    updateChart();
    renderMonthlySummary();
    showToast("Transaction deleted");
}

// ── Update balance ────────────────────────────────────────────────────────────

function updateBalance() {
    let total = 0;
    transactions.forEach(function(item) {
        total += item.amount;
    });
    const balanceEl = document.getElementById("balance");
    balanceEl.textContent = "Total: Rp" + total;
    balanceEl.className = (budgetLimit > 0 && total > budgetLimit) ? "over-limit-balance" : "";
}

// ── Update chart ──────────────────────────────────────────────────────────────

function updateChart() {
    const placeholder = document.getElementById("chartPlaceholder");
    const canvas      = document.getElementById("expenseChart");

    if (transactions.length === 0) {
        placeholder.style.display = "block";
        canvas.style.display = "none";
        if (chart) { chart.destroy(); chart = null; }
        return;
    }

    placeholder.style.display = "none";
    canvas.style.display = "block";

    // Sum amounts per category — only include categories with spending > 0
    const totals = {};
    transactions.forEach(function(item) {
        totals[item.category] = (totals[item.category] || 0) + item.amount;
    });

    const labels = Object.keys(totals).filter(function(k) { return totals[k] > 0; });
    const data   = labels.map(function(k) { return totals[k]; });

    if (chart) { chart.destroy(); }

    chart = new Chart(canvas, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: generateColors(labels.length)
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: "bottom" }
            }
        }
    });
}

// ── Generate distinct colors for chart segments ───────────────────────────────

function generateColors(count) {
    const palette = [
        "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0",
        "#9966FF", "#FF9F40", "#C9CBCF", "#E7E9ED"
    ];
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(palette[i % palette.length]);
    }
    return colors;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.style.display = "block";
    setTimeout(function() {
        toast.style.display = "none";
    }, 3000);
}

// ── Monthly summary ───────────────────────────────────────────────────────────

function renderMonthlySummary() {
    const container = document.getElementById("monthlyCards");

    if (transactions.length === 0) {
        container.innerHTML = "<p class=\"summary-empty\">No transactions to summarize yet.</p>";
        return;
    }

    // Group transactions by "YYYY-MM" key
    const groups = {};
    transactions.forEach(function(item) {
        let key;
        if (item.date) {
            const d = new Date(item.date);
            const year  = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            key = year + "-" + month;
        } else {
            key = "unknown";
        }
        if (!groups[key]) { groups[key] = []; }
        groups[key].push(item);
    });

    // Sort keys newest first (unknown goes to the bottom)
    const sortedKeys = Object.keys(groups).sort(function(a, b) {
        if (a === "unknown") return 1;
        if (b === "unknown") return -1;
        return b.localeCompare(a);
    });

    container.innerHTML = "";

    sortedKeys.forEach(function(key) {
        const items = groups[key];

        // Month label
        let label;
        if (key === "unknown") {
            label = "Unknown Date";
        } else {
            const [year, month] = key.split("-");
            const date = new Date(Number(year), Number(month) - 1, 1);
            label = date.toLocaleString("default", { month: "long", year: "numeric" });
        }

        // Total for the month
        const total = items.reduce(function(sum, t) { return sum + t.amount; }, 0);

        // Breakdown by category
        const catTotals = {};
        items.forEach(function(t) {
            catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
        });

        const breakdownHTML = Object.keys(catTotals).map(function(cat) {
            return `<li><span class="cat-name">${cat}</span><span class="cat-amount">Rp${catTotals[cat]}</span></li>`;
        }).join("");

        container.innerHTML += `
        <div class="month-card${(budgetLimit > 0 && total > budgetLimit) ? " over-limit-card" : ""}">
            <div class="month-card-header">
                <span class="month-label">${label}</span>
                <span class="month-total${(budgetLimit > 0 && total > budgetLimit) ? " over-limit-amount" : ""}">Rp${total}${(budgetLimit > 0 && total > budgetLimit) ? " ⚠️" : ""}</span>
            </div>
            <ul class="category-breakdown">${breakdownHTML}</ul>
        </div>`;
    });
}

// ── Persist to localStorage ───────────────────────────────────────────────────

function saveTransactions() {
    localStorage.setItem("transactions", JSON.stringify(transactions));
}

function saveCategories() {
    localStorage.setItem("categories", JSON.stringify(categories));
}
