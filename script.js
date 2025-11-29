// script.js — agora com:
// - reload automático após registrar (para "ver como no Excel")
// - tipo "entrada" que adiciona saldo
// - data preenchida automaticamente (hoje) e descrição opcional
// - menu de categorias
// - campos Créditos / VR / Entrada editáveis no começo do mês

const DEFAULT = {
    accounts: [
      { id: "nubank", name: "Nubank", saldo: 60, gasto_credito: 540, gasto_vr: 0, investimento: 4093, guardado: 6823 },
      { id: "sicoob", name: "Sicoob", saldo: 0, gasto_credito: 140, gasto_vr: 0, investimento: 0, guardado: 0 },
      { id: "itau", name: "Itau", saldo: 552, gasto_credito: 0, gasto_vr: 0, investimento: 450, guardado: 453 },
      { id: "caju", name: "Caju", saldo: 750, gasto_credito: 0, gasto_vr: 90, investimento: 0, guardado: 0 }
    ],
    totals: { credito_total: 1800, vr_total: 840, entrada: 2311 },
    expenses: []
  };
  
  const STORAGE_KEY = "controleExcel_v3";
  let state = loadState();
  
  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){}
    return JSON.parse(JSON.stringify(DEFAULT));
  }
  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  
  function money(v){ v = Number(v||0); return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  const sum = (arr, fn)=> arr.reduce((s,x)=> s + (Number(fn?fn(x):x)||0), 0);
  
  // Calculations (fiel ao Excel)
  function calcDerived(){
    const total_gasto_credito = sum(state.accounts, a=>a.gasto_credito);
    const available_credit = Number(state.totals.credito_total || 0) - total_gasto_credito;
  
    const total_gasto_vr = sum(state.accounts, a=>a.gasto_vr);
    const available_vr = Number(state.totals.vr_total || 0) - total_gasto_vr;
  
    const guardado_total = sum(state.accounts, a=>a.guardado);
    const total_saldos = sum(state.accounts, a=>a.saldo);
  
    const vrAccount = state.accounts.find(a => a.name.toLowerCase().includes('caju') || a.name.toLowerCase().includes('vr'));
    const saldo_display = total_saldos - (vrAccount ? Number(vrAccount.saldo) : 0);
  
    const credito_debito = available_credit + saldo_display;
  
    return {
      total_gasto_credito, available_credit,
      total_gasto_vr, available_vr,
      guardado_total, total_saldos, saldo_display,
      credito_debito
    };
  }
  
  // Rendering dashboard
  let gastoChart = null;
  function renderAccountsTable(){
    const tbody = document.getElementById('accounts-body'); tbody.innerHTML = '';
    state.accounts.forEach(a=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${a.name}</td>
        <td>${money(a.saldo)}</td>
        <td>${money(a.gasto_credito)}</td>
        <td>${money(a.gasto_vr)}</td>
        <td>${money(a.investimento)}</td>
        <td>${money(a.guardado)}</td>`;
      tbody.appendChild(tr);
    });
  }
  
  function renderYellow(){
    const c = calcDerived();
    document.getElementById('avail-credit').textContent = money(c.available_credit);
    document.getElementById('avail-vr').textContent = money(c.available_vr);
    document.getElementById('avail-saldo').textContent = money(c.saldo_display);
    document.getElementById('avail-guardado').textContent = money(c.guardado_total);
    document.getElementById('credit-debit-small').textContent = money(c.credito_debito);
  }
  
  // Chart
  function renderChart(){
    const ctx = document.getElementById('gasto-credito-chart').getContext('2d');
    const labels = state.accounts.map(a=>a.name);
    const data = state.accounts.map(a=>Number(a.gasto_credito)||0);
    if(gastoChart) gastoChart.destroy();
    gastoChart = new Chart(ctx, {
      type:'bar',
      data:{ labels, datasets:[{ label:'Gasto Crédito', data }] },
      options:{
        plugins:{ legend:{display:false}, tooltip:{callbacks:{label:ctx=> `${ctx.label}: ${money(ctx.raw)}`}} },
        scales:{ x:{ ticks:{color:'#cbd5e1'} }, y:{ ticks:{ color:'#cbd5e1', callback:val=>'R$ '+val }, grid:{color:'rgba(255,255,255,0.03)'} } }
      }
    });
  }
  
  // Populate select elements (accounts, log filter, totals inputs)
  function populateAccountSelects(){
    const sel = document.getElementById('exp-account');
    const selLog = document.getElementById('log-account-filter');
    sel.innerHTML = ''; selLog.innerHTML = '<option value="all">Todas</option>';
    state.accounts.forEach(a=>{
      const opt = document.createElement('option'); opt.value = a.id; opt.textContent = a.name; sel.appendChild(opt);
      const opt2 = document.createElement('option'); opt2.value = a.id; opt2.textContent = a.name; selLog.appendChild(opt2);
    });
    // totals inputs
    document.getElementById('input-credit-total').value = state.totals.credito_total || 0;
    document.getElementById('input-vr-total').value = state.totals.vr_total || 0;
    document.getElementById('input-entrada-total').value = state.totals.entrada || 0;
  }
  
  // Editable accounts (linhas longas)
  function renderEditableAccounts(){
    const container = document.getElementById('editable-accounts'); container.innerHTML = '';
    state.accounts.forEach((acc, idx)=>{
      const card = document.createElement('div'); card.className = 'account-card';
      card.innerHTML = `
        <h4>${acc.name}</h4>
        <div class="account-row"><label>Saldo</label><input data-acc="${idx}" data-field="saldo" type="number" step="0.01" value="${acc.saldo}" /></div>
        <div class="account-row"><label>Gasto Crédito</label><input data-acc="${idx}" data-field="gasto_credito" type="number" step="0.01" value="${acc.gasto_credito}" /></div>
        <div class="account-row"><label>Gasto VR</label><input data-acc="${idx}" data-field="gasto_vr" type="number" step="0.01" value="${acc.gasto_vr}" /></div>
        <div class="account-row"><label>Investimento</label><input data-acc="${idx}" data-field="investimento" type="number" step="0.01" value="${acc.investimento}" /></div>
        <div class="account-row"><label>Guardado</label><input data-acc="${idx}" data-field="guardado" type="number" step="0.01" value="${acc.guardado}" /></div>
      `;
      container.appendChild(card);
    });
  
    container.querySelectorAll('input').forEach(inp=>{
      inp.addEventListener('input', e=>{
        const idx = Number(e.target.dataset.acc);
        const field = e.target.dataset.field;
        const val = Number(e.target.value || 0);
        state.accounts[idx][field] = val;
        updateAll();
      });
    });
  }
  
  // Investimentos
  function renderInvestimentos(){
    const list = document.getElementById('invest-list'); list.innerHTML = '';
    state.accounts.forEach(a=>{
      const item = document.createElement('div'); item.className = 'invest-item';
      item.innerHTML = `<div>${a.name}</div><div>${money(a.guardado)}</div>`;
      list.appendChild(item);
    });
    document.getElementById('guardado-total').textContent = money(sum(state.accounts, x=>x.guardado));
  }
  
  // Log
  function renderLogTable(filterAccountId = 'all'){
    const tbody = document.getElementById('log-body'); tbody.innerHTML = '';
    const data = filterAccountId === 'all' ? state.expenses : state.expenses.filter(e=>e.accountId === filterAccountId);
    data.sort((a,b)=> (a.date < b.date ? 1 : -1));
    data.forEach(exp=>{
      const acc = state.accounts.find(a=>a.id===exp.accountId);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${exp.date}</td>
        <td>${exp.desc || ''}</td>
        <td>${acc ? acc.name : exp.accountId}</td>
        <td>${exp.type}</td>
        <td>${exp.category || ''}</td>
        <td>${money(exp.amount)}</td>
        <td>${exp.method || ''}</td>
        <td><button data-id="${exp.id}" class="btn small del">Excluir</button></td>`;
      tbody.appendChild(tr);
    });
  
    tbody.querySelectorAll('button.del').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        const id = e.target.dataset.id;
        if(!confirm('Excluir esse gasto?')) return;
        const exp = state.expenses.find(x=>x.id===id);
        if(exp) applyExpenseReverse(exp);
        state.expenses = state.expenses.filter(x=>x.id!==id);
        saveState(); updateAll(); renderLogTable(document.getElementById('log-account-filter').value);
      });
    });
  }
  
  // Apply / revert expense effects
  function applyExpense(exp){
    const acc = state.accounts.find(a=>a.id===exp.accountId);
    if(!acc) return;
    if(exp.type === 'credito'){ acc.gasto_credito = Number(acc.gasto_credito||0) + Number(exp.amount||0); }
    else if(exp.type === 'vr'){ acc.gasto_vr = Number(acc.gasto_vr||0) + Number(exp.amount||0); }
    else if(exp.type === 'saldo'){ acc.saldo = Number(acc.saldo||0) - Number(exp.amount||0); }
    else if(exp.type === 'entrada'){ acc.saldo = Number(acc.saldo||0) + Number(exp.amount||0); }
  }
  
  function applyExpenseReverse(exp){
    const acc = state.accounts.find(a=>a.id===exp.accountId);
    if(!acc) return;
    if(exp.type === 'credito'){ acc.gasto_credito = Number(acc.gasto_credito||0) - Number(exp.amount||0); }
    else if(exp.type === 'vr'){ acc.gasto_vr = Number(acc.gasto_vr||0) - Number(exp.amount||0); }
    else if(exp.type === 'saldo'){ acc.saldo = Number(acc.saldo||0) + Number(exp.amount||0); }
    else if(exp.type === 'entrada'){ acc.saldo = Number(acc.saldo||0) - Number(exp.amount||0); }
  }
  
  // Form handling
  document.addEventListener('DOMContentLoaded', ()=>{
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
        document.getElementById('tab-'+tab).classList.add('active');
      });
    });
  
    // set date to today automatically and make editable (but prefilled)
    const today = new Date().toISOString().slice(0,10);
    const dateInput = document.getElementById('exp-date');
    dateInput.value = today;
  
    // populate selects & editable area
    init();
  
    // Hook totals inputs (definir no começo do mês)
    document.getElementById('input-credit-total').addEventListener('input', (e)=>{
      state.totals.credito_total = Number(e.target.value || 0);
      saveState(); renderYellow();
    });
    document.getElementById('input-vr-total').addEventListener('input', (e)=>{
      state.totals.vr_total = Number(e.target.value || 0);
      saveState(); renderYellow();
    });
    document.getElementById('input-entrada-total').addEventListener('input', (e)=>{
      state.totals.entrada = Number(e.target.value || 0);
      saveState();
    });
  
    // Form submit: register, apply effect, save, then RELOAD to reflect exactly
    const form = document.getElementById('expense-form');
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const date = document.getElementById('exp-date').value || new Date().toISOString().slice(0,10);
      const desc = document.getElementById('exp-desc').value.trim() || ''; // optional
      const amount = Number(document.getElementById('exp-amount').value || 0);
      const type = document.getElementById('exp-type').value;
      const accountId = document.getElementById('exp-account').value;
      const method = document.getElementById('exp-method').value.trim() || '';
      const category = document.getElementById('exp-category').value || 'outros';
  
      if(!amount || amount <= 0){ alert('Valor inválido'); return; }
  
      const newExp = {
        id: Date.now().toString(),
        date, desc, amount, type, accountId, method, category
      };
  
      // apply and save
      applyExpense(newExp);
      state.expenses.push(newExp);
      saveState();
  
      // reload a página para refletir os valores como você pediu
      location.reload();
    });
  
    // log filter change
    document.getElementById('log-account-filter').addEventListener('change', (e)=>{
      renderLogTable(e.target.value);
    });
  
    // save / reset
    document.getElementById('save-btn').addEventListener('click', ()=>{
      saveState(); alert('Salvo localmente no navegador.');
    });
    document.getElementById('reset-btn').addEventListener('click', ()=>{
      if(confirm('Resetar para os valores originais do Excel?')){
        state = JSON.parse(JSON.stringify(DEFAULT));
        saveState();
        location.reload();
      }
    });
  });
  
  // Update / render all
  function updateAll(){
    renderAccountsTable();
    renderYellow();
    renderChart();
    renderInvestimentos();
    saveState();
  }
  
  // Init
  function init(){
    populateAccountSelects();
    renderEditableAccounts();
    updateAll();
    document.getElementById('log-account-filter').value = 'all';
    renderLogTable('all');
  }
  