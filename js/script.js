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
const searchInput      = document.getElementById("searchInput");
const searchClear      = document.getElementById("searchClear");
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
    showToast("✅ Transaction added");

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

// ── Search ────────────────────────────────────────────────────────────────────

searchInput.addEventListener("input", function() {
    searchClear.style.display = searchInput.value ? "flex" : "none";
    renderTransactions();
});

searchClear.addEventListener("click", function() {
    searchInput.value = "";
    searchClear.style.display = "none";
    searchInput.focus();
    renderTransactions();
});

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

    const query  = searchInput.value.trim().toLowerCase();
    const sorted = getSortedTransactions();

    // Filter by search query (matches name or category, case-insensitive)
    const filtered = query
        ? sorted.filter(function(item) {
            return item.name.toLowerCase().includes(query) ||
                   item.category.toLowerCase().includes(query);
          })
        : sorted;

    if (filtered.length === 0) {
        list.innerHTML = "<p id=\"emptyState\">No results for \"" + searchInput.value.trim() + "\".</p>";
        return;
    }

    list.innerHTML = "";
    filtered.forEach(function(item) {
        // Find the real index in the original array for correct deletion
        const realIndex = transactions.indexOf(item);
        const overLimit = budgetLimit > 0 && item.amount > budgetLimit;

        // Highlight matching text in name
        let displayName = item.name;
        if (query) {
            const regex = new RegExp("(" + query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
            displayName = item.name.replace(regex, "<mark>$1</mark>");
        }

        const div = document.createElement("div");
        div.className = "transaction-item" + (overLimit ? " over-limit" : "") + " tx-slide-in";
        div.innerHTML = `
            <span>${displayName} — Rp${item.amount.toLocaleString()} — ${item.category}${overLimit ? " ⚠️" : ""}</span>
            <button onclick="deleteTransaction(${realIndex})">🗑 Delete</button>`;
        list.appendChild(div);
    });
}

// ── Delete transaction ────────────────────────────────────────────────────────

function deleteTransaction(index) {
    // Find the DOM item and animate it out before removing
    const listEl = document.getElementById("transactionList");
    const allItems = listEl.querySelectorAll(".transaction-item");
    // Match by real index encoded in the delete button's onclick
    let targetEl = null;
    allItems.forEach(function(el) {
        const btn = el.querySelector("button");
        if (btn && btn.getAttribute("onclick") === "deleteTransaction(" + index + ")") {
            targetEl = el;
        }
    });

    function doDelete() {
        transactions.splice(index, 1);
        saveTransactions();
        renderTransactions();
        updateBalance();
        updateChart();
        renderMonthlySummary();
        showToast("🗑 Transaction deleted");
    }

    if (targetEl) {
        targetEl.classList.add("tx-fade-out");
        targetEl.addEventListener("animationend", doDelete, { once: true });
    } else {
        doDelete();
    }
}

// ── Update balance + summary cards ───────────────────────────────────────────

function updateBalance() {
    let total = 0;
    transactions.forEach(function(item) { total += item.amount; });

    const balanceEl = document.getElementById("balance");
    const cardEl    = document.getElementById("cardTotalExpense");
    const isOver    = budgetLimit > 0 && total > budgetLimit;

    balanceEl.textContent = "Rp" + total.toLocaleString();

    // Red border pulse on the card when over limit
    if (isOver) {
        balanceEl.classList.add("over-limit-balance");
        cardEl.classList.add("over-limit-card-pulse");
    } else {
        balanceEl.classList.remove("over-limit-balance");
        cardEl.classList.remove("over-limit-card-pulse");
    }

    // Total transactions count
    document.getElementById("totalTxCount").textContent = transactions.length;

    // Active categories count (categories that have at least 1 transaction)
    const activeCats = new Set(transactions.map(function(t) { return t.category; }));
    document.getElementById("totalCatCount").textContent = activeCats.size;
}

// ── Update chart ──────────────────────────────────────────────────────────────

function updateChart() {
    const placeholder = document.getElementById("chartPlaceholder");
    const canvas      = document.getElementById("expenseChart");
    const inner       = document.getElementById("chartInner");

    if (transactions.length === 0) {
        placeholder.style.display = "block";
        inner.style.display = "none";
        if (chart) { chart.destroy(); chart = null; }
        renderChartStats({});
        renderTopCategories({}, [], []);
        return;
    }

    placeholder.style.display = "none";
    inner.style.display = "flex";

    // Animate chart container — use the actual panel ID
    const container = document.getElementById("panel-chart");
    if (container) {
        container.classList.remove("chart-update-flash");
        void container.offsetWidth;
        container.classList.add("chart-update-flash");
    }

    // Sum amounts per category
    const totals = {};
    transactions.forEach(function(item) {
        totals[item.category] = (totals[item.category] || 0) + item.amount;
    });

    const labels = Object.keys(totals).filter(function(k) { return totals[k] > 0; });
    const data   = labels.map(function(k) { return totals[k]; });
    const colors = generateColors(labels.length);

    if (chart) { chart.destroy(); }

    chart = new Chart(canvas, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: "rgba(10,10,10,0.15)"
            }]
        },
        options: {
            responsive: true,
            animation: { duration: 500, easing: "easeInOutQuart" },
            plugins: {
                legend: { position: "bottom" }
            }
        }
    });

    renderTopCategories(totals, labels, colors);
    renderChartStats(totals, colors, labels);
}

// ── Top 3 categories panel ────────────────────────────────────────────────────

function renderTopCategories(totals, labels, colors) {
    const container = document.getElementById("topCategories");

    if (!labels || labels.length === 0) {
        container.innerHTML = "";
        return;
    }

    const grandTotal = labels.reduce(function(s, k) { return s + totals[k]; }, 0);

    // Sort by total descending, take top 3
    const sorted = labels.slice().sort(function(a, b) { return totals[b] - totals[a]; });
    const top    = sorted.slice(0, 3);

    let html = "<p class=\"top-cat-title\">🏆 Top Categories</p>";
    top.forEach(function(cat, i) {
        const pct   = grandTotal > 0 ? Math.round((totals[cat] / grandTotal) * 100) : 0;
        const color = colors[labels.indexOf(cat)] || "#ccc";
        const medals = ["🥇", "🥈", "🥉"];

        html += `
        <div class="top-cat-item">
            <div class="top-cat-header">
                <span class="top-cat-name">${medals[i]} ${cat}</span>
                <span class="top-cat-pct" style="color:${color}">${pct}%</span>
            </div>
            <div class="top-cat-bar-bg">
                <div class="top-cat-bar-fill" style="width:${pct}%; background:${color}"></div>
            </div>
            <span class="top-cat-amount">Rp${totals[cat].toLocaleString()}</span>
        </div>`;
    });

    container.innerHTML = html;
}

// ── Chart stats (avg + count per category) ───────────────────────────────────

function renderChartStats(totals, colors, labels) {
    const container = document.getElementById("chartStats");

    if (!labels || labels.length === 0) {
        container.innerHTML = "";
        return;
    }

    // Count transactions per category
    const counts = {};
    transactions.forEach(function(item) {
        counts[item.category] = (counts[item.category] || 0) + 1;
    });

    let html = "<div class=\"chart-stats-grid\">";
    labels.forEach(function(cat, i) {
        const total   = totals[cat];
        const count   = counts[cat] || 0;
        const average = count > 0 ? Math.round(total / count) : 0;
        const dot     = colors ? colors[i] : "#ccc";

        html += `
        <div class="chart-stat-card">
            <div class="chart-stat-label">
                <span class="chart-stat-dot" style="background:${dot}"></span>
                ${cat}
            </div>
            <div class="chart-stat-row">
                <span class="chart-stat-key">Transactions</span>
                <span class="chart-stat-val">${count}</span>
            </div>
            <div class="chart-stat-row">
                <span class="chart-stat-key">Average</span>
                <span class="chart-stat-val">Rp${average.toLocaleString()}</span>
            </div>
            <div class="chart-stat-row">
                <span class="chart-stat-key">Total</span>
                <span class="chart-stat-val chart-stat-total">Rp${total.toLocaleString()}</span>
            </div>
        </div>`;
    });

    html += "</div>";
    container.innerHTML = html;
}

// ── Generate distinct colors for chart segments ───────────────────────────────

function generateColors(count) {
    const palette = [
        "#003087", "#cc0000", "#1a4a9e", "#8B0000",
        "#4a6fa5", "#cc4400", "#2255aa", "#993300"
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
