
/* troca de aba programática */
function activateTab(tabName){
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach(panel=>{
    panel.classList.toggle('active', panel.id === 'tab-' + tabName);
  });
}

// Fechar menus de opções se clicar fora deles
if(!window.actionMenuListenerAdded) {
  window.addEventListener('click', (e) => {
    if(!e.target.closest('.prod-action-menu')) {
      document.querySelectorAll('.action-dropdown').forEach(m => m.style.display = 'none');
    }
  });
  window.actionMenuListenerAdded = true;
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
      document.getElementById('tab-'+tab).classList.add('active');
    });
  });

  const monthIndexEl = document.getElementById('month-index');
  const monthLabelEl = document.getElementById('month-label');
  const prevMonthBtn = document.getElementById('prev-month');
  const nextMonthBtn = document.getElementById('next-month');
  
  function renderMonthIndex(){
    if(monthIndexEl) monthIndexEl.textContent = state.meta.activeOffset;
    if(monthLabelEl) monthLabelEl.textContent = computeMonthFromOffset(state.meta.activeOffset);
  }
  
  if(prevMonthBtn){
    prevMonthBtn.addEventListener('click', ()=>{
      state.meta.activeOffset = Number(state.meta.activeOffset || 0) - 1;
      saveState();
      renderMonthIndex();
      updateAll();
    });
  }
  
  if(nextMonthBtn){
    nextMonthBtn.addEventListener('click', ()=>{
      state.meta.activeOffset = Number(state.meta.activeOffset || 0) + 1;
      saveState();
      renderMonthIndex();
      updateAll();
    });
  }
  
  renderMonthIndex();

  populateAccountSelects();
  renderEditableAccounts();
  updateAll();

  const expDate = document.getElementById('exp-date');
  if(expDate) expDate.value = todayISO();
  const expForm = document.getElementById('expense-form');
  if(expForm) expForm.addEventListener('submit', handleExpenseSubmit);

    // Auto selecionar Caju quando tipo = "vr"
  // e mostrar/ocultar conta destino quando tipo = "transferencia"
  const expTypeSel = document.getElementById('exp-type');
  const expAccountSel = document.getElementById('exp-account');
  const expTransferWrap = document.getElementById('transfer-destination-wrap');
  const expTransferSel = document.getElementById('exp-transfer-account');

  function updateExpenseTypeUI() {
    if (!expTypeSel || !expAccountSel) return;

    if (expTypeSel.value === 'vr') {
      const caju = state.accounts.find(a =>
        a.name.toLowerCase().includes('caju') ||
        a.name.toLowerCase().includes('vr')
      );
      if (caju) {
        expAccountSel.value = caju.id;
      }
    }

    if (expTransferWrap) {
      expTransferWrap.style.display = expTypeSel.value === 'transferencia' ? 'block' : 'none';
    }

    if (expTypeSel.value !== 'transferencia' && expTransferSel) {
      expTransferSel.value = '';
    }
  }

  if (expTypeSel) {
    expTypeSel.addEventListener('change', updateExpenseTypeUI);
    updateExpenseTypeUI();
  }

  // início do mês buttons
  const applySalaryBtn = document.getElementById('apply-salary');
  const applyCardBtn = document.getElementById('apply-card');
  const closeMonthBtn = document.getElementById('close-month');
  const clearBtn = document.getElementById('clear-start-month');
  if(applySalaryBtn) applySalaryBtn.addEventListener('click', applySalary);
  if(applyCardBtn) applyCardBtn.addEventListener('click', applyCard);
  if(closeMonthBtn) closeMonthBtn.addEventListener('click', closeMonth);
  if(clearBtn) clearBtn.addEventListener('click', clearStartMonthFields);

  const logFilter = document.getElementById('log-account-filter');
  const logOnlyMonth = document.getElementById('log-show-only-month');
  if(logFilter) logFilter.addEventListener('change', renderLogTable);
  if(logOnlyMonth) logOnlyMonth.addEventListener('change', renderLogTable);

  const includeToggle = document.getElementById('include-start-entrada');
  if(includeToggle) includeToggle.addEventListener('change', ()=>{ renderEntradaPie(); });

  const saveBtn = document.getElementById('save-btn');
  const resetBtn = document.getElementById('reset-btn');
  if(saveBtn) saveBtn.addEventListener('click', ()=>{
    saveState();
    alert('Salvo localmente.');
  });
  if(resetBtn) resetBtn.addEventListener('click', ()=>{
    if(!confirm('Zerar tudo? Isso apaga saldos, guardado, crédito e todos os logs.')) return;
    state = JSON.parse(JSON.stringify(DEFAULT));
    window.state = state;
    state.meta.baseMonth = billingMonthOf(todayISO());
    state.meta.activeOffset = 0;
    saveState();
    location.reload();
  });

  const backupExportBtn = document.getElementById('backup-export');
  const backupImportInput = document.getElementById('backup-import-input');
  if(backupExportBtn) backupExportBtn.addEventListener('click', exportBackup);
  if(backupImportInput) backupImportInput.addEventListener('change', handleBackupImport);

  const boxCreateBtn = document.getElementById('box-create');
  if(boxCreateBtn) boxCreateBtn.addEventListener('click', handleCreateBox);

  // Impressora3D listeners
  const filAddBtn = document.getElementById('fil-add');
  if(filAddBtn) filAddBtn.addEventListener('click', handleAddFilament);

  const prodAddBtn = document.getElementById('prod-add');
  if(prodAddBtn) prodAddBtn.addEventListener('click', handleAddProduct);

  const impExportBtn = document.getElementById('imp3d-export');
  if(impExportBtn) impExportBtn.addEventListener('click', imp3dExport);

  const impClearBtn = document.getElementById('imp3d-clear');
  if(impClearBtn) impClearBtn.addEventListener('click', imp3dClearAll);

  const stockAddBtn = document.getElementById('stock-add');
  if(stockAddBtn) stockAddBtn.addEventListener('click', ()=>{
    const productId = document.getElementById('stock-prod')?.value || '';
    const variantId = document.getElementById('stock-variant')?.value || 'default';
    const filamentId = document.getElementById('stock-fil')?.value || '';
    const qty = Number(document.getElementById('stock-qty')?.value || 0);
    // ADICIONE ESTA LINHA:
    const note = document.getElementById('stock-note')?.value || '';

    if(!productId || !variantId || !filamentId || qty <= 0){
      alert('Selecione produto, variação, filamento e quantidade válidos.');
      return;
    }

    // PASSE A NOTA COMO ÚLTIMO PARÂMETRO
    stockProduct(productId, variantId, filamentId, qty, note);

    const qtyInput = document.getElementById('stock-qty');
    if(qtyInput) qtyInput.value = '';
    // LIMPE A NOTA APÓS ESTOCAR
    if(document.getElementById('stock-note')) document.getElementById('stock-note').value = '';
  });

    const sellStockBtn = document.getElementById('sell-stock-btn');
    if(sellStockBtn) sellStockBtn.addEventListener('click', ()=>{
      const stockId = document.getElementById('sell-stock-item')?.value || '';
      const qty = Number(document.getElementById('sell-stock-qty')?.value || 0);
    
      if(!stockId || qty <= 0){
        alert('Selecione um lote em estoque e uma quantidade válida.');
        return;
      }
    
      sellFromStock(stockId, qty);
    
      const qtyInput = document.getElementById('sell-stock-qty');
      if(qtyInput) qtyInput.value = '';
    });

  // botão de transferência Shopee -> Nubank
  const shToNbBtn = document.getElementById('sh-to-nb');
  if(shToNbBtn) shToNbBtn.addEventListener('click', ()=>{
    const v = Number(prompt('Valor para transferir Shopee → Nubank (R$):','0'));
    if(!v || v <= 0) return;
    transferShopeeToNubank(v);
  });

  //Ações do Dashboard da Loja
  const btnShopeeMp = document.getElementById('btn-shopee-mp');
  if (btnShopeeMp) {
    btnShopeeMp.addEventListener('click', () => {
      const v = Number(prompt('Valor a transferir da Shopee ➔ Mercado Pago (R$):', '0'));
      if (v > 0) transferShopeeToMercadoPago(v);
    });
  }

  const btnStoreExpense = document.getElementById('btn-store-expense');
  if (btnStoreExpense) {
    btnStoreExpense.addEventListener('click', () => {
      if(typeof openStoreExpenseForm === 'function') openStoreExpenseForm();
    });
  }

  //Faz o gráfico atualizar imediatamente ao clicares no Toggle
  const toggleAllTime = document.getElementById('dash-toggle-alltime');
  if (toggleAllTime) {
    toggleAllTime.addEventListener('change', () => {
      if(typeof renderImp3dDashboard === 'function') renderImp3dDashboard();
    });
  }
});

// Botão "Criar Caixa" na página de Caixas
document.addEventListener('DOMContentLoaded', () => {
  const addBoxBtn = document.getElementById('box-add-btn');
  if(addBoxBtn) {
    addBoxBtn.addEventListener('click', () => {
      const emoji = document.getElementById('box-new-emoji').value.trim() || '📦';
      const name = document.getElementById('box-new-name').value.trim();

      if(!name) return alert('Digite o nome da caixa.');

      state.productBoxes.push({
        id: 'box-' + Date.now(),
        name: name,
        emoji: emoji
      });

      saveState();
      document.getElementById('box-new-emoji').value = '';
      document.getElementById('box-new-name').value = '';
      updateAll();
    });
  }
});


/* ========================================================
   FUNÇÃO UPDATEALL ATUALIZADA
   ======================================================== */
function updateAll(){
  populateAccountSelects();
  renderEditableAccounts();
  renderAccountsTable();
  renderYellow();
  renderGastoCreditoChart();
  renderCategoryPie();
  renderMonthlyLine();
  renderInvestimentos();
  renderEntradaPie();
  saveState();
  renderLogTable();

  /* Impressora3D renders */
  renderFilaments();
  renderProducts();
  renderImpSales();
  renderImpLosses();
  renderImpStock();
  populateImp3dStockSelects();
  updateImp3dAccountBalances();

  /* Caixas e Categorias */
  populateProductBoxSelects();
  renderProductBoxes();

  /* Dashboard da Impressora 3D */
  renderImp3dDashboard(); 
}
