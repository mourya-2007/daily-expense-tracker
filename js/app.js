const EXPENSES_KEY = "daily-ledger-expenses-v1";
const BUDGET_KEY = "daily-ledger-budget-v1";
const THEME_KEY = "daily-ledger-theme";
const NAME_KEY = "daily-ledger-name";
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const DEFAULT_BUDGET = 10000;

const CATEGORY_META = {
  Food: { icon: "🍜", color: "#f59e0b", svg: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>' },
  Transport: { icon: "🚌", color: "#3b82f6", svg: '<path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>' },
  Shopping: { icon: "🛍️", color: "#ec4899", svg: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>' },
  Education: { icon: "📚", color: "#8b5cf6", svg: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>' },
  Entertainment: { icon: "🎬", color: "#ef4444", svg: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>' },
  Health: { icon: "💊", color: "#10b981", svg: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>' },
  Bills: { icon: "🧾", color: "#14b8a6", svg: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>' },
  Other: { icon: "📌", color: "#94a3b8", svg: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>' }
};
const ACTION_ICONS = {
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>'
};

function svgIcon(paths, className = "cat-svg") {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}
function categoryIcon(category) {
  return svgIcon((CATEGORY_META[category] || CATEGORY_META.Other).svg);
}

let expenses = loadExpenses();
let monthlyBudget = loadBudget();
let spendingChart = null;
let categoryChart = null;
let userName = "";
let lastAddedId = null;
let editingId = null;
const BUDGET_PRESETS = [5000, 10000, 15000, 25000, 50000];

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
  let saved = 0;
  try { saved = Number(localStorage.getItem(BUDGET_KEY)); } catch (error) { saved = 0; }
  return Number.isFinite(saved) && saved > 0 ? saved : DEFAULT_BUDGET;
}

function applyTheme(theme, persist = true) {
  const selectedTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = selectedTheme;

  const toggle = $("#themeToggle");
  if (toggle) {
    const label = selectedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    toggle.setAttribute("aria-label", label);
    toggle.title = label;
  }

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = selectedTheme === "dark" ? "#090a0f" : "#f6f7fb";

  if (persist) {
    try { localStorage.setItem(THEME_KEY, selectedTheme); }
    catch (error) { console.warn("Could not save theme preference:", error); }
  }

  if ($("#analytics")?.classList.contains("active")) {
    window.requestAnimationFrame(() => { drawSpendingChart(); drawCategoryChart(); });
  }
}

function initializeTheme() {
  let savedTheme = "light";
  try { savedTheme = localStorage.getItem(THEME_KEY) || "light"; }
  catch (error) { console.warn("Could not read theme preference:", error); }
  applyTheme(savedTheme, false);

  $("#themeToggle").addEventListener("click", (event) => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    if (!document.startViewTransition || REDUCED_MOTION) { applyTheme(next); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = document.startViewTransition(() => applyTheme(next));
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(.4,0,.2,1)", pseudoElement: "::view-transition-new(root)" }
      );
    }).catch(() => {});
  });
}

/* ---------- Profile ---------- */
function loadName() {
  try { return (localStorage.getItem(NAME_KEY) || "").trim(); } catch (error) { return ""; }
}

function avatarColor(name) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)) % 360;
  return `linear-gradient(135deg, hsl(${hash} 75% 58%), hsl(${(hash + 40) % 360} 70% 45%))`;
}

function initialsOf(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}

function greetingText() {
  const hour = new Date().getHours();
  return hour < 5 ? "Burning the midnight oil" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function renderProfile(animate = false) {
  const avatar = $("#profileAvatar");
  avatar.textContent = initialsOf(userName);
  avatar.style.setProperty("--avatar", userName ? avatarColor(userName) : "var(--accent)");
  $("#profileName").textContent = userName || "Guest";
  $("#profileButton").setAttribute("aria-label", userName ? `${userName} — edit your name` : "Add your name");
  $("#greeting").innerHTML = userName
    ? `${greetingText()}, ${escapeHTML(userName.split(" ")[0])} <span class="wave">👋</span>`
    : "YOUR FINANCES";
  if (animate && !REDUCED_MOTION) {
    avatar.classList.remove("pop");
    void avatar.offsetWidth;
    avatar.classList.add("pop");
  }
}

function openNameDialog(editing) {
  const dialog = $("#nameDialog");
  $("#nameEyebrow").textContent = editing ? "YOUR PROFILE" : "WELCOME TO DAILY LEDGER";
  $("#nameDialogTitle").textContent = editing ? "Change your name" : "What should we call you?";
  $("#skipName").textContent = editing ? "Cancel" : "Skip for now";
  $("#nameInput").value = userName;
  if (!dialog.open) dialog.showModal();
  window.setTimeout(() => { $("#nameInput").focus(); $("#nameInput").select(); }, 80);
}

function initializeProfile() {
  userName = loadName();
  renderProfile();

  $("#nameForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("#nameInput").value.trim().replace(/\s+/g, " ");
    if (!name) return;
    const first = !userName;
    userName = name;
    try { localStorage.setItem(NAME_KEY, userName); }
    catch (error) { showToast("Browser storage is unavailable. Your name may not be saved."); }
    $("#nameDialog").close();
    renderProfile(true);
    showToast(first ? `Welcome aboard, ${userName}! 🎉` : "Name updated.");
    if (first) confetti(innerWidth / 2, innerHeight / 3, 36);
  });
  $("#skipName").addEventListener("click", () => $("#nameDialog").close());
  $("#profileButton").addEventListener("click", () => openNameDialog(Boolean(userName)));

  if (!userName) window.setTimeout(() => openNameDialog(false), 350);
}

/* ---------- Effects ---------- */
function animateMoney(element, target) {
  const from = Number(element.dataset.value || 0);
  element.dataset.value = String(target);
  if (REDUCED_MOTION || from === target) { element.textContent = formatMoney(target); return; }
  const start = performance.now(), duration = 700;
  window.cancelAnimationFrame(Number(element.dataset.raf || 0));
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    element.textContent = formatMoney(Math.round(from + (target - from) * eased));
    if (t < 1) element.dataset.raf = String(window.requestAnimationFrame(step));
    else element.textContent = formatMoney(target);
  };
  element.dataset.raf = String(window.requestAnimationFrame(step));
}

function confetti(x, y, count = 22) {
  if (REDUCED_MOTION) return;
  const colors = ["#5b4bf0", "#f59e0b", "#10b981", "#ec4899", "#3b82f6", "#ef4444"];
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = x + "px";
    piece.style.top = y + "px";
    piece.style.background = colors[i % colors.length];
    document.body.appendChild(piece);
    const angle = Math.random() * Math.PI * 2, distance = 60 + Math.random() * 110;
    const animation = piece.animate([
      { transform: "translate(0,0) rotate(0) scale(1)", opacity: 1 },
      { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance + 70}px) rotate(${Math.random() * 540}deg) scale(.4)`, opacity: 0 }
    ], { duration: 800 + Math.random() * 500, easing: "cubic-bezier(.2,.8,.3,1)" });
    animation.onfinish = () => piece.remove();
  }
}

function initializeEffects() {
  // Ripple on any button
  document.addEventListener("pointerdown", (event) => {
    const button = event.target.closest(".button");
    if (!button || REDUCED_MOTION) return;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${event.clientX - rect.left - size / 2}px;top:${event.clientY - rect.top - size / 2}px`;
    button.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  });

  // Cursor spotlight on cards
  document.addEventListener("pointermove", (event) => {
    const panel = event.target.closest?.(".panel");
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    panel.style.setProperty("--mx", event.clientX - rect.left + "px");
    panel.style.setProperty("--my", event.clientY - rect.top + "px");
  });
}

function getChartTheme() {
  const isDark = document.documentElement.dataset.theme === "dark";
  return {
    text: isDark ? "#8e95ab" : "#6a7088",
    grid: isDark ? "rgba(255,255,255,.07)" : "rgba(106,112,136,.14)",
    line: isDark ? "#a79bff" : "#5b4bf0",
    fill: isDark ? "rgba(167,155,255,.16)" : "rgba(91,75,240,.10)",
    doughnutBorder: isDark ? "#14161f" : "#ffffff",
    legend: isDark ? "#e6e8f2" : "#11142b"
  };
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

function showToast(message, action) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.toggle("has-action", Boolean(action));
  if (action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "toast-action";
    button.textContent = action.label;
    button.addEventListener("click", () => { toast.classList.remove("show"); action.run(); });
    toast.appendChild(button);
  }
  toast.classList.add("show");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => toast.classList.remove("show"), action ? 5500 : 2400);
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
          <span class="category-name" style="--cat:${meta.color}">${categoryIcon(category)} ${escapeHTML(category)}</span>
          <strong>${formatMoney(amount)} <span class="muted">· ${Math.round(percentage)}%</span></strong>
        </div>
        <div class="category-bar"><span style="width:${percentage}%;background:${meta.color}"></span></div>
      </div>`;
  }).join("");
}

function transactionMarkup(item, index = 0) {
  const meta = CATEGORY_META[item.category] || CATEGORY_META.Other;
  const isNew = item.id === lastAddedId;
  const id = escapeHTML(item.id);
  return `
    <article class="transaction-row${isNew ? " is-new" : ""}" data-id="${id}" style="--i:${Math.min(index, 12)}">
      <div class="transaction-main">
        <div class="transaction-icon" style="--cat:${meta.color}" title="${escapeHTML(item.category)}">${categoryIcon(item.category)}</div>
        <div class="transaction-description">
          <div class="transaction-title">${escapeHTML(item.title)}</div>
          <div class="transaction-meta"><span class="cat-tag" style="--cat:${meta.color}">${escapeHTML(item.category)}</span> · ${formatDate(item.date)}${item.note ? " · " + escapeHTML(item.note) : ""}</div>
        </div>
      </div>
      <div class="transaction-side">
        <div class="transaction-amount">−${formatMoney(item.amount)}</div>
        <div class="transaction-actions">
          <button type="button" class="icon-button" data-edit="${id}" aria-label="Edit ${escapeHTML(item.title)}" title="Edit">${svgIcon(ACTION_ICONS.edit, "action-svg")}</button>
          <button type="button" class="icon-button icon-danger" data-delete="${id}" aria-label="Delete ${escapeHTML(item.title)}" title="Delete">${svgIcon(ACTION_ICONS.trash, "action-svg")}</button>
        </div>
      </div>
    </article>`;
}

function dayLabel(dateString) {
  if (dateString === dateKey()) return "Today";
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (dateString === dateKey(yesterday)) return "Yesterday";
  return formatDate(dateString);
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

  $("#transactionSummary").textContent = filtered.length
    ? `${filtered.length} ${filtered.length === 1 ? "transaction" : "transactions"} · ${formatMoney(totalOf(filtered))} total`
    : "";

  if (!filtered.length) {
    const hasAny = expenses.length > 0;
    $("#allTransactions").innerHTML = hasAny
      ? '<p class="empty-state">No matching expenses found.</p>'
      : '<div class="empty-state empty-rich"><span>🪙</span><strong>Nothing here yet</strong><p>Add your first expense and it will show up right here.</p><button class="button button-primary" type="button" data-open-expense>＋ Add expense</button></div>';
    return;
  }

  const groups = new Map();
  filtered.forEach((item) => {
    if (!groups.has(item.date)) groups.set(item.date, []);
    groups.get(item.date).push(item);
  });
  let index = 0;
  $("#allTransactions").innerHTML = [...groups].map(([date, items]) => `
    <section class="day-group">
      <div class="day-head"><span>${escapeHTML(dayLabel(date))}</span><span>−${formatMoney(totalOf(items))}</span></div>
      ${items.map((item) => transactionMarkup(item, index++)).join("")}
    </section>`).join("");
}

function budgetState(usage) {
  return usage >= 100 ? "over" : usage > 80 ? "warn" : "ok";
}

function renderBudget(spent) {
  const usage = monthlyBudget > 0 ? (spent / monthlyBudget) * 100 : 0;
  const cappedUsage = Math.min(100, Math.max(0, usage));
  const remaining = monthlyBudget - spent;
  const overBudget = remaining < 0;
  const state = budgetState(usage);

  animateMoney($("#budgetRemaining"), Math.max(0, remaining));
  $("#budgetCaption").textContent = overBudget ? "over your monthly limit" : "remaining this month";
  $("#budgetProgress").style.width = cappedUsage + "%";
  $("#budgetProgress").dataset.state = state;
  $("#budgetSpent").textContent = formatMoney(spent);
  $("#budgetLimit").textContent = formatMoney(monthlyBudget);
  $("#budgetStatus").textContent = overBudget
    ? `${formatMoney(Math.abs(remaining))} over budget`
    : usage > 80 ? "Close to your monthly limit" : "You're on track";
  $("#budgetStatus").dataset.state = state;

  $("#budgetPageLimit").textContent = formatMoney(monthlyBudget);
  $("#budgetPageSpent").textContent = formatMoney(spent);
  $("#budgetPageLeft").textContent = (overBudget ? "−" : "") + formatMoney(Math.abs(remaining));
  $("#budgetPageLeft").dataset.state = overBudget ? "over" : "";
  $("#budgetPageProgress").style.width = cappedUsage + "%";
  $("#budgetPageProgress").dataset.state = state;
  $("#budgetPageCaption").textContent = `${Math.round(usage)}% of your limit used`;

  const input = $("#pageBudget");
  if (document.activeElement !== input) input.value = monthlyBudget;
  $$("#budgetPresets .chip-button").forEach((chip) => {
    chip.classList.toggle("active", Number(chip.dataset.amount) === monthlyBudget);
  });
}

/* ---------- Statement download ---------- */
function statementSelection() {
  const mode = document.querySelector('input[name="statementRange"]:checked')?.value || "month";
  let items = [...expenses];
  let label = "Entire history";
  let tag = "all-time";
  if (mode === "month") {
    items = items.filter((item) => item.date.startsWith(currentMonthKey()));
    label = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    tag = currentMonthKey();
  } else if (mode === "custom") {
    const from = $("#statementFrom").value, to = $("#statementTo").value;
    if (from && to && from > to) return { error: "The start date must be before the end date." };
    items = items.filter((item) => (!from || item.date >= from) && (!to || item.date <= to));
    label = `${from ? formatDate(from) : "Beginning"} – ${to ? formatDate(to) : "Today"}`;
    tag = `${from || "start"}_to_${to || dateKey()}`;
  }
  items.sort((a, b) => a.date.localeCompare(b.date));
  return { items, label, tag, total: totalOf(items) };
}

function renderStatementPreview() {
  const mode = document.querySelector('input[name="statementRange"]:checked')?.value;
  $("#statementDates").hidden = mode !== "custom";
  const result = statementSelection();
  const preview = $("#statementPreview");
  const disabled = Boolean(result.error) || !result.items.length;
  $("#downloadCsv").disabled = disabled;
  $("#downloadPdf").disabled = disabled;
  if (result.error) { preview.textContent = result.error; preview.dataset.state = "error"; return; }
  preview.dataset.state = result.items.length ? "" : "empty";
  preview.innerHTML = result.items.length
    ? `<strong>${result.items.length}</strong> ${result.items.length === 1 ? "expense" : "expenses"} · <strong>${formatMoney(result.total)}</strong> total<br><span>${escapeHTML(result.label)}</span>`
    : `No expenses in this period.<br><span>${escapeHTML(result.label)}</span>`;
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text; // stop spreadsheet formula injection
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadCsv() {
  const result = statementSelection();
  if (result.error || !result.items.length) return;
  const rows = [["Date", "Description", "Category", "Note", "Amount (INR)"]];
  result.items.forEach((item) => rows.push([item.date, item.title, item.category, item.note || "", Number(item.amount).toFixed(2)]));
  rows.push([], ["", "", "", "Total", result.total.toFixed(2)]);
  const csv = "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  downloadFile(`daily-ledger-statement-${result.tag}.csv`, csv, "text/csv;charset=utf-8");
  showToast("Statement downloaded (CSV).");
}

function downloadPdf() {
  const result = statementSelection();
  if (result.error || !result.items.length) return;
  const totals = Object.entries(getCategoryTotals(result.items)).sort((a, b) => b[1] - a[1]);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Daily Ledger statement</title><style>
    body{font:13px/1.5 "Helvetica Neue",Arial,sans-serif;color:#111;margin:32px}
    h1{margin:0;font-size:22px} .sub{color:#555;margin:2px 0 20px}
    .summary{display:flex;gap:24px;margin:0 0 22px} .summary div{padding:10px 16px;border:1px solid #ddd;border-radius:8px}
    .summary b{display:block;font-size:18px}
    table{width:100%;border-collapse:collapse} th,td{padding:7px 8px;border-bottom:1px solid #e5e5e5;text-align:left}
    th{font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:#555;border-bottom:2px solid #111}
    td.num,th.num{text-align:right;white-space:nowrap} tfoot td{font-weight:700;border-top:2px solid #111;border-bottom:0}
    h2{margin:26px 0 8px;font-size:14px} .muted{color:#666} tr{page-break-inside:avoid}
  </style></head><body>
    <h1>Daily Ledger — Expense statement</h1>
    <p class="sub">${userName ? escapeHTML(userName) + " · " : ""}${escapeHTML(result.label)} · Generated ${escapeHTML(formatDate(dateKey()))}</p>
    <div class="summary"><div><span class="muted">Transactions</span><b>${result.items.length}</b></div><div><span class="muted">Total spent</span><b>${formatMoney(result.total)}</b></div></div>
    <table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Note</th><th class="num">Amount</th></tr></thead><tbody>
    ${result.items.map((item) => `<tr><td>${escapeHTML(formatDate(item.date))}</td><td>${escapeHTML(item.title)}</td><td>${escapeHTML(item.category)}</td><td class="muted">${escapeHTML(item.note || "")}</td><td class="num">${formatMoney(item.amount)}</td></tr>`).join("")}
    </tbody><tfoot><tr><td colspan="4">Total</td><td class="num">${formatMoney(result.total)}</td></tr></tfoot></table>
    <h2>By category</h2><table><tbody>${totals.map(([name, amount]) => `<tr><td>${escapeHTML(name)}</td><td class="num">${formatMoney(amount)}</td><td class="num muted">${Math.round((amount / result.total) * 100)}%</td></tr>`).join("")}</tbody></table>
  </body></html>`;
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  frame.contentDocument.open();
  frame.contentDocument.write(html);
  frame.contentDocument.close();
  window.setTimeout(() => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    window.setTimeout(() => frame.remove(), 2000);
  }, 250);
}

function initializeStatement() {
  const today = dateKey();
  $("#statementFrom").value = today.slice(0, 8) + "01";
  $("#statementTo").value = today;
  $("#statementRange").addEventListener("change", renderStatementPreview);
  $("#statementFrom").addEventListener("input", renderStatementPreview);
  $("#statementTo").addEventListener("input", renderStatementPreview);
  $("#downloadCsv").addEventListener("click", downloadCsv);
  $("#downloadPdf").addEventListener("click", downloadPdf);
}

function renderStats(monthItems, monthlyTotal) {
  const now = new Date();
  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - day + 1;
  const remaining = monthlyBudget - monthlyTotal;

  $("#statCount").textContent = monthItems.length;
  animateMoney($("#statAvg"), Math.round(monthlyTotal / day));

  const totals = Object.entries(getCategoryTotals(monthItems)).sort((a, b) => b[1] - a[1]);
  if (totals.length) {
    const [category, amount] = totals[0];
    $("#statTop").textContent = category;
    const topMeta = CATEGORY_META[category] || CATEGORY_META.Other;
    $("#statTopIcon").innerHTML = categoryIcon(category);
    $("#statTopIcon").style.setProperty("--cat", topMeta.color);
    $("#statTopIcon").classList.add("is-category");
    $("#statTopSub").textContent = `${formatMoney(amount)} · ${Math.round((amount / monthlyTotal) * 100)}% of spending`;
  } else {
    $("#statTop").textContent = "—";
    $("#statTopIcon").textContent = "🏷️";
    $("#statTopIcon").classList.remove("is-category");
    $("#statTopSub").textContent = "no spending yet";
  }

  animateMoney($("#statSafe"), Math.round(Math.max(0, remaining) / daysLeft));
  $("#statSafeSub").textContent = remaining < 0 ? "budget used up" : `per day · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`;
}

function renderDashboard() {
  const monthItems = getMonthExpenses();
  const todayItems = expenses.filter((item) => item.date === dateKey());
  const monthlyTotal = totalOf(monthItems);
  animateMoney($("#todaySpent"), totalOf(todayItems));
  animateMoney($("#monthSpent"), monthlyTotal);


  renderBudget(monthlyTotal);
  renderStats(monthItems, monthlyTotal);
  if ($("#statementPreview")) renderStatementPreview();

  const recent = [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  $("#recentTransactions").innerHTML = recent.length
    ? recent.map((item, index) => transactionMarkup(item, index)).join("")
    : '<div class="empty-state empty-rich"><span>🪙</span><strong>No expenses yet</strong><p>Log your first one to start tracking.</p><button class="button button-primary" type="button" data-open-expense>＋ Add expense</button></div>';
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
  const chartColors = getChartTheme();
  spendingChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: chartColors.line,
        backgroundColor: chartColors.fill,
        fill: true,
        tension: .35,
        pointRadius: 3,
        pointBackgroundColor: chartColors.line
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: chartColors.text } },
        y: {
          beginAtZero: true,
          grid: { color: chartColors.grid },
          ticks: { color: chartColors.text, callback: (value) => "₹" + value }
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
  const chartColors = getChartTheme();

  categoryChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: labels.map((label) => totals[label]),
        backgroundColor: labels.map((label) => (CATEGORY_META[label] || CATEGORY_META.Other).color),
        borderColor: chartColors.doughnutBorder,
        borderWidth: 4
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: chartColors.legend, padding: 16, usePointStyle: true }
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

function selectedCategory() {
  return document.querySelector('input[name="expenseCategory"]:checked')?.value || "Other";
}

function openExpenseDialog(item = null) {
  editingId = item ? item.id : null;
  $("#expenseEyebrow").textContent = item ? "EDIT ENTRY" : "NEW ENTRY";
  $("#expenseDialogTitle").textContent = item ? "Edit expense" : "Add an expense";
  $("#saveExpenseButton").textContent = item ? "Save changes" : "Save expense";
  $("#deleteExpenseButton").hidden = !item;
  if (item) {
    $("#expenseAmount").value = item.amount;
    $("#expenseTitle").value = item.title;
    $("#expenseDate").value = item.date;
    $("#expenseNote").value = item.note || "";
    const radio = document.querySelector(`input[name="expenseCategory"][value="${item.category}"]`);
    if (radio) radio.checked = true;
  }
  if (!$("#expenseDialog").open) $("#expenseDialog").showModal();
  window.setTimeout(() => $("#expenseAmount").focus(), 80);
}

function editExpense(id) {
  const item = expenses.find((expense) => expense.id === id);
  if (item) openExpenseDialog(item);
}

function deleteExpense(id) {
  const index = expenses.findIndex((expense) => expense.id === id);
  if (index === -1) return;
  const item = expenses[index];

  const finish = () => {
    expenses = expenses.filter((expense) => expense.id !== id);
    saveData();
    renderApp();
    showToast(`Deleted "${item.title}"`, {
      label: "Undo",
      run: () => { expenses.splice(Math.min(index, expenses.length), 0, item); saveData(); renderApp(); }
    });
  };
  const rows = $$(".transaction-row").filter((row) => row.dataset.id === id);
  if (REDUCED_MOTION || !rows.length) { finish(); return; }
  rows.forEach((row) => row.classList.add("is-removing"));
  window.setTimeout(finish, 260);
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

  const details = { amount, title, category: selectedCategory(), date, note: $("#expenseNote").value.trim() };
  const saveRect = event.submitter?.getBoundingClientRect();

  if (editingId) {
    const item = expenses.find((expense) => expense.id === editingId);
    if (item) Object.assign(item, details);
    saveData();
    $("#expenseDialog").close();
    renderApp();
    showToast("Expense updated.");
    return;
  }

  const newId = createId();
  lastAddedId = newId;
  window.setTimeout(() => { lastAddedId = null; }, 1600);
  expenses.unshift({ id: newId, ...details });
  saveData();
  if (saveRect) confetti(saveRect.left + saveRect.width / 2, saveRect.top, 18);
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
  if (event.target.closest("[data-open-expense]")) { openExpenseDialog(); return; }
  const button = event.target.closest("button[data-edit], button[data-delete]");
  if (!button) return;
  if (button.dataset.edit) editExpense(button.dataset.edit);
  if (button.dataset.delete) deleteExpense(button.dataset.delete);
}

function initializeApp() {
  initializeTheme();
  initializeEffects();
  initializeProfile();
  $("#currentDate").textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  $("#expenseDate").value = dateKey();

  $("#expenseForm").addEventListener("submit", handleExpenseSubmit);

  $("#budgetPageForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (setBudget($("#pageBudget").value)) {
      $("#pageBudget").blur();
      $("#pageBudget").value = monthlyBudget;
    }
  });

  $$(".nav-link").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });
  $$("[data-go]").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.go));
  });

  $("#categoryChips").innerHTML = Object.entries(CATEGORY_META).map(([name, meta], i) =>
    `<label class="chip" style="--cat:${meta.color}"><input type="radio" name="expenseCategory" value="${name}"${i === 0 ? " checked" : ""}><span>${categoryIcon(name)} ${name}</span></label>`).join("");
  $("#budgetPresets").innerHTML = BUDGET_PRESETS.map((amount) =>
    `<button class="chip-button" type="button" data-amount="${amount}">${formatMoney(amount)}</button>`).join("");
  $("#budgetPresets").addEventListener("click", (event) => {
    const chip = event.target.closest(".chip-button");
    if (!chip) return;
    $("#pageBudget").value = chip.dataset.amount;
    setBudget(chip.dataset.amount);
  });
  $("#deleteExpenseButton").addEventListener("click", () => {
    const id = editingId;
    $("#expenseDialog").close();
    if (id) deleteExpense(id);
  });
  $("#expenseDialog").addEventListener("close", () => {
    editingId = null;
    $("#expenseForm").reset();
    $("#expenseDate").value = dateKey();
  });
  $("#jumpToExpense").addEventListener("click", () => openExpenseDialog());
  $("#fabExpense").addEventListener("click", () => openExpenseDialog());
  document.addEventListener("keydown", (event) => {
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName);
    if (event.key.toLowerCase() === "n" && !typing && !event.metaKey && !event.ctrlKey && !$("#nameDialog").open && !$("#expenseDialog").open) {
      event.preventDefault();
      openExpenseDialog();
    }
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

  initializeStatement();
  renderApp();
}

document.addEventListener("DOMContentLoaded", initializeApp);