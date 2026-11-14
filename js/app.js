const EXPENSES_KEY = "daily-ledger-expenses-v1";
const BUDGET_KEY = "daily-ledger-budget-v1";
const DEFAULT_BUDGET = 10000;

const CATEGORY_META = {
  Food: { icon: "🍜", color: "#4edea3" },
  Transport: { icon: "🚌", color: "#83cfff" },
  Shopping: { icon: "🛍️", color: "#b9a4ff" },
  Education: { icon: "📚", color: "#ffc77d" },
  Entertainment: { icon: "🎬", color: "#ff8585" },
  Health: { icon: "💊", color: "#70d6c1" },
  Bills: { icon: "🧾", color: "#e4a8d8" },
  Other: { icon: "📌", color: "#91a0af" }
};

let expenses = loadExpenses();
let monthlyBudget = loadBudget();
let spendingChart = null;
let categoryChart = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadExpenses() {
  try {
    const saved = JSON.parse(localStorage.getItem(EXPENSES_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(isValidExpense) : [];
  } catch (error) {
    console.warn("Could not read saved expenses:", error);
    return [];
  }
}

function isValidExpense(item) {
  return item && typeof item.id === "string" &&
    Number.isFinite(Number(item.amount)) && Number(item.amount) > 0 &&
    typeof item.title === "string" && typeof item.date === "string";
}

function loadBudget() {
  const saved = Number(localStorage.getItem(BUDGET_KEY));
  return Number.isFinite(saved) && saved > 0 ? saved : DEFAULT_BUDGET;
}

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMonthKey() {
  return dateKey().slice(0, 7);
}

function formatMoney(value) {
  return "₹" + Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });
}

function formatDate(value) {
  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function totalOf(items) {
  return items.reduce((total, item) => total + Number(item.amount), 0);
}

function getMonthExpenses() {
  return expenses.filter((item) => item.date.startsWith(currentMonthKey()));
}

function getCategoryTotals(items) {
  return items.reduce((totals, item) => {
    totals[item.category] = (totals[item.category] || 0) + Number(item.amount);
    return totals;
  }, {});
}

function saveData() {
  try {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    localStorage.setItem(BUDGET_KEY, String(monthlyBudget));
  } catch (error) {
    console.error("Could not save expense data:", error);
    showToast("Browser storage is unavailable. Your changes may not be saved.");
  }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function createId() {
  return window.crypto && typeof window.crypto.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `expense-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function renderCategoryBreakdown(container, items) {
  const totals = getCategoryTotals(items);
  const total = totalOf(items);
  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  if (!rows.length) {
    container.innerHTML = '<p class="empty-state">No expenses in this period yet.</p>';
    return;
  }

  container.innerHTML = rows.map(([category, amount]) => {
    const meta = CATEGORY_META[category] || CATEGORY_META.Other;
    const percentage = total ? (amount / total) * 100 : 0;
    return `
      <div class="category-row">
        <div class="category-info">
          <span>${meta.icon} ${escapeHTML(category)}</span>
          <strong>${formatMoney(amount)} <span class="muted">· ${Math.round(percentage)}%</span></strong>
        </div>
        <div class="category-bar"><span style="width:${percentage}%;background:${meta.color}"></span></div>
      </div>`;
  }).join("");
}

function transactionMarkup(item) {
  const meta = CATEGORY_META[item.category] || CATEGORY_META.Other;
  return `
    <article class="transaction-row">
      <div class="transaction-main">
        <div class="transaction-icon">${meta.icon}</div>
        <div class="transaction-description">
          <div class="transaction-title">${escapeHTML(item.title)}</div>
          <div class="transaction-meta">${escapeHTML(item.category)} · ${formatDate(item.date)}${item.note ? " · " + escapeHTML(item.note) : ""}</div>
        </div>
      </div>
      <div class="transaction-side">
        <div class="transaction-amount">−${formatMoney(item.amount)}</div>
        <div class="transaction-actions">
          <button type="button" data-edit="${escapeHTML(item.id)}">Edit</button>
          <button type="button" data-delete="${escapeHTML(item.id)}">Delete</button>
        </div>
      </div>
    </article>`;
}

function renderTransactionList() {
  const search = ($("#transactionSearch")?.value || "").trim().toLowerCase();
  const category = $("#categoryFilter")?.value || "";
  const filtered = [...expenses]
    .filter((item) => !category || item.category === category)
    .filter((item) => {
      const searchable = [item.title, item.category, item.note, item.date].join(" ").toLowerCase();
      return searchable.includes(search);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  $("#allTransactions").innerHTML = filtered.length
    ? filtered.map(transactionMarkup).join("")
    : '<p class="empty-state">No matching expenses found.</p>';
}

function renderBudget(spent) {
  const usage = monthlyBudget > 0 ? (spent / monthlyBudget) * 100 : 0;
  const cappedUsage = Math.min(100, Math.max(0, usage));
  const remaining = monthlyBudget - spent;
  const overBudget = remaining < 0;

  $("#budgetRemaining").textContent = formatMoney(Math.max(0, remaining));
  $("#budgetCaption").textContent = overBudget ? "over your monthly limit" : "remaining this month";
  $("#budgetProgress").style.width = cappedUsage + "%";
  $("#budgetProgress").style.background = overBudget ? "var(--red)" : "var(--green)";
  $("#budgetSpent").textContent = formatMoney(spent);
  $("#budgetLimit").textContent = formatMoney(monthlyBudget);
  $("#budgetStatus").textContent = overBudget
    ? `${formatMoney(Math.abs(remaining))} over budget`
    : usage > 80 ? "Close to your monthly limit" : "You're on track";
  $("#budgetStatus").style.color = overBudget ? "var(--red)" : "var(--green)";

  $("#budgetPageSpent").textContent = formatMoney(spent);
  $("#budgetPageProgress").style.width = cappedUsage + "%";
  $("#budgetPageProgress").style.background = overBudget ? "var(--red)" : "var(--green)";
  $("#budgetPageCaption").textContent = overBudget
    ? `${formatMoney(Math.abs(remaining))} over budget · ${Math.round(usage)}% used`
    : `${formatMoney(remaining)} remaining · ${Math.round(usage)}% used`;

  $("#pageBudget").placeholder = monthlyBudget.toLocaleString("en-IN");
}

function renderDashboard() {
  const monthItems = getMonthExpenses();
  const todayItems = expenses.filter((item) => item.date === dateKey());
  const monthlyTotal = totalOf(monthItems);
  const dayNumber = new Date().getDate();

  $("#todaySpent").textContent = formatMoney(totalOf(todayItems));
  $("#monthSpent").textContent = formatMoney(monthlyTotal);


  renderBudget(monthlyTotal);

  const recent = [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  $("#recentTransactions").innerHTML = recent.length
    ? recent.map(transactionMarkup).join("")
    : '<p class="empty-state">No transactions yet. Add your first expense!</p>';
}

function drawSpendingChart() {
  const canvas = $("#spendingChart");
  if (!canvas || typeof Chart === "undefined") return;

  const labels = [];
  const values = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = dateKey(date);
    labels.push(date.toLocaleDateString("en-IN", { weekday: "short" }));
    values.push(totalOf(expenses.filter((item) => item.date === key)));
  }

  if (spendingChart) spendingChart.destroy();
  spendingChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: "#3d8062",
        backgroundColor: "rgba(61, 128, 98, .10)",
        fill: true,
        tension: .35,
        pointRadius: 3,
        pointBackgroundColor: "#3d8062"
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#77827b" } },
        y: {
          beginAtZero: true,
          grid: { color: "#e5e9e2" },
          ticks: { color: "#91a0af", callback: (value) => "₹" + value }
        }
      }
    }
  });
}

function drawCategoryChart() {
  const canvas = $("#categoryChart");
  if (!canvas || typeof Chart === "undefined") return;

  const totals = getCategoryTotals(getMonthExpenses());
  const labels = Object.keys(totals);
  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: labels.map((label) => totals[label]),
        backgroundColor: labels.map((label) => (CATEGORY_META[label] || CATEGORY_META.Other).color),
        borderColor: "#ffffff",
        borderWidth: 4
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#59655d", padding: 16, usePointStyle: true }
        }
      }
    }
  });
}

function renderApp() {
  renderDashboard();
  renderTransactionList();
  renderCategoryBreakdown($("#analyticsCategories"), getMonthExpenses());
  if ($("#analytics").classList.contains("active")) {
    drawSpendingChart();
    drawCategoryChart();
  }
}

function setBudget(value) {
  const nextBudget = Number(value);
  if (!Number.isFinite(nextBudget) || nextBudget <= 0) {
    showToast("Please enter a budget greater than zero.");
    return false;
  }
  monthlyBudget = nextBudget;
  saveData();
  renderApp();
  showToast("Monthly budget updated.");
  return true;
}

function editExpense(id) {
  const item = expenses.find((expense) => expense.id === id);
  if (!item) return;

  const amountInput = window.prompt("Update amount (₹):", item.amount);
  if (amountInput === null) return;
  const amount = Number(amountInput);
  if (!Number.isFinite(amount) || amount <= 0) {
    showToast("Please enter a valid amount.");
    return;
  }

  const titleInput = window.prompt("Update description:", item.title);
  if (titleInput === null) return;
  const title = titleInput.trim();
  if (!title) {
    showToast("Description cannot be empty.");
    return;
  }

  item.amount = amount;
  item.title = title;
  saveData();
  renderApp();
  showToast("Expense updated.");
}

function deleteExpense(id) {
  const item = expenses.find((expense) => expense.id === id);
  if (!item || !window.confirm(`Delete "${item.title}"?`)) return;

  expenses = expenses.filter((expense) => expense.id !== id);
  saveData();
  renderApp();
  showToast("Expense deleted.");
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  const amount = Number($("#expenseAmount").value);
  const title = $("#expenseTitle").value.trim();
  const date = $("#expenseDate").value;

  if (!Number.isFinite(amount) || amount <= 0 || !title || !date) {
    showToast("Please complete the required fields.");
    return;
  }

  expenses.unshift({
    id: createId(),
    amount,
    title,
    category: $("#expenseCategory").value,
    date,
    note: $("#expenseNote").value.trim()
  });

  saveData();
  event.currentTarget.reset();
  $("#expenseDate").value = dateKey();
  $("#expenseDialog").close();
  renderApp();
  showToast("Expense saved successfully.");
}

function showPage(pageName) {
  $$(".page").forEach((page) => page.classList.toggle("active", page.id === pageName));
  $$(".nav-link").forEach((button) => button.classList.toggle("active", button.dataset.page === pageName));
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (pageName === "analytics") {
    window.requestAnimationFrame(() => {
      drawSpendingChart();
      drawCategoryChart();
    });
  }
}

function handleListAction(event) {
  const button = event.target.closest("button[data-edit], button[data-delete]");
  if (!button) return;
  if (button.dataset.edit) editExpense(button.dataset.edit);
  if (button.dataset.delete) deleteExpense(button.dataset.delete);
}

function initializeApp() {
  $("#currentDate").textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  $("#expenseDate").value = dateKey();

  $("#expenseForm").addEventListener("submit", handleExpenseSubmit);
  $("#expenseForm").addEventListener("reset", () => {
    window.setTimeout(() => { $("#expenseDate").value = dateKey(); }, 0);
  });

  $("#budgetPageForm").addEventListener("submit", (event) => {
    event.preventDefault();
    setBudget($("#pageBudget").value);
    $("#pageBudget").value = "";
  });

  $$(".nav-link").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });
  $$("[data-go]").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.go));
  });

  $("#jumpToExpense").addEventListener("click", () => {
    $("#expenseDialog").showModal();
    window.setTimeout(() => $("#expenseAmount").focus(), 80);
  });
  $("#closeExpenseDialog").addEventListener("click", () => $("#expenseDialog").close());
  $("#cancelExpense").addEventListener("click", () => $("#expenseDialog").close());
  $("#expenseDialog").addEventListener("click", (event) => {
    if (event.target === $("#expenseDialog")) $("#expenseDialog").close();
  });

  $("#transactionSearch").addEventListener("input", renderTransactionList);
  $("#categoryFilter").addEventListener("change", renderTransactionList);
  $("#recentTransactions").addEventListener("click", handleListAction);
  $("#allTransactions").addEventListener("click", handleListAction);

  renderApp();
}

document.addEventListener("DOMContentLoaded", initializeApp);