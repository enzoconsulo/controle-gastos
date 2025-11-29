// ============ CONFIG INICIAL ===========

// categorias padrão inspiradas na sua planilha
const defaultCategories = [
    { id: "alimentacao", name: "Alimentação", budget: 900 },
    { id: "transporte", name: "Transporte", budget: 200 },
    { id: "pets", name: "Pets", budget: 200 },
    { id: "lazer", name: "Lazer", budget: 200 },
    { id: "cuidar_voce", name: "Cuidar de você", budget: 200 },
    { id: "outros_vt", name: "Outros (VT/máquina)", budget: 200 },
    { id: "outros_caju", name: "Outros (Caju/VR)", budget: 200 },
    { id: "outros_credito", name: "Outros (Crédito)", budget: 200 },
    { id: "cursos", name: "Cursos", budget: 211 },
  ];
  
  const STORAGE_EXPENSES_KEY = "gastosAppExpenses";
  const STORAGE_CATEGORIES_KEY = "gastosAppCategories";
  
  let expenses = [];
  let categories = [];
  let pieChart = null;
  let barChart = null;
  
  // ============ FUNÇÕES DE FORMATAÇÃO ===========
  
  function formatCurrency(value) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }
  
  // ============ LOCALSTORAGE ===========
  
  function loadData() {
    const savedExpenses = localStorage.getItem(STORAGE_EXPENSES_KEY);
    expenses = savedExpenses ? JSON.parse(savedExpenses) : [];
  
    const savedCategories = localStorage.getItem(STORAGE_CATEGORIES_KEY);
    categories = savedCategories
      ? JSON.parse(savedCategories)
      : JSON.parse(JSON.stringify(defaultCategories)); // cópia
  }
  
  function saveExpenses() {
    localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(expenses));
  }
  
  function saveCategories() {
    localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(categories));
  }
  
  // ============ CÁLCULOS ===========
  
  function getTotalBudget() {
    return categories.reduce((sum, c) => sum + (Number(c.budget) || 0), 0);
  }
  
  function getTotalSpent() {
    return expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }
  
  function getTotalSpentByCategory(categoryId) {
    return expenses
      .filter((e) => e.categoryId === categoryId)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }
  
  // ============ RENDERIZAÇÃO ===========
  
  function renderSummary() {
    const totalBudgetEl = document.getElementById("total-budget");
    const totalSpentEl = document.getElementById("total-spent");
    const remainingTotalEl = document.getElementById("remaining-total");
  
    const totalBudget = getTotalBudget();
    const totalSpent = getTotalSpent();
    const remaining = totalBudget - totalSpent;
  
    totalBudgetEl.textContent = formatCurrency(totalBudget);
    totalSpentEl.textContent = formatCurrency(totalSpent);
    remainingTotalEl.textContent = formatCurrency(remaining);
  
    remainingTotalEl.className =
      "badge-" + (remaining >= 0 ? "positive" : "negative");
  }
  
  function renderCategorySelect() {
    const select = document.getElementById("expense-category");
    select.innerHTML = "";
    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
  }
  
  function renderCategoryBudgetTable() {
    const tbody = document.getElementById("category-budget-body");
    tbody.innerHTML = "";
  
    categories.forEach((c, index) => {
      const spent = getTotalSpentByCategory(c.id);
      const remaining = (Number(c.budget) || 0) - spent;
  
      const tr = document.createElement("tr");
  
      const nameTd = document.createElement("td");
      nameTd.textContent = c.name;
  
      const budgetTd = document.createElement("td");
      const input = document.createElement("input");
      input.type = "number";
      input.step = "0.01";
      input.min = "0";
      input.value = c.budget;
      input.dataset.index = index;
      input.className = "budget-input";
      budgetTd.appendChild(input);
  
      const spentTd = document.createElement("td");
      spentTd.textContent = formatCurrency(spent);
  
      const remainingTd = document.createElement("td");
      remainingTd.textContent = formatCurrency(remaining);
      remainingTd.className =
        "badge-" + (remaining >= 0 ? "positive" : "negative");
  
      tr.appendChild(nameTd);
      tr.appendChild(budgetTd);
      tr.appendChild(spentTd);
      tr.appendChild(remainingTd);
  
      tbody.appendChild(tr);
    });
  }
  
  function renderExpensesTable() {
    const tbody = document.getElementById("expenses-body");
    tbody.innerHTML = "";
  
    // mais recentes primeiro
    const sorted = [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1));
  
    sorted.forEach((e) => {
      const tr = document.createElement("tr");
  
      const dateTd = document.createElement("td");
      dateTd.textContent = e.date || "";
  
      const descTd = document.createElement("td");
      descTd.textContent = e.description;
  
      const catTd = document.createElement("td");
      const cat = categories.find((c) => c.id === e.categoryId);
      catTd.textContent = cat ? cat.name : "-";
  
      const payTd = document.createElement("td");
      payTd.textContent = e.paymentMethod;
  
      const amountTd = document.createElement("td");
      amountTd.textContent = formatCurrency(Number(e.amount));
  
      const actionTd = document.createElement("td");
      const btn = document.createElement("button");
      btn.textContent = "Excluir";
      btn.className = "btn-danger";
      btn.style.fontSize = "0.75rem";
      btn.style.padding = "4px 10px";
      btn.onclick = () => {
        deleteExpense(e.id);
      };
      actionTd.appendChild(btn);
  
      tr.appendChild(dateTd);
      tr.appendChild(descTd);
      tr.appendChild(catTd);
      tr.appendChild(payTd);
      tr.appendChild(amountTd);
      tr.appendChild(actionTd);
  
      tbody.appendChild(tr);
    });
  }
  
  // ============ GRÁFICOS ===========
  
  function updateCharts() {
    const labels = categories.map((c) => c.name);
    const spentData = categories.map((c) => getTotalSpentByCategory(c.id));
    const remainingData = categories.map((c) => {
      const remaining = (Number(c.budget) || 0) - getTotalSpentByCategory(c.id);
      return remaining > 0 ? remaining : 0;
    });
  
    const pieCtx = document
      .getElementById("expenses-by-category-chart")
      .getContext("2d");
    const barCtx = document
      .getElementById("remaining-by-category-chart")
      .getContext("2d");
  
    if (pieChart) pieChart.destroy();
    if (barChart) barChart.destroy();
  
    pieChart = new Chart(pieCtx, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [
          {
            data: spentData,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#e5e7eb",
            },
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const label = ctx.label || "";
                const value = ctx.raw || 0;
                return `${label}: ${formatCurrency(value)}`;
              },
            },
          },
        },
      },
    });
  
    barChart = new Chart(barCtx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Faltando",
            data: remainingData,
          },
        ],
      },
      options: {
        scales: {
          x: {
            ticks: { color: "#9ca3af" },
            grid: { display: false },
          },
          y: {
            ticks: {
              color: "#9ca3af",
              callback: function (val) {
                return "R$ " + val;
              },
            },
            grid: { color: "#111827" },
          },
        },
        plugins: {
          legend: {
            labels: { color: "#e5e7eb" },
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const value = ctx.raw || 0;
                return "Faltando: " + formatCurrency(value);
              },
            },
          },
        },
      },
    });
  }
  
  // ============ AÇÕES ===========
  
  function handleAddExpense(event) {
    event.preventDefault();
  
    const dateInput = document.getElementById("expense-date");
    const descInput = document.getElementById("expense-description");
    const categorySelect = document.getElementById("expense-category");
    const paymentSelect = document.getElementById("expense-payment");
    const amountInput = document.getElementById("expense-amount");
  
    const date = dateInput.value;
    const description = descInput.value.trim();
    const categoryId = categorySelect.value;
    const paymentMethod = paymentSelect.value;
    const amount = parseFloat(amountInput.value);
  
    if (!description || isNaN(amount) || amount <= 0) {
      alert("Preencha descrição e um valor válido.");
      return;
    }
  
    const newExpense = {
      id: Date.now().toString(),
      date: date,
      description: description,
      categoryId: categoryId,
      paymentMethod: paymentMethod,
      amount: amount,
    };
  
    expenses.push(newExpense);
    saveExpenses();
  
    descInput.value = "";
    amountInput.value = "";
  
    renderAll();
  }
  
  function deleteExpense(id) {
    if (!confirm("Excluir esse gasto?")) return;
    expenses = expenses.filter((e) => e.id !== id);
    saveExpenses();
    renderAll();
  }
  
  function handleSaveBudgets() {
    const inputs = document.querySelectorAll(".budget-input");
    inputs.forEach((input) => {
      const idx = Number(input.dataset.index);
      const value = parseFloat(input.value);
      categories[idx].budget = isNaN(value) ? 0 : value;
    });
    saveCategories();
    renderAll();
  }
  
  function clearAllExpenses() {
    if (!confirm("Tem certeza que deseja apagar TODOS os gastos?")) return;
    expenses = [];
    saveExpenses();
    renderAll();
  }
  
  function renderAll() {
    renderSummary();
    renderCategorySelect();
    renderCategoryBudgetTable();
    renderExpensesTable();
    updateCharts();
  }
  
  // ============ INICIALIZAÇÃO ===========
  
  document.addEventListener("DOMContentLoaded", () => {
    loadData();
  
    // data padrão = hoje
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById("expense-date").value = today;
  
    document
      .getElementById("expense-form")
      .addEventListener("submit", handleAddExpense);
  
    document
      .getElementById("save-budgets-btn")
      .addEventListener("click", handleSaveBudgets);
  
    document
      .getElementById("clear-expenses-btn")
      .addEventListener("click", clearAllExpenses);
  
    renderAll();
  });
  