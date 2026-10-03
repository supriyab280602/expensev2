let expenses = [];
let categoryChart = null;
let currentFilter = "all"; // all | month | today | date:YYYY-MM-DD (calendar)
let currentMonthTotal = 0;
let calendarSelectedDate = null;

const CATEGORIES = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Entertainment",
  "Other",
];

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const expenseForm = document.getElementById("expenseForm");
  const expenseTableBody = document.getElementById("expenseTableBody");
  const searchInput = document.getElementById("searchInput");

  const todayTotalEl = document.getElementById("todayTotal");
  const monthTotalEl = document.getElementById("monthTotal");
  const allTimeTotalEl = document.getElementById("allTimeTotal");
  const summarySection = document.querySelector(".summary-card");
  const tableSection = document.querySelector(".table-card");
  const limitsSection = document.querySelector(".limits-card");
  const calendarSection = document.querySelector(".calendar-card");
  const summarySubtitle = document.getElementById("summarySubtitle");

  const dateInput = document.getElementById("date");
  const recurringInput = document.getElementById("recurring");

  const filterButtons = document.querySelectorAll(".filter-btn");

  const budgetInput = document.getElementById("budgetInput");
  const saveBudgetBtn = document.getElementById("saveBudgetBtn");
  const budgetBar = document.getElementById("budgetBar");
  const budgetText = document.getElementById("budgetText");
  
  const categoryLimitsContainer = document.getElementById(
    "categoryLimitsContainer"
  );
  const saveCategoryLimitsBtn = document.getElementById(
    "saveCategoryLimitsBtn"
  );

  const insightsList = document.getElementById("insightsList");
  const resetDataBtn = document.getElementById("resetDataBtn");

  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const importCsvInput = document.getElementById("importCsvInput");

  const calendarGrid = document.getElementById("calendarGrid");
  const calendarMonthLabel = document.getElementById("calendarMonthLabel");
  const prevMonthBtn = document.getElementById("prevMonthBtn");
  const nextMonthBtn = document.getElementById("nextMonthBtn");
  // --- Day summary modal elements ---
  const daySummaryModal = document.getElementById("daySummaryModal");
  const closeDaySummaryBtn = document.getElementById("closeDaySummary");
  const daySummaryTitle = document.getElementById("daySummaryTitle");
  const daySummaryTotal = document.getElementById("daySummaryTotal");
  const dayCategoryBreakdown = document.getElementById("dayCategoryBreakdown");
  const dayExpenseCount = document.getElementById("dayExpenseCount");

  const clearFiltersBtn = document.getElementById("clearFiltersBtn");

  // Edit modal elements
  const editModal = document.getElementById("editModal");
  const closeEditModalBtn = document.getElementById("closeEditModal");
  const editForm = document.getElementById("editForm");
  const editTitleInput = document.getElementById("editTitle");
  const editAmountInput = document.getElementById("editAmount");
  const editCategoryInput = document.getElementById("editCategory");
  const editDateInput = document.getElementById("editDate");
  const editRecurringInput = document.getElementById("editRecurring");
  let editingId = null;

  // Calendar state
  let calendarMonth = new Date().getMonth();
  let calendarYear = new Date().getFullYear();

  // ----- LocalStorage keys -----
  const LS_EXPENSES_KEY = "det_expenses_v2";
  const LS_BUDGET_KEY = "det_budget_v2";
  const LS_CAT_LIMITS_KEY = "det_category_limits_v2";

  // ----- Helpers -----

  function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function parseDate(str) {
    return new Date(str);
  }
  
  function showDaySummary(dateStr) {
    const dayExpenses = expenses.filter(e => e.date === dateStr);

    if (dayExpenses.length === 0) return;

    let total = 0;
    const categoryTotals = {};

    dayExpenses.forEach(exp => {
      total += exp.amount;
      categoryTotals[exp.category] =
        (categoryTotals[exp.category] || 0) + exp.amount;
    });

    daySummaryTitle.textContent = `📅 ${dateStr}`;
    daySummaryTotal.textContent = `₹${total.toFixed(2)}`;
    dayExpenseCount.textContent = `${dayExpenses.length} expense(s)`;

    dayCategoryBreakdown.innerHTML = "";

    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      const row = document.createElement("div");
      row.innerHTML = `<span>${cat}</span><span>₹${amt.toFixed(2)}</span>`;
      dayCategoryBreakdown.appendChild(row);
    });

    daySummaryModal.classList.add("active");
  }

  function getMonthYearLabel(month, year) {
    const d = new Date(year, month, 1);
    return d.toLocaleString("default", { month: "long", year: "numeric" });
  }

  // ----- Persistence -----

  function loadExpenses() {
    const raw = localStorage.getItem(LS_EXPENSES_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveExpenses() {
    localStorage.setItem(LS_EXPENSES_KEY, JSON.stringify(expenses));
  }

  function getBudget() {
    const raw = localStorage.getItem(LS_BUDGET_KEY);
    if (!raw) return 0;
    const val = parseFloat(raw);
    return isNaN(val) ? 0 : val;
  }

  function setBudget(value) {
    localStorage.setItem(LS_BUDGET_KEY, String(value));
  }

  function loadCategoryLimits() {
    const raw = localStorage.getItem(LS_CAT_LIMITS_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveCategoryLimits(limits) {
    localStorage.setItem(LS_CAT_LIMITS_KEY, JSON.stringify(limits));
  }

  // ----- State init -----

  expenses = loadExpenses();
  const categoryLimits = loadCategoryLimits();

  // Set default date as today
  if (dateInput) {
    dateInput.value = formatDate(new Date());
  }

  // ----- Filters -----

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.range || "all";
      calendarSelectedDate = null;
      render();
    });
  });

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      currentFilter = "all";
      calendarSelectedDate = null;
      if (searchInput) searchInput.value = "";
      filterButtons.forEach((b) => {
        if (b.dataset.range === "all") b.classList.add("active");
        else b.classList.remove("active");
      });
      render();
    });
  }

  // ----- Add expense -----

  if (expenseForm) {
    expenseForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = document.getElementById("title").value.trim();
      const amount = parseFloat(document.getElementById("amount").value);
      const category = document.getElementById("category").value;
      const dateStr = document.getElementById("date").value;
      const recurring = recurringInput.checked;

      if (!title || isNaN(amount) || !category || !dateStr) {
        window.showToast("Please fill all fields correctly", "error");
        return;
      }

      const newExpense = {
        id: Date.now(),
        title,
        amount,
        category,
        date: dateStr,
        recurring,
      };

      expenses.push(newExpense);
      saveExpenses();
      expenseForm.reset();
      dateInput.value = formatDate(new Date());
      recurringInput.checked = false;

      render();
      window.showToast("Expense added", "success");
    });
  }

  // ----- Edit/Delete -----

  function openEditModal(exp) {
    if (!editModal) return;
    editingId = exp.id;
    editTitleInput.value = exp.title;
    editAmountInput.value = exp.amount;
    editCategoryInput.value = exp.category;
    editDateInput.value = exp.date;
    editRecurringInput.checked = !!exp.recurring;
    editModal.classList.add("active");
  }

  function closeEditModal() {
    if (!editModal) return;
    editingId = null;
    editModal.classList.remove("active");
  }

  if (closeEditModalBtn) {
    closeEditModalBtn.addEventListener("click", closeEditModal);
  }

  // --- Close day summary modal ---
  if (closeDaySummaryBtn) {
    closeDaySummaryBtn.addEventListener("click", () => {
      daySummaryModal.classList.remove("active");
   });
  }

  if (daySummaryModal) {
    daySummaryModal.addEventListener("click", (e) => {
      if (e.target === daySummaryModal) {
        daySummaryModal.classList.remove("active");
      }
    });
  }  


  if (editModal) {
    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) closeEditModal();
    });
  }

  if (editForm) {
    editForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!editingId) return;

      const title = editTitleInput.value.trim();
      const amount = parseFloat(editAmountInput.value);
      const category = editCategoryInput.value;
      const date = editDateInput.value;
      const recurring = editRecurringInput.checked;

      if (!title || isNaN(amount) || !category || !date) {
        window.showToast("Fill all fields correctly", "error");
        return;
      }

      const idx = expenses.findIndex((exp) => exp.id === editingId);
      if (idx !== -1) {
        expenses[idx] = { ...expenses[idx], title, amount, category, date, recurring };
        saveExpenses();
      }

      render();
      closeEditModal();
      window.showToast("Expense updated", "success");
    });
  }

  function deleteExpense(id) {
    expenses = expenses.filter((exp) => exp.id !== id);
    saveExpenses();
    render();
    window.showToast("Expense deleted", "info");
  }

  // ----- Budget -----

  function updateBudgetUI() {
    if (!budgetBar || !budgetText) return;

    const budget = getBudget();
    if (!budget || budget <= 0) {
      budgetBar.style.width = "0%";
      budgetBar.style.background =
        "linear-gradient(90deg, #9ca3af, #d1d5db)";
      budgetText.textContent = "No global budget set";
      return;
    }

    const usage = (currentMonthTotal / budget) * 100;
    const clamped = Math.min(usage, 130);

    budgetBar.style.width = clamped + "%";

    if (usage < 80) {
      budgetBar.style.background =
        "linear-gradient(90deg, #22c55e, #4ade80)";
    } else if (usage < 100) {
      budgetBar.style.background =
        "linear-gradient(90deg, #f97316, #fb923c)";
    } else {
      budgetBar.style.background =
        "linear-gradient(90deg, #ef4444, #fb7185)";
    }

    const usedText = currentMonthTotal.toFixed(2);
    const budgetTextStr = budget.toFixed(2);

    if (usage < 80) {
      budgetText.textContent = `₹${usedText} of ₹${budgetTextStr} used`;
    } else if (usage < 100) {
      budgetText.textContent = `⚠ ₹${usedText} of ₹${budgetTextStr} used (high usage)`;
    } else {
      budgetText.textContent = `🚨 Over budget! Spent ₹${usedText} of ₹${budgetTextStr}`;
    }
  }

  if (saveBudgetBtn) {
    saveBudgetBtn.addEventListener("click", () => {
      const value = parseFloat(budgetInput.value);
      if (isNaN(value) || value <= 0) {
        window.showToast("Enter a valid positive budget", "error");
        return;
      }
      setBudget(value);
      updateBudgetUI();
      window.showToast("Monthly budget saved", "success");
    });
  }

  if (budgetInput) {
    const initialBudget = getBudget();
    if (initialBudget > 0) budgetInput.value = initialBudget;
  }

  // ----- Category limits UI -----

  function renderCategoryLimits() {
    if (!categoryLimitsContainer) return;
    categoryLimitsContainer.innerHTML = "";

    const currentTotals = getTotalsByCategoryCurrentMonth();

    CATEGORIES.forEach((cat) => {
      const row = document.createElement("div");
      row.className = "category-limit-row";

      const label = document.createElement("div");
      label.className = "category-label";
      label.textContent = cat;

      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.placeholder = "Limit";
      input.value = categoryLimits[cat] || "";
      input.dataset.category = cat;

      const barWrapper = document.createElement("div");
      barWrapper.className = "category-bar-wrapper";

      const outer = document.createElement("div");
      outer.className = "category-bar-outer";

      const inner = document.createElement("div");
      inner.className = "category-bar-inner";

      const used = currentTotals[cat] || 0;
      const limit = categoryLimits[cat] || 0;

      if (limit > 0) {
        const usage = (used / limit) * 100;
        const clamped = Math.min(usage, 130);
        inner.style.width = clamped + "%";

        if (usage < 80) {
          inner.style.background =
            "linear-gradient(90deg, #22c55e, #4ade80)";
        } else if (usage < 100) {
          inner.style.background =
            "linear-gradient(90deg, #f97316, #fb923c)";
        } else {
          inner.style.background =
            "linear-gradient(90deg, #ef4444, #fb7185)";
        }
      } else {
        inner.style.width = "0%";
      }

      outer.appendChild(inner);
      barWrapper.appendChild(outer);

      const text = document.createElement("div");
      text.className = "category-limit-text";
      if (limit > 0) {
        text.textContent = `₹${used.toFixed(2)} of ₹${limit.toFixed(
          2
        )} used`;
      } else {
        text.textContent = "No limit set";
      }

      barWrapper.appendChild(text);

      row.appendChild(label);
      row.appendChild(input);
      row.appendChild(barWrapper);
      categoryLimitsContainer.appendChild(row);
    });
  }

  if (saveCategoryLimitsBtn) {
    saveCategoryLimitsBtn.addEventListener("click", () => {
      const inputs = categoryLimitsContainer.querySelectorAll("input");
      const newLimits = {};
      inputs.forEach((input) => {
        const val = parseFloat(input.value);
        if (!isNaN(val) && val > 0) {
          newLimits[input.dataset.category] = val;
        }
      });
      Object.assign(categoryLimits, newLimits);
      saveCategoryLimits(categoryLimits);
      renderCategoryLimits();
      window.showToast("Category limits saved", "success");
    });
  }

  // ----- Insights -----

  function getTotalsByCategory(expList) {
    const totals = {};
    expList.forEach((exp) => {
      totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
    });
    return totals;
  }

  function getTotalsByCategoryCurrentMonth() {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    const thisMonthExpenses = expenses.filter((exp) => {
      const d = parseDate(exp.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    return getTotalsByCategory(thisMonthExpenses);
  }

  function buildInsights() {
    if (!insightsList) return;

    insightsList.innerHTML = "";

    if (expenses.length === 0) {
      const li = document.createElement("li");
      li.textContent = "Add some expenses to see insights.";
      insightsList.appendChild(li);
      return;
    }

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const monthExpenses = expenses.filter((exp) => {
      const d = parseDate(exp.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const prevMonthDate = new Date(thisYear, thisMonth - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    const prevMonthExpenses = expenses.filter((exp) => {
      const d = parseDate(exp.date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });

    const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const prevMonthTotal = prevMonthExpenses.reduce(
      (sum, e) => sum + e.amount,
      0
    );

    // 1. Compare month totals
    if (prevMonthTotal === 0 && monthTotal > 0) {
      addInsight("info", "📈", "This is your first recorded month of spending.");
    } else if (prevMonthTotal > 0) {
      const diff = monthTotal - prevMonthTotal;
      const perc = (diff / prevMonthTotal) * 100;
      if (perc > 10) {
        addInsight(
          "warn",
          "⚠",
          `You are spending about ${perc.toFixed(
            1
          )}% more than last month. Consider reviewing your budget.`
        );
      } else if (perc < -10) {
        addInsight(
          "good",
          "✅",
          `Nice! You are spending about ${Math.abs(perc).toFixed(
            1
          )}% less than last month.`
        );
      }
    }

    // 2. Top category
    const totals = getTotalsByCategory(monthExpenses);
    const topCat = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    if (topCat) {
      addInsight(
        "info",
        "💡",
        `You're spending the most on ${topCat[0]} this month (₹${topCat[1].toFixed(
          2
        )}).`
      );
    }

    // 3. Category limits warnings
    const catMonthTotals = getTotalsByCategoryCurrentMonth();
    CATEGORIES.forEach((cat) => {
      const limit = categoryLimits[cat];
      const used = catMonthTotals[cat] || 0;
      if (limit && used > 0) {
        const usage = (used / limit) * 100;
        if (usage >= 100) {
          addInsight(
            "error",
            "🚨",
            `${cat} has exceeded its limit (₹${used.toFixed(
              2
            )} of ₹${limit.toFixed(2)}).`
          );
        } else if (usage >= 80) {
          addInsight(
            "warn",
            "⚠",
            `${cat} is at ${usage.toFixed(
              1
            )}% of its limit. Try to control this category.`
          );
        }
      }
    });

    // 4. Recurring expenses info
    const recurringCount = expenses.filter((e) => e.recurring).length;
    if (recurringCount > 0) {
      addInsight(
        "info",
        "🔁",
        `You have ${recurringCount} recurring expense(s). Keep an eye on subscriptions.`
      );
    }
  }

  function addInsight(type, icon, text) {
    const li = document.createElement("li");
    const badge = document.createElement("span");
    badge.className = "insight-badge";
    badge.textContent = icon;
    const span = document.createElement("span");
    span.textContent = text;
    li.appendChild(badge);
    li.appendChild(span);
    insightsList.appendChild(li);
  }

  // ----- Search -----

  if (searchInput) {
    searchInput.addEventListener("input", render);
  }

  // ----- Calendar -----

  function buildCalendar() {
    if (!calendarGrid || !calendarMonthLabel) return;

    calendarGrid.innerHTML = "";
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const startWeekday = firstDay.getDay(); // 0 Sun - 6 Sat
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    calendarMonthLabel.textContent = getMonthYearLabel(
      calendarMonth,
      calendarYear
    );

    // daily totals
    const dailyTotals = {};
    expenses.forEach((exp) => {
      const d = parseDate(exp.date);
      if (d.getMonth() === calendarMonth && d.getFullYear() === calendarYear) {
        const day = d.getDate();
        dailyTotals[day] = (dailyTotals[day] || 0) + exp.amount;
      }
    });

    // Add weekday headers (Mon-Sun style omitted for brevity, using blank)
    // leading empty cells
    for (let i = 0; i < startWeekday; i++) {
      const cell = document.createElement("div");
      cell.className = "calendar-cell empty";
      calendarGrid.appendChild(cell);
    }

    // days
    for (let day = 1; day <= daysInMonth; day++) {
      const cell = document.createElement("div");
      cell.className = "calendar-cell";

      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;

      const dayNum = document.createElement("div");
      dayNum.className = "day-num";
      dayNum.textContent = day;

      const amountSpan = document.createElement("div");
      amountSpan.className = "day-amount";

      const total = dailyTotals[day] || 0;
      if (total > 0) {
        cell.classList.add("has-amount");
        amountSpan.textContent = `₹${total.toFixed(0)}`;
      } else {
        amountSpan.textContent = "";
      }

      if (calendarSelectedDate === dateStr) {
        cell.classList.add("selected");
      }

      cell.appendChild(dayNum);
      cell.appendChild(amountSpan);

      cell.addEventListener("click", () => {
        if (total === 0) {
          // click on empty day -> clear date filter
          calendarSelectedDate = null;
          currentFilter = "all";
        } else {
          calendarSelectedDate = dateStr;
          currentFilter = "date";

          // ⭐ ADD THIS LINE
          showDaySummary(dateStr);
        }

        filterButtons.forEach((b) => b.classList.remove("active"));
        render();
      });

      calendarGrid.appendChild(cell);
    }
  }

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", () => {
      calendarMonth -= 1;
      if (calendarMonth < 0) {
        calendarMonth = 11;
        calendarYear -= 1;
      }
      buildCalendar();
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", () => {
      calendarMonth += 1;
      if (calendarMonth > 11) {
        calendarMonth = 0;
        calendarYear += 1;
      }
      buildCalendar();
    });
  }

  // ----- Export/Import CSV -----

  function exportCsv() {
    if (expenses.length === 0) {
      window.showToast("No expenses to export", "error");
      return;
    }

    const header = ["id", "title", "amount", "category", "date", "recurring"];
    const rows = expenses.map((e) => [
      e.id,
      `"${e.title.replace(/"/g, '""')}"`,
      e.amount,
      e.category,
      e.date,
      e.recurring ? "1" : "0",
    ]);

    const csv =
      header.join(",") +
      "\n" +
      rows.map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    window.showToast("CSV exported", "success");
  }

  function importCsv(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.trim().split("\n");
      if (lines.length < 2) return;

      const header = lines[0].split(",");
      const idxMap = {};
      header.forEach((h, i) => {
        idxMap[h.trim()] = i;
      });

      const newExpenses = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        const title = cols[idxMap["title"]] || "";
        const amount = parseFloat(cols[idxMap["amount"]]);
        const category = cols[idxMap["category"]];
        const date = cols[idxMap["date"]];
        const recurring = cols[idxMap["recurring"]] === "1";

        if (!title || isNaN(amount) || !category || !date) continue;

        newExpenses.push({
          id: Date.now() + i,
          title: title.replace(/^"|"$/g, "").replace(/""/g, '"'),
          amount,
          category,
          date,
          recurring,
        });
      }

      if (newExpenses.length > 0) {
        expenses = expenses.concat(newExpenses);
        saveExpenses();
        render();
        window.showToast("CSV imported", "success");
      } else {
        window.showToast("No valid rows found in CSV", "error");
      }
    };
    reader.readAsText(file);
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", exportCsv);
  }

  if (importCsvInput) {
    importCsvInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) importCsv(file);
      e.target.value = "";
    });
  }

  // ----- Reset data -----

  if (resetDataBtn) {
    resetDataBtn.addEventListener("click", () => {
      if (!confirm("Are you sure you want to clear all expenses & limits?"))
        return;
      expenses = [];
      saveExpenses();
      localStorage.removeItem(LS_BUDGET_KEY);
      localStorage.removeItem(LS_CAT_LIMITS_KEY);
      budgetInput.value = "";
      Object.keys(categoryLimits).forEach((k) => delete categoryLimits[k]);
      render();
      window.showToast("All data cleared", "success");
    });
  }

  // ----- Filtering logic -----

  function passesFilter(exp) {
    const expDate = parseDate(exp.date);
    const today = new Date();

    if (currentFilter === "today") {
      return (
        expDate.getDate() === today.getDate() &&
        expDate.getMonth() === today.getMonth() &&
        expDate.getFullYear() === today.getFullYear()
      );
    }

    if (currentFilter === "month") {
      return (
        expDate.getMonth() === today.getMonth() &&
        expDate.getFullYear() === today.getFullYear()
      );
    }

    if (currentFilter === "date" && calendarSelectedDate) {
      return exp.date === calendarSelectedDate;
    }

    return true; // all
  }

  // ----- Rendering -----

  function renderTable() {
    if (!expenseTableBody) return;

    const query =
      searchInput && searchInput.value
        ? searchInput.value.toLowerCase().trim()
        : "";

    expenseTableBody.innerHTML = "";

    const filtered = expenses
      .filter(passesFilter)
      .filter((exp) => {
        const text = (exp.title + " " + exp.category).toLowerCase();
        return text.includes(query);
      });

    if (filtered.length === 0) {
      expenseTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; opacity:0.7;">
            No expenses match the current filters. 🧾
          </td>
        </tr>
      `;
      return;
    }

    filtered
      .sort((a, b) => parseDate(b.date) - parseDate(a.date))
      .forEach((exp) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${exp.date}</td>
          <td>${exp.title}</td>
          <td>${exp.category}</td>
          <td>₹${exp.amount.toFixed(2)}</td>
          <td>${exp.recurring ? "Yes" : "No"}</td>
          <td>
            <button class="btn-small btn-secondary">Edit</button>
            <button class="btn-small">Delete</button>
          </td>
        `;

        const [editBtn, deleteBtn] = tr.querySelectorAll("button");
        editBtn.addEventListener("click", () => openEditModal(exp));
        deleteBtn.addEventListener("click", () => deleteExpense(exp.id));

        expenseTableBody.appendChild(tr);
      });
  }

  function updateSummary() {
    if (!todayTotalEl || !monthTotalEl || !allTimeTotalEl) return;

    const today = new Date();
    const todayStr = formatDate(today);
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();

    let todayTotal = 0;
    let monthTotal = 0;
    let allTimeTotal = 0;

    expenses.forEach((exp) => {
      const expDate = parseDate(exp.date);
      allTimeTotal += exp.amount;

      if (exp.date === todayStr) {
        todayTotal += exp.amount;
      }
      if (
        expDate.getMonth() === thisMonth &&
        expDate.getFullYear() === thisYear
      ) {
        monthTotal += exp.amount;
      }
    });

    currentMonthTotal = monthTotal;

    todayTotalEl.textContent = "₹" + todayTotal.toFixed(2);
    monthTotalEl.textContent = "₹" + monthTotal.toFixed(2);
    allTimeTotalEl.textContent = "₹" + allTimeTotal.toFixed(2);

    if (summarySubtitle) {
      if (expenses.length === 0) {
        summarySubtitle.textContent = "No data yet — add your first expense!";
      } else {
        summarySubtitle.textContent = `Tracking ${expenses.length} expenses so far.`;
      }
    }
  }

  function updateChart() {
    const canvas = document.getElementById("categoryChart");
    if (!canvas) return;

    const categoryTotals = {};

    expenses.filter(passesFilter).forEach((exp) => {
      if (!categoryTotals[exp.category]) {
        categoryTotals[exp.category] = 0;
      }
      categoryTotals[exp.category] += exp.amount;
    });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    const ctx = canvas.getContext("2d");

    if (categoryChart) {
      categoryChart.destroy();
    }

    if (labels.length === 0) {
      categoryChart = null;
      return;
    }

    categoryChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            labels: {
              color: getComputedStyle(document.body).getPropertyValue(
                "--text-main"
              ),
            },
          },
        },
      },
    });
  }

  function toggleSections() {
    const anyData = expenses.length > 0;
    const cards = [summarySection, tableSection, limitsSection, calendarSection];

    cards.forEach((card) => {
      if (!card) return;
      if (anyData) card.classList.remove("hidden");
      else card.classList.add("hidden");
    });
  }

  function render() {
    toggleSections();
    renderTable();
    updateSummary();
    updateChart();
    updateBudgetUI();
    renderCategoryLimits();
    buildInsights();
    buildCalendar();
  }

  // ----- react to logout (clear in-memory + UI) -----
  window.addEventListener("user-logged-out", () => {
    // clear runtime state
    expenses = [];
    // persist cleared state to localStorage (optional — auth already removed keys, but safe)
    try {
      localStorage.setItem("det_expenses_v2", JSON.stringify([]));
    } catch (e) {
      console.warn("Couldn't write cleared expenses to localStorage", e);
    }

    // reset other in-memory vars used by app
    currentMonthTotal = 0;
    calendarSelectedDate = null;
    currentFilter = "all";

    // clear inputs that might have leftover values
    if (searchInput) searchInput.value = "";
    if (budgetInput) budgetInput.value = "";
    if (dateInput) dateInput.value = formatDate(new Date());

    // update UI
    render();
  });

});

// Expose formatDate if needed by other scripts
function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
