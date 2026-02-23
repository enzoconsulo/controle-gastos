/* ---------- INÍCIO DO ARQUIVO (com Impressora3D e todas as funcionalidades pedidas) ---------- */

const STORAGE_KEY = "controleExcel_v10";

/* ======== CONFIGURAÇÃO FIXA: taxa Shopee (pode ajustar aqui) ======== */
const SHOPEE_FEE_FIXED = 4.00; // taxa fixa por unidade (R$) — ajuste se necessário
const SHOPEE_FEE_PCT = 0.20;  // 20% => escreva 0.20

const DEFAULT = {
  accounts: [
    { id: "nubank", name: "Nubank", saldo: 0, guardado: 0, credit_total: 0 },
    { id: "sicoob", name: "Sicoob", saldo: 0, guardado: 0, credit_total: 0 },
    { id: "itau", name: "Itau", saldo: 0, guardado: 0, credit_total: 0 },
    { id: "caju", name: "Caju", saldo: 0, guardado: 0, credit_total: 0 },
    // contas para Impressora3D
    { id: "imp3d", name: "imp3d", saldo: 0, guardado: 0, credit_total: 0 },
    { id: "shopee", name: "Shopee", saldo: 0, guardado: 0, credit_total: 0 }
  ],
  totals: { credito_total: 0, vr_total: 0, entrada: 0 },
  expenses: [],
  investments: [],
  startEntries: [],
  investBoxes: [],
  filaments: [],      // {id,color,type,weight,initialWeight,price}
  products: [],       // {id,name,hours,fil_g,price,desc}
  impSales: [],       // {id,date,productId,filamentId,accountId,qty,amountGross,feeTotal,netReceived,materialCost,profit}
  impLosses: [],      // {id,date,filamentId,grams,cost,reason}
  meta: { baseMonth: null, activeOffset: 0, lastCreditClosed: null }
};

let state = loadState();
window.state = state;

/* helpers básicos */
function money(v){ v = Number(v||0); return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
const sum = (arr, fn)=> arr.reduce((s,x)=> s + (Number(fn?fn(x):x)||0), 0);
function todayISO(){ return new Date().toISOString().slice(0,10); }

/* "mês lógico" de fatura: 24→23 */
function billingMonthOf(d){
  if(!d) return '';
  const parts = d.split('-').map(Number);
  if(parts.length < 3) return '';
  let [y,m,day] = parts;
  if(!y || !m || !day) return '';
  if(day >= 24){
    m += 1;
    if(m > 12){
      m = 1;
      y += 1;
    }
  }
  return `${y}-${String(m).padStart(2,'0')}`;
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const s = JSON.parse(raw);
      s.accounts = s.accounts.map(a=>{
        if(a.investimento && !a.guardado) a.guardado = Number(a.investimento||0);
        if(a.credit_total === undefined) a.credit_total = Number(a.credit_total||0);
        delete a.investimento;
        return a;
      });
      if(!s.startEntries) s.startEntries = [];
      if(!s.investBoxes) s.investBoxes = [];
      if(!s.meta) s.meta = DEFAULT.meta;
      if(!s.expenses) s.expenses = [];
      if(!s.investments) s.investments = [];
      if(!s.filaments) s.filaments = [];
      if(!s.products) s.products = [];
      if(!s.impSales) s.impSales = [];
      if(!s.impLosses) s.impLosses = [];
      // garantir contas imp3d / shopee em states antigos
      const hasImp3d = (s.accounts || []).some(a=>a.id === 'imp3d');
      const hasShopee = (s.accounts || []).some(a=>a.id === 'shopee');
      if(!hasImp3d) s.accounts.push({ id: "imp3d", name: "imp3d", saldo: 0, guardado: 0, credit_total: 0 });
      if(!hasShopee) s.accounts.push({ id: "shopee", name: "Shopee", saldo: 0, guardado: 0, credit_total: 0 });

      // --- compatibilidade: se filamento não tem initialWeight, define igual ao peso atual
      if(Array.isArray(s.filaments)){
        s.filaments.forEach(f => {
          if(f && (f.initialWeight === undefined || f.initialWeight === null)){
            // se veio de versão anterior, definir initialWeight igual ao peso atual (ou 0 se indefinido)
            f.initialWeight = Number(f.weight || 0);
          }
        });
      }

      // ancora o índice no ciclo da fatura atual (24→23)
      s.meta.baseMonth = billingMonthOf(todayISO());
      s.meta.lastCreditClosed = s.meta.lastCreditClosed || null;
      return s;
    }
  }catch(e){console.error(e);}
  const copy = JSON.parse(JSON.stringify(DEFAULT));
  copy.meta.baseMonth = billingMonthOf(todayISO());
  return copy;
}
function saveState(){ window.state = state; localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function computeMonthFromOffset(offset){
  const base = state.meta.baseMonth || billingMonthOf(todayISO());
  const [y,m] = base.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function getActiveMonth(){ return computeMonthFromOffset(state.meta.activeOffset); }

/* agregações por "mês de fatura" */
function monthlySumsByAccount(month){
  const map = {};
  state.accounts.forEach(a => map[a.id] = { gasto_credito:0, gasto_vr:0, gasto_saldo:0 });
  state.expenses
    .filter(e => billingMonthOf(e.date) === month)
    .forEach(e=>{
      if(!map[e.accountId]) map[e.accountId] = { gasto_credito:0, gasto_vr:0, gasto_saldo:0 };
      if(e.type === 'credito') map[e.accountId].gasto_credito += Number(e.amount||0);
      else if(e.type === 'vr') map[e.accountId].gasto_vr += Number(e.amount||0);
      else if(e.type === 'saldo') map[e.accountId].gasto_saldo += Number(e.amount||0);
    });
  return map;
}

function calcDerived(month){
  const sums = monthlySumsByAccount(month);
  const total_gasto_credito = sum(Object.values(sums), x => x.gasto_credito);
  const available_credit_total = Number(state.totals.credito_total || 0) - total_gasto_credito;

  const total_gasto_vr = sum(Object.values(sums), x => x.gasto_vr);
  const available_vr = Number(state.totals.vr_total||0) - total_gasto_vr;
  const guardado_total = sum(state.accounts, a => a.guardado || 0);
  const total_saldos = sum(state.accounts, a => a.saldo || 0);
  const vrAccount = state.accounts.find(a => a.name.toLowerCase().includes('caju') || a.name.toLowerCase().includes('vr'));
  const saldo_display = total_saldos - (vrAccount ? Number(vrAccount.saldo) : 0);
  const credito_debito = available_credit_total + saldo_display;

  return { sumsByAccount: sums, total_gasto_credito, available_credit_total, available_vr, guardado_total, saldo_display, credito_debito };
}

/* ---------- render ---------- */
let gastoChart=null, categoryChart=null, monthlyChart=null, entradaChart=null;

function renderAccountsTable(){
  const tbody = document.getElementById('accounts-body');
  if(!tbody) return;
  tbody.innerHTML = '';
  const month = getActiveMonth();
  const sums = monthlySumsByAccount(month);

  state.accounts.forEach(a => {
    const s = sums[a.id] || { gasto_credito:0, gasto_vr:0, gasto_saldo:0 };
    const isCaju = a.name.toLowerCase().includes('caju') || a.name.toLowerCase().includes('vr');
    const vrCellContent = isCaju ? money(s.gasto_vr) : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${a.name}</td>
      <td>${money(a.saldo)}</td>
      <td>${money(s.gasto_credito)}</td>
      <td>${vrCellContent}</td>
      <td>${money(a.guardado || 0)}</td>
    `;
    tbody.appendChild(tr);
  });

  // atualizar resumo conta imp3d se existir
  const imp3dAcc = state.accounts.find(a=>a.id==='imp3d');
  const imp3dBalanceEl = document.getElementById('imp3d-acc-balance');
  if(imp3dBalanceEl) imp3dBalanceEl.textContent = imp3dAcc ? money(imp3dAcc.saldo) : '—';
}

function renderYellow(){
  const d = calcDerived(getActiveMonth());
  const elAvailCredit = document.getElementById('avail-credit');
  const elAvailVr = document.getElementById('avail-vr');
  const elAvailSaldo = document.getElementById('avail-saldo');
  const elAvailGuardado = document.getElementById('avail-guardado');
  const elCd = document.getElementById('credit-debit-small');
  if(elAvailCredit) elAvailCredit.textContent = money(d.available_credit_total);
  if(elAvailVr) elAvailVr.textContent = money(d.available_vr);
  if(elAvailSaldo) elAvailSaldo.textContent = money(d.saldo_display);
  if(elAvailGuardado) elAvailGuardado.textContent = money(d.guardado_total);
  if(elCd) elCd.textContent = money(d.credito_debito);
}

/* charts (mantidos) */
function baseChartOptions(){
  return {
    responsive:true,
    maintainAspectRatio:false,
    aspectRatio:2,
    plugins:{ legend:{ labels:{ font:{ size:10 } } } },
    scales:{
      x:{ ticks:{ font:{ size:9 } }, grid:{ display:false } },
      y:{ ticks:{ font:{ size:9 } }, grid:{ color:'rgba(148,163,184,0.15)' } }
    }
  };
}

function renderGastoCreditoChart(){
  const el = document.getElementById('gasto-credito-chart');
  if(!el) return;
  const ctx = el.getContext('2d');
  const month = getActiveMonth();
  const sums = monthlySumsByAccount(month);
  const labels = state.accounts.map(a=>a.name);
  const data = state.accounts.map(a => (sums[a.id] ? sums[a.id].gasto_credito : 0));
  if(gastoChart) gastoChart.destroy();
  gastoChart = new Chart(ctx,{
    type:'bar',
    data:{ labels,datasets:[{label:'Gasto crédito',data}]},
    options:baseChartOptions()
  });
}

function renderCategoryPie(){
  const el = document.getElementById('category-pie-chart');
  if(!el) return;
  const ctx = el.getContext('2d');
  const month = getActiveMonth();
  const map = {};
  state.expenses
    .filter(e => billingMonthOf(e.date) === month)
    .forEach(e=>{
      if(e.type === 'entrada') return;
      map[e.category] = (map[e.category]||0) + Number(e.amount||0);
    });
  const labels = Object.keys(map);
  const data = labels.map(k=>map[k]);
  if(categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx,{
    type:'pie',
    data:{ labels,datasets:[{data}]},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      aspectRatio:1.4,
      plugins:{ legend:{ position:'bottom', labels:{ font:{ size:10 } } } }
    }
  });
}

function monthlyTotalsLastN(n=6){
  const arr=[];
  for(let i=state.meta.activeOffset-(n-1); i<=state.meta.activeOffset; i++){
    const month = computeMonthFromOffset(i);
    const total = state.expenses
      .filter(e => billingMonthOf(e.date) === month && e.type !== 'entrada')
      .reduce((s,x)=>s+Number(x.amount||0),0);
    arr.push({month,total});
  }
  return arr;
}
function renderMonthlyLine(){
  const el = document.getElementById('monthly-line-chart');
  if(!el) return;
  const ctx = el.getContext('2d');
  const arr = monthlyTotalsLastN(6);
  const labels = arr.map(x=>x.month), data = arr.map(x=>x.total);
  if(monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctx,{
    type:'line',
    data:{ labels,datasets:[{label:'Gasto total',data,fill:false,tension:0.25}]},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      aspectRatio:1.8,
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ ticks:{ font:{ size:9 } }, grid:{ display:false } },
        y:{ ticks:{ font:{ size:9 } }, grid:{ color:'rgba(148,163,184,0.15)' } }
      }
    }
  });
}

/* entradas */
function getEntradasDistribution(month, includeStart){
  const map = {};
  state.expenses
    .filter(e => billingMonthOf(e.date) === month && e.type === 'entrada')
    .forEach(e=>{
      map[e.accountId] = (map[e.accountId]||0) + Number(e.amount||0);
    });
  if(includeStart && state.startEntries){
    state.startEntries
      .filter(s => s.month === month)
      .forEach(s=>{
        map[s.accountId] = (map[s.accountId]||0) + Number(s.amount||0);
      });
  }
  return map;
}
function renderEntradaPie(){
  const el = document.getElementById('entrada-pie-chart');
  if(!el) return;
  const ctx = el.getContext('2d');
  const month = getActiveMonth();
  const includeStart = document.getElementById('include-start-entrada').checked;
  const map = getEntradasDistribution(month, includeStart);
  const labels = Object.keys(map).map(id => (state.accounts.find(a=>a.id===id) || {name:id}).name);
  const data = Object.keys(map).map(k => map[k]);
  if(entradaChart) entradaChart.destroy();
  entradaChart = new Chart(ctx,{
    type:'pie',
    data:{ labels,datasets:[{data}]},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      aspectRatio:1.4,
      plugins:{ legend:{ position:'bottom', labels:{ font:{ size:10 } } } }
    }
  });
}

/* selects & editable */
function populateAccountSelects(){
  const sel = document.getElementById('exp-account');
  const selLog = document.getElementById('log-account-filter');
  const selInvest = document.getElementById('invest-account');
  const boxSel = document.getElementById('box-account');

  if(sel) sel.innerHTML='';
  if(selLog) selLog.innerHTML='<option value="all">Todas</option>';
  if(selInvest) selInvest.innerHTML='';
  if(boxSel) boxSel.innerHTML='';

  state.accounts.forEach(a=>{
    if(sel){
      const o=document.createElement('option'); o.value=a.id; o.textContent=a.name; sel.appendChild(o);
    }
    if(selLog){
      const o2=document.createElement('option'); o2.value=a.id; o2.textContent=a.name; selLog.appendChild(o2);
    }
    if(selInvest){
      const o3=document.createElement('option'); o3.value=a.id; o3.textContent=a.name; selInvest.appendChild(o3);
    }
    if(boxSel){
      const o4=document.createElement('option'); o4.value=a.id; o4.textContent=a.name; boxSel.appendChild(o4);
    }
  });

  const inicioCredits = document.getElementById('inicio-credits');
  if(inicioCredits){
    inicioCredits.innerHTML = '';
    state.accounts.forEach((a, idx) => {
      const card = document.createElement('div'); card.className = 'account-card';
      card.innerHTML = `<h4>${a.name}</h4>
        <div class="account-row"><label>Crédito</label><input data-acc="${idx}" data-field="credit_total" type="number" step="0.01" value="${a.credit_total||0}" /></div>`;
      inicioCredits.appendChild(card);
    });
    inicioCredits.querySelectorAll('input').forEach(inp=>{
      inp.addEventListener('input', e=>{
        const idx = Number(e.target.dataset.acc);
        const field = e.target.dataset.field;
        state.accounts[idx][field] = Number(e.target.value || 0);
        saveState(); updateAll();
      });
    });
  }

  const vrInput = document.getElementById('inicio-vr-total');
  const entInput = document.getElementById('inicio-entrada-total');
  const credInput = document.getElementById('inicio-credit-global');
  if(vrInput) vrInput.value = state.totals.vr_total || 0;
  if(entInput) entInput.value = state.totals.entrada || 0;
  if(credInput) credInput.value = state.totals.credito_total || 0;
}

function renderEditableAccounts(){
  const c = document.getElementById('editable-accounts'); 
  if(!c) return;
  c.innerHTML='';
  state.accounts.forEach((acc, idx)=>{
    const card = document.createElement('div'); card.className='account-card';
    card.innerHTML = `<h4>${acc.name}</h4>
      <div class="account-row"><label>Saldo</label><input data-acc="${idx}" data-field="saldo" type="number" step="0.01" value="${acc.saldo}" /></div>
      <div class="account-row"><label>Guardado</label><input data-acc="${idx}" data-field="guardado" type="number" step="0.01" value="${acc.guardado||0}" /></div>
      <div class="account-row"><label>Crédito</label><input data-acc="${idx}" data-field="credit_total" type="number" step="0.01" value="${acc.credit_total||0}" /></div>`;
    c.appendChild(card);
  });

  c.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('input', e=>{
      const idx = Number(e.target.dataset.acc);
      const field = e.target.dataset.field;
      const val = Number(e.target.value || 0);
      state.accounts[idx][field] = val;
      saveState(); updateAll();
    });
  });
}

/* investimentos: resumo + log + caixinhas (mantidos) */
function renderInvestimentos(){
  const list = document.getElementById('invest-list'); 
  if(list){
    list.innerHTML='';
    state.accounts.forEach(a=>{
      const item=document.createElement('div'); item.className='invest-item';
      item.innerHTML=`<div>${a.name}</div><div>${money(a.guardado||0)}</div>`;
      list.appendChild(item);
    });
  }

  const totalEl = document.getElementById('guardado-total');
  if(totalEl) totalEl.textContent = money(sum(state.accounts, x=>x.guardado||0));

  renderInvestLog();
  renderInvestBoxes();
}

function renderInvestLog(){
  const tbody = document.getElementById('invest-log-body'); 
  if(!tbody) return;
  tbody.innerHTML='';
  const arr = [...state.investments].sort((a,b)=> a.date < b.date ? 1 : -1);
  arr.forEach(i=>{
    const acc = state.accounts.find(a=>a.id === i.accountId);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i.date}</td><td>${acc?acc.name:i.accountId}</td><td>${i.action}</td><td>${money(i.amount)}</td><td>${i.desc||''}</td>`;
    tbody.appendChild(tr);
  });
}

/* caixinhas (mantidos) */
function renderInvestBoxes(){
  const container = document.getElementById('invest-boxes');
  if(!container) return;
  container.innerHTML='';

  if(!state.investBoxes.length){
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Nenhuma caixinha criada ainda. Crie uma acima para organizar seus investimentos.';
    container.appendChild(empty);
    return;
  }

  state.investBoxes.forEach(box=>{
    const card = document.createElement('div');
    card.className = 'box-card';
    card.innerHTML = `
      <div class="box-header">
        <div>
          <div class="box-name">${box.name}</div>
          <div class="box-desc">${box.desc || ''}</div>
        </div>
        <div class="box-amount">${money(box.amount||0)}</div>
      </div>
      <div class="box-body">
        <label>Conta</label>
        <select class="box-account-select" data-id="${box.id}">
          ${state.accounts.map(a=>`<option value="${a.id}" ${a.id===box.accountId?'selected':''}>${a.name}</option>`).join('')}
        </select>
        <label>Valor para guardar</label>
        <div class="box-input-row">
          <input type="number" step="0.01" class="box-amount-input" data-id="${box.id}" placeholder="R$ 0,00">
          <button type="button" class="btn small box-save" data-id="${box.id}">Guardar</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('.box-account-select').forEach(sel=>{
    sel.addEventListener('change', e=>{
      const id = e.target.dataset.id;
      const box = state.investBoxes.find(b=>b.id===id);
      if(!box) return;
      box.accountId = e.target.value;
      saveState();
      updateAll();
    });
  });

  container.querySelectorAll('.box-save').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = e.target.dataset.id;
      const box = state.investBoxes.find(b=>b.id===id);
      if(!box) return;
      const input = container.querySelector(`input.box-amount-input[data-id="${id}"]`);
      const amount = Number(input.value || 0);
      if(!amount || amount<=0){ alert('Valor inválido.'); return; }
      const acc = state.accounts.find(a=>a.id===box.accountId);
      if(!acc){ alert('Conta inválida.'); return; }
      if(Number(acc.saldo||0) < amount){
        if(!confirm('Saldo pode ficar negativo. Continuar?')) return;
      }
      acc.saldo = Number(acc.saldo||0) - amount;
      acc.guardado = Number(acc.guardado||0) + amount;
      box.amount = Number(box.amount||0) + amount;

      const entry = {
        id: Date.now().toString(),
        date: todayISO(),
        accountId: box.accountId,
        action: 'guardar',
        amount,
        desc: box.name ? `[${box.name}] ${box.desc||''}` : (box.desc||'')
      };
      state.investments.push(entry);
      saveState();
      updateAll();
      input.value='';
      alert('Valor guardado na caixinha.');
    });
  });
}

/* log (mantido) */
function renderLogTable(){
  const tbody = document.getElementById('log-body'); 
  if(!tbody) return;
  tbody.innerHTML='';
  const accountFilter = document.getElementById('log-account-filter').value;
  const onlyMonth = document.getElementById('log-show-only-month').checked;
  const month = getActiveMonth();
  let arr = state.expenses.slice();
  if(onlyMonth) arr = arr.filter(e => billingMonthOf(e.date) === month);
  if(accountFilter !== 'all') arr = arr.filter(e => e.accountId === accountFilter);
  arr.sort((a,b)=> a.date < b.date ? 1 : -1);
  arr.forEach(exp=>{
    const acc = state.accounts.find(a=>a.id===exp.accountId);
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${exp.date}</td><td>${exp.desc||''}</td><td>${acc?acc.name:exp.accountId}</td><td>${exp.type}</td><td>${exp.category||''}</td><td>${money(exp.amount)}</td><td>${exp.method||''}</td><td><button data-id="${exp.id}" class="btn small del">Excluir</button></td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('button.del').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = e.target.dataset.id;
      if(!confirm('Excluir esse lançamento?')) return;
      const exp = state.expenses.find(x=>x.id===id);
      if(exp) applyExpenseReverse(exp);
      state.expenses = state.expenses.filter(x=>x.id!==id);
      saveState(); updateAll(); renderLogTable();
    });
  });
}

/* efeitos dos lançamentos (inclui VR debitando saldo do Caju) */
function applyExpenseEffects(exp){
  if(exp.type === 'vr'){
    const caju = state.accounts.find(a =>
      a.name.toLowerCase().includes('caju') ||
      a.name.toLowerCase().includes('vr')
    );
    if(caju){
      exp.accountId = caju.id;
    }
  }

  const acc = state.accounts.find(a=>a.id===exp.accountId);
  if(!acc) return;

  if(exp.type === 'saldo'){
    acc.saldo = Number(acc.saldo||0) - Number(exp.amount||0);
  }
  else if(exp.type === 'entrada'){
    acc.saldo = Number(acc.saldo||0) + Number(exp.amount||0);
    if(exp.category === 'investimento'){
      acc.guardado = Number(acc.guardado||0) + Number(exp.amount||0);
    }
  }
  else if(exp.type === 'vr'){
    acc.saldo = Number(acc.saldo||0) - Number(exp.amount||0);
  }
}

function applyExpenseReverse(exp){
  const acc = state.accounts.find(a=>a.id===exp.accountId);
  if(!acc) return;

  if(exp.type === 'saldo'){
    acc.saldo = Number(acc.saldo||0) + Number(exp.amount||0);
  }
  else if(exp.type === 'entrada'){
    acc.saldo = Number(acc.saldo||0) - Number(exp.amount||0);
    if(exp.category === 'investimento'){
      acc.guardado = Number(acc.guardado||0) - Number(exp.amount||0);
    }
  }
  else if(exp.type === 'vr'){
    acc.saldo = Number(acc.saldo||0) + Number(exp.amount||0);
  }
}

/* criar caixinha (mantido) */
function handleCreateBox(){
  const name = document.getElementById('box-name').value.trim();
  const accountId = document.getElementById('box-account').value;
  const desc = document.getElementById('box-desc').value.trim();

  if(!name){
    alert('Dê um nome para a caixinha.');
    return;
  }
  if(!accountId){
    alert('Escolha uma conta para a caixinha.');
    return;
  }

  const box = {
    id: Date.now().toString(),
    name,
    accountId,
    desc,
    amount: 0
  };
  state.investBoxes.push(box);
  saveState();
  document.getElementById('box-name').value = '';
  document.getElementById('box-desc').value = '';
  updateAll();
}

/* troca de aba programática */
function activateTab(tabName){
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach(panel=>{
    panel.classList.toggle('active', panel.id === 'tab-' + tabName);
  });
}

/* submit gasto/entrada (mantido) */
function handleExpenseSubmit(e){
  e.preventDefault();
  const date = document.getElementById('exp-date').value || todayISO();
  const desc = document.getElementById('exp-desc').value.trim() || '';
  const amount = Number(document.getElementById('exp-amount').value || 0);
  const type = document.getElementById('exp-type').value;
  const accountId = document.getElementById('exp-account').value;
  const method = document.getElementById('exp-method').value.trim() || '';
  const category = document.getElementById('exp-category').value || 'outros';
  if(!amount || amount <= 0){ alert('Valor inválido'); return; }

  if(type === 'credito'){
    const month = getActiveMonth();
    const sums = monthlySumsByAccount(month);
    const total_used = sum(Object.values(sums), x => x.gasto_credito);
    const avail = Number(state.totals.credito_total || 0) - total_used;
    if(avail < amount){
      if(!confirm(`Crédito disponível global é ${money(avail)}. Deseja registrar mesmo assim?`)) return;
    }
  }

  const newExp = { id: Date.now().toString(), date, desc, amount, type, accountId, method, category };
  applyExpenseEffects(newExp);
  if(!Array.isArray(state.expenses)) state.expenses = [];
  state.expenses.push(newExp);
  saveState();
  updateAll();

  document.getElementById('exp-amount').value = '';
  document.getElementById('exp-desc').value = '';
  document.getElementById('exp-method').value = '';

  activateTab('dashboard');
}

/* início do mês (mantido) */
function applySalary(){
  const vr = Number(document.getElementById('inicio-vr-total').value || 0);
  const entrada = Number(document.getElementById('inicio-entrada-total').value || 0);

  if(!entrada || entrada <= 0){
    if(!confirm('Entrada inicial está vazia ou zero. Deseja continuar sem aplicar salário?')) return;
  }

  const currentMonth = getActiveMonth();

  // Atualiza totals.entrada e registra startEntry (mantendo histórico, sem duplicar)
  state.totals.entrada = entrada;
  const itau = state.accounts.find(a => a.name.toLowerCase().includes('itau'));
  if(itau && entrada > 0){
    state.startEntries = (state.startEntries || []).filter(se => !(se.month === currentMonth && se.accountId === itau.id));
    state.startEntries.push({ month: currentMonth, accountId: itau.id, amount: entrada });
    itau.saldo = Number(itau.saldo || 0) + entrada; // SOMA, não sobrescreve
  }

  // Exigir/usar VR informado para atualizar CAJU (se houver)
  const caju = state.accounts.find(a => a.name.toLowerCase().includes('caju') || a.name.toLowerCase().includes('vr'));
  if(caju){
    if(isNaN(vr) || vr === 0){
      if(!confirm('Valor de VR (Caju) está vazio/zero. Deseja continuar sem atualizar o VR?')) {
        // se usuário cancelar, não aplicamos salário
        return;
      }
    } else {
      state.totals.vr_total = vr;
      caju.saldo = Number(vr || 0); // sobrescreve o saldo do Caju com o valor do input
    }
  }

  saveState();
  updateAll();
  alert(`Entrada aplicada: ${money(entrada)}\nVR (Caju) definido: ${money(vr)}`);
}

/* applyCard - fecha fatura anterior e atualiza crédito global (mantido) */
function applyCard(){
  const newGlobalCredit = Number(document.getElementById('inicio-credit-global').value || 0);
  const vr = Number(document.getElementById('inicio-vr-total').value || 0);
  const currentMonth = getActiveMonth();
  const prevMonth = computeMonthFromOffset(state.meta.activeOffset - 1);

  // evitar fechar a mesma fatura duas vezes
  state.meta.lastCreditClosed = state.meta.lastCreditClosed || null;
  if(state.meta.lastCreditClosed === prevMonth){
    alert(`Fatura de ${prevMonth} já foi fechada.`);
    return;
  }

  // 1) FECHAMENTO DO CRÉDITO DO MÊS ANTERIOR
  const prevCreditTotal = Number(state.totals.credito_total || 0);
  const caju = state.accounts.find(a => a.name.toLowerCase().includes('caju') || a.name.toLowerCase().includes('vr'));
  const cajuId = caju ? caju.id : null;

  let creditUsedPrevMonth = 0;
  state.expenses
    .filter(e => billingMonthOf(e.date) === prevMonth && e.type === 'credito' && e.accountId !== cajuId)
    .forEach(e => { creditUsedPrevMonth += Number(e.amount || 0); });

  const creditBalance = prevCreditTotal - creditUsedPrevMonth;

  // joga diferença no Nubank
  const nubank = state.accounts.find(a => a.name.toLowerCase().includes('nubank'));
  if(nubank && creditBalance !== 0){
    nubank.saldo = Number(nubank.saldo || 0) + creditBalance;
  }

  // marca mês como fechado (para não fechar duas vezes)
  state.meta.lastCreditClosed = prevMonth;

  // 2) ATUALIZA O CRÉDITO GLOBAL
  state.totals.credito_total = newGlobalCredit;

  // 3) atualizar VR/caju se informado
  if(caju && !isNaN(vr) && vr > 0){
    state.totals.vr_total = vr;
    caju.saldo = Number(vr || 0);
  }

  // 4) também atualiza créditos por conta (inputs)
  const inicioCredits = document.getElementById('inicio-credits');
  if(inicioCredits){
    state.accounts.forEach((acc, idx) => {
      const inp = inicioCredits.querySelector(`input[data-acc="${idx}"]`);
      if(inp){
        acc.credit_total = Number(inp.value || 0);
      }
    });
  }

  saveState();
  updateAll();
  alert(`Fatura de ${prevMonth} fechada.\nDiferença (adicionada a Nubank): ${money(creditBalance)}\nCrédito global atualizado: ${money(newGlobalCredit)}`);
}

/* Fecha o mês lógico (mantido) */
function closeMonth(){
  if(!confirm('Tem certeza que deseja fechar o mês e avançar o índice do mês lógico?')) return;
  state.meta.activeOffset = Number(state.meta.activeOffset || 0) + 1;
  saveState();
  updateAll();
  alert('Mês fechado. Índice do mês avançado.');
}

/* limpar campos início mês (mantido) */
function clearStartMonthFields(){
  const vrInput = document.getElementById('inicio-vr-total');
  const entInput = document.getElementById('inicio-entrada-total');
  const credInput = document.getElementById('inicio-credit-global');
  if(vrInput) vrInput.value = '';
  if(entInput) entInput.value = '';
  if(credInput) credInput.value = '';
  const inicioCredits = document.getElementById('inicio-credits');
  if(inicioCredits) inicioCredits.querySelectorAll('input').forEach(i=> i.value = '');
}

/* transfer Shopee -> Nubank (mantido) */
function transferShopeeToNubank(amount){
  amount = Number(amount || 0);
  if(!amount || amount <= 0) return alert('Valor inválido para transferência.');
  const sh = state.accounts.find(a=>a.id==='shopee');
  const nb = state.accounts.find(a=>a.id==='nubank');
  if(!sh || !nb) return alert('Contas Shopee ou Nubank não encontradas.');
  if(Number(sh.saldo || 0) < amount){
    if(!confirm('Saldo Shopee insuficiente. Deseja permitir saldo negativo?')) {
      return;
    }
  }
  sh.saldo = Number(sh.saldo || 0) - amount;
  nb.saldo = Number(nb.saldo || 0) + amount;

  // criar entradas para registro: retirada de Shopee (saldo) e entrada em Nubank
  const out = { id: 'imp3d-tr-out-' + Date.now().toString(), date: todayISO(), desc:`Transfer to Nubank`, amount, type:'saldo', accountId:'shopee', category:'transfer_shopee', method:'transfer' };
  const inent = { id: 'imp3d-tr-in-' + Date.now().toString(), date: todayISO(), desc:`Transfer from Shopee`, amount, type:'entrada', accountId:'nubank', category:'transfer_shopee', method:'transfer' };
  state.expenses.push(out);
  state.expenses.push(inent);

  saveState();
  updateAll();
  alert(`Transferido ${money(amount)} de Shopee para Nubank.`);
}

/* ---------- BACKUP (mantido) ---------- */
function exportBackup(){
  try{
    const dataStr = JSON.stringify(state);
    const blob = new Blob([dataStr], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
    a.href = url;
    a.download = `controle-gastos-backup-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }catch(e){
    console.error(e);
    alert('Não foi possível gerar o backup.');
  }
}
function handleBackupImport(e){
  const file = e.target.files[0];
  if(!file){
    e.target.value='';
    return;
  }
  if(!confirm('Importar backup e substituir TODOS os dados atuais?')){
    e.target.value='';
    return;
  }
  const reader = new FileReader();
  reader.onload = ev =>{
    try{
      const data = JSON.parse(ev.target.result);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      state = loadState();
      alert('Backup importado com sucesso.');
      location.reload();
    }catch(err){
      console.error(err);
      alert('Arquivo de backup inválido ou corrompido.');
    }finally{
      e.target.value='';
    }
  };
  reader.readAsText(file);
}

/* ---------- IMPRESSORA3D: UI + lógica (ajustes e correções) ---------- */

/* Render lista de filamentos */
function renderFilaments(){
  const container = document.getElementById('filaments-list');
  if(!container) return;
  container.innerHTML = '';
  if(!state.filaments.length){
    const p = document.createElement('p'); p.className='muted'; p.textContent = 'Nenhum filamento no estoque.';
    container.appendChild(p);
    if(document.getElementById('imp3d-total-fil')) document.getElementById('imp3d-total-fil').textContent = '0 g';
    return;
  }
  state.filaments.forEach(f=>{
    const el = document.createElement('div');
    el.className = 'box-card';
    el.style.display = 'flex';
    el.style.justifyContent = 'space-between';
    el.style.alignItems = 'center';
    el.innerHTML = `<div>
        <div style="font-weight:700">${f.color} — ${f.type}</div>
        <div style="font-size:0.85rem;color:var(--muted);">ID: ${f.id}</div>
        <div style="font-size:0.85rem;color:var(--muted); margin-top:6px">Preço: ${money(Number(f.price||0))}</div>
        <div style="font-size:0.85rem;color:var(--muted); margin-top:2px">Rolo inicial: ${Number(f.initialWeight||0).toFixed(2)} g</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700">${(Number(f.weight)||0).toFixed(2)} g</div>
        <div style="margin-top:6px">
          <button class="btn small fil-edit" data-id="${f.id}">Editar</button>
          <button class="btn small fil-withdraw" data-id="${f.id}">Retirar</button>
          <button class="btn small fil-del" data-id="${f.id}">Remover</button>
        </div>
      </div>`;
    container.appendChild(el);
  });

  // events
  container.querySelectorAll('.fil-del').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.target.dataset.id;
      if(!confirm('Remover filamento do estoque? Esta ação não pode ser desfeita.')) return;
      state.filaments = state.filaments.filter(x=>x.id !== id);
      saveState(); updateAll();
    });
  });

  container.querySelectorAll('.fil-edit').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.target.dataset.id;
      const f = state.filaments.find(x=>x.id===id);
      if(!f) return;
      const newColor = prompt('Cor:', f.color);
      if(newColor === null) return;
      const newType = prompt('Tipo:', f.type);
      if(newType === null) return;
      const newWeight = prompt('Peso (g):', f.weight);
      if(newWeight === null) return;
      const newInitial = prompt('Peso inicial do rolo (g):', f.initialWeight || f.weight || 0);
      if(newInitial === null) return;
      const newPrice = prompt('Preço (R$):', f.price || '0');
      if(newPrice === null) return;
      f.color = newColor.trim();
      f.type = newType.trim();
      f.weight = Number(newWeight || 0);
      f.initialWeight = Number(newInitial || f.weight || 0);
      f.price = Number(newPrice || 0);
      saveState(); updateAll();
    });
  });

  container.querySelectorAll('.fil-withdraw').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.target.dataset.id;
      const f = state.filaments.find(x=>x.id===id);
      if(!f) return;
      const gramsStr = prompt(`Quantos gramas deseja retirar do filamento "${f.color} — ${f.type}"?`, '0');
      if(gramsStr === null) return;
      const grams = Number(gramsStr || 0);
      if(!grams || grams <= 0){ alert('Quantidade inválida'); return; }
      const costStr = prompt('Qual o custo dessa retirada em R$? (ex: 3.50)', '0');
      if(costStr === null) return;
      const cost = Number(costStr || 0);
      const reason = prompt('Motivo (opcional):', 'Perda / falha de impressão') || '';

      if(Number(f.weight || 0) < grams){
        if(!confirm(`Filamento tem ${Number(f.weight||0).toFixed(2)} g, você quer permitir ficar negativo?`)) return;
      }

      // subtrai filamento
      f.weight = Number(f.weight || 0) - grams;

      // registra perda em impLosses
      const loss = {
        id: 'loss-' + Date.now().toString(),
        date: todayISO(),
        filamentId: id,
        grams: Number(grams),
        cost: Number(cost),
        reason: reason
      };
      state.impLosses.push(loss);

      // registra despesa no log principal (conta imp3d)
      const imp3dAcc = state.accounts.find(a=>a.id==='imp3d');
      const accId = imp3dAcc ? imp3dAcc.id : (state.accounts[0] && state.accounts[0].id);
      const exp = {
        id: 'imp3d-loss-exp-' + Date.now().toString(),
        date: todayISO(),
        desc: `Retirada filamento ${f.color} (${reason||'perda'})`,
        amount: Number(cost || 0),
        type: 'saldo',
        accountId: accId,
        method: 'retirada filamento',
        category: 'filamento_perda'
      };
      applyExpenseEffects(exp);
      state.expenses.push(exp);

      saveState();
      updateAll();
      alert(`Retirada registrada: ${grams} g / ${money(cost)}.`);
    });
  });

  const total = sum(state.filaments, x=>x.weight||0);
  if(document.getElementById('imp3d-total-fil')) document.getElementById('imp3d-total-fil').textContent = `${total.toFixed(2)} g`;
}

/* Add filamento (agora grava initialWeight) */
function handleAddFilament(){
  const color = document.getElementById('fil-color').value.trim();
  const type = document.getElementById('fil-type').value.trim();
  const weight = Number(document.getElementById('fil-weight').value || 0);
  const price = Number(document.getElementById('fil-price').value || 0);
  if(!color || !type || !weight || weight <= 0){ alert('Preencha cor, tipo e peso (g) válidos.'); return; }
  const f = { id: Date.now().toString(), color, type, weight: Number(weight), initialWeight: Number(weight), price: Number(price||0) };
  state.filaments.push(f);
  saveState();
  document.getElementById('fil-color').value='';
  document.getElementById('fil-type').value='';
  document.getElementById('fil-weight').value='';
  document.getElementById('fil-price').value='';
  updateAll();
}

/* Render produtos list (mantido) */
function renderProducts(){
  const container = document.getElementById('prod-list');
  if(!container) return;
  container.innerHTML='';
  if(!state.products.length){
    const p = document.createElement('p'); p.className='muted'; p.textContent = 'Nenhum produto cadastrado.';
    container.appendChild(p);
    if(document.getElementById('imp3d-count-prod')) document.getElementById('imp3d-count-prod').textContent = '0';
    return;
  }
  state.products.forEach(prod=>{
    const card = document.createElement('div');
    card.className = 'box-card';
    card.style.display = 'flex';
    card.style.justifyContent = 'space-between';
    card.style.alignItems = 'center';
    card.innerHTML = `
      <div>
        <div style="font-weight:700">${prod.name}</div>
        <div style="font-size:0.85rem;color:var(--muted);">Horas: ${prod.hours} — Filamento por unidade: ${Number(prod.fil_g).toFixed(2)} g</div>
        <div style="font-size:0.85rem;color:var(--muted); margin-top:6px">${prod.desc||''}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700">${money(prod.price)}</div>
        <div style="margin-top:8px">
          <button class="btn small prod-sell" data-id="${prod.id}">Vender</button>
          <button class="btn small prod-del" data-id="${prod.id}">Excluir</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // events
  container.querySelectorAll('.prod-del').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.target.dataset.id;
      if(!confirm('Excluir produto?')) return;
      state.products = state.products.filter(p=>p.id !== id);
      saveState(); updateAll();
    });
  });

  container.querySelectorAll('.prod-sell').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.target.dataset.id;
      openSellFormForProduct(id, e.target);
    });
  });

  if(document.getElementById('imp3d-count-prod')) document.getElementById('imp3d-count-prod').textContent = String(state.products.length);
}

/* abre formulário de venda inline (mantido) */
function openSellFormForProduct(productId, anchorBtn){
  const existing = document.getElementById('imp3d-sell-form-'+productId);
  if(existing){ existing.remove(); return; }

  const prod = state.products.find(p=>p.id===productId);
  if(!prod) return;
  const form = document.createElement('div');
  form.id = 'imp3d-sell-form-'+productId;
  form.style.marginTop = '8px';
  form.style.padding = '10px';
  form.style.background = 'rgba(0,0,0,0.06)';
  form.style.borderRadius = '8px';
  form.style.border = '1px solid rgba(255,255,255,0.03)';
  form.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <div style="flex:1; min-width:160px">
        <label style="font-size:0.85rem;color:var(--muted)">Filamento</label>
        <select id="sell-fil-${productId}" style="width:100%;padding:8px;border-radius:8px;background:#020617;border:1px solid rgba(255,255,255,0.03)"></select>
      </div>
      <div style="width:110px">
        <label style="font-size:0.85rem;color:var(--muted)">Quantidade</label>
        <input id="sell-qty-${productId}" type="number" step="1" value="1" style="width:100%;padding:8px;border-radius:8px;background:#020617;border:1px solid rgba(255,255,255,0.03)"/>
      </div>
      <div style="flex:1; min-width:140px">
        <label style="font-size:0.85rem;color:var(--muted)">Conta (recebe valor) — será registrado na Shopee por padrão</label>
        <select id="sell-acc-${productId}" style="width:100%;padding:8px;border-radius:8px;background:#020617;border:1px solid rgba(255,255,255,0.03)"></select>
      </div>
      <div style="width:120px">
        <label style="font-size:0.85rem;color:var(--muted)">Preço (R$)</label>
        <input id="sell-price-${productId}" type="number" step="0.01" value="${prod.price}" style="width:100%;padding:8px;border-radius:8px;background:#020617;border:1px solid rgba(255,255,255,0.03)"/>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        <button id="sell-confirm-${productId}" class="btn-primary">Confirmar venda</button>
        <button id="sell-cancel-${productId}" class="btn ghost">Cancelar</button>
      </div>
    </div>
  `;
  const card = anchorBtn.closest('.box-card');
  card.parentNode.insertBefore(form, card.nextSibling);

  // popular selects
  const filSel = document.getElementById(`sell-fil-${productId}`);
  filSel.innerHTML = '';
  state.filaments.forEach(f=>{
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = `${f.color} — ${f.type} (${Number(f.weight).toFixed(2)} g) — ${money(f.price||0)}`;
    filSel.appendChild(opt);
  });
  if(!state.filaments.length){
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Nenhum filamento';
    filSel.appendChild(opt);
  }

  const accSel = document.getElementById(`sell-acc-${productId}`);
  accSel.innerHTML = '';
  state.accounts.forEach(a=>{
    const o = document.createElement('option');
    o.value = a.id; o.textContent = a.name; accSel.appendChild(o);
  });
  if(state.accounts.some(a=>a.id==='shopee')) accSel.value = 'shopee';

  // listeners
  document.getElementById(`sell-cancel-${productId}`).addEventListener('click', ()=>{
    form.remove();
  });

  document.getElementById(`sell-confirm-${productId}`).addEventListener('click', ()=>{
    const filId = document.getElementById(`sell-fil-${productId}`).value;
    const qty = Number(document.getElementById(`sell-qty-${productId}`).value || 0);
    const accId = document.getElementById(`sell-acc-${productId}`).value;
    const price = Number(document.getElementById(`sell-price-${productId}`).value || 0);
    if(!filId || qty <= 0 || !accId || price <= 0){ alert('Preencha filamento, quantidade, conta e preço corretos.'); return; }
    // efetuar venda
    sellProduct(productId, filId, accId, qty, price);
    form.remove();
  });
}

/* vendendo: determinístico, registra entradas/despesas nas contas corretas */
function sellProduct(productId, filamentId, accountId, qty, pricePerUnit){
  const prod = state.products.find(p=>p.id===productId);
  const fil = state.filaments.find(f=>f.id===filamentId);
  const userAccount = state.accounts.find(a=>a.id===accountId); // selecionada no formulário (não usada para destino)
  if(!prod || !fil || !userAccount) { alert('Produto/filamento/conta inválidos.'); return; }

  const totalFilNeeded = Number(prod.fil_g || 0) * Number(qty || 0);
  if(Number(fil.weight || 0) < totalFilNeeded){
    if(!confirm(`Filamento selecionado tem ${Number(fil.weight||0).toFixed(2)} g — precisa de ${totalFilNeeded.toFixed(2)} g. Continuar e permitir estoque negativo?`)) return;
  }

  // cálculo determinístico do custo por grama usando initialWeight (fixo)
  const initial = Number(fil.initialWeight || fil.weight || 0);
  const priceRolo = Number(fil.price || 0);
  const pricePerGram = (initial > 0) ? (priceRolo / initial) : 0;
  const materialCostUnit = Number(prod.fil_g || 0) * pricePerGram;
  const materialCostTotal = materialCostUnit * Number(qty || 0);

  // taxas Shopee (fixas definidas no topo)
  const feePerUnit = Number(SHOPEE_FEE_FIXED) + Number(SHOPEE_FEE_PCT) * Number(pricePerUnit || 0);
  const feeTotal = feePerUnit * Number(qty || 0);

  // montantes
  const amountGross = Number(pricePerUnit || 0) * Number(qty || 0);
  const netReceived = amountGross - feeTotal;
  const profit = netReceived - materialCostTotal; // sem energia/embalagem na sua versão (podemos acrescentar depois)

  // subtrai filamento do estoque (mantém f.weight como restante)
  fil.weight = Number(fil.weight || 0) - totalFilNeeded;

  // registra venda no impSales incluindo cálculos (para exibição)
  const sale = {
    id: Date.now().toString(),
    date: todayISO(),
    productId,
    filamentId,
    accountId: 'shopee', // por padrão, a entrada vai para Shopee (fluxo Shopee -> Nubank manual)
    qty,
    amountGross,
    feeTotal,
    netReceived,
    materialCost: materialCostTotal,
    profit
  };
  state.impSales.push(sale);

  // 1) cria uma entrada bruta na conta Shopee (entrada)
  const saleEntry = {
    id: 'imp3d-sale-' + Date.now().toString(),
    date: todayISO(),
    desc: `Venda ${prod.name} x${qty}`,
    amount: Number(amountGross),
    type: 'entrada',
    accountId: 'shopee',
    method: 'venda impressora3d',
    category: 'impressora3d'
  };
  applyExpenseEffects(saleEntry);
  state.expenses.push(saleEntry);

  // 2) registra a taxa da Shopee como despesa na conta Shopee (reduz o saldo dela)
  if(feeTotal > 0){
    const feeExp = {
      id: 'imp3d-shfee-' + Date.now().toString(),
      date: todayISO(),
      desc: `Taxa Shopee — ${prod.name} x${qty}`,
      amount: Number(feeTotal),
      type: 'saldo',
      accountId: 'shopee',
      method: 'taxa_shopee',
      category: 'taxa_plataforma'
    };
    applyExpenseEffects(feeExp);
    state.expenses.push(feeExp);
  }

  // 3) registra o custo do material como despesa na conta imp3d (reduz saldo imp3d)
  if(materialCostTotal > 0){
    const matExp = {
      id: 'imp3d-mat-' + Date.now().toString(),
      date: todayISO(),
      desc: `Custo material ${prod.name} x${qty} (${fil.color})`,
      amount: Number(materialCostTotal),
      type: 'saldo',
      accountId: 'imp3d',
      method: 'custo material',
      category: 'custo_material'
    };
    applyExpenseEffects(matExp);
    state.expenses.push(matExp);
  }

  saveState();
  updateAll();
  alert(`Venda registrada — bruto ${money(amountGross)}, taxa ${money(feeTotal)}, recebido ${money(netReceived)}, custo material ${money(materialCostTotal)}, lucro ${money(profit)}.`);
}

/* render vendas - agora mostra colunas com cálculo e soma total recebido / lucro */
function renderImpSales(){
  const tbody = document.getElementById('imp3d-sales-body');
  if(!tbody) return;
  tbody.innerHTML = '';
  const arr = [...state.impSales].sort((a,b)=> a.date < b.date ? 1 : -1);
  let totalReceived = 0;
  let totalProfit = 0;
  arr.forEach(s=>{
    const prod = state.products.find(p=>p.id===s.productId) || {name:s.productId};
    const fil = state.filaments.find(f=>f.id===s.filamentId) || {color:s.filamentId};
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.date}</td>
                    <td>${prod.name}</td>
                    <td>${fil.color||fil.id}</td>
                    <td>${s.qty}</td>
                    <td>${money(s.amountGross||0)}</td>
                    <td>${money(s.feeTotal||0)}</td>
                    <td>${money(s.netReceived||0)}</td>
                    <td>${money(s.materialCost||0)}</td>
                    <td>${money(s.profit||0)}</td>`;
    tbody.appendChild(tr);
    totalReceived += Number(s.netReceived || 0);
    totalProfit += Number(s.profit || 0);
  });

  // atualizar resumo Impressora3D (totais)
  const recEl = document.getElementById('imp3d-total-received');
  const profEl = document.getElementById('imp3d-total-profit');
  if(recEl) recEl.textContent = money(totalReceived);
  if(profEl) profEl.textContent = money(totalProfit);
}

/* render perdas (mantido) */
function renderImpLosses(){
  const tbody = document.getElementById('imp3d-losses-body');
  if(!tbody) return;
  tbody.innerHTML = '';
  const arr = [...state.impLosses].sort((a,b)=> a.date < b.date ? 1 : -1);
  arr.forEach(l=>{
    const fil = state.filaments.find(f=>f.id===l.filamentId) || {color:l.filamentId};
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${l.date}</td><td>${fil.color||fil.id}</td><td>${Number(l.grams).toFixed(2)}</td><td>${money(l.cost)}</td><td>${l.reason||''}</td>`;
    tbody.appendChild(tr);
  });
}

/* export/import especifico Impressora3D (mantido) */
function imp3dExport(){
  const data = {
    filaments: state.filaments,
    products: state.products,
    impSales: state.impSales,
    impLosses: state.impLosses
  };
  const blob = new Blob([JSON.stringify(data)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `impressora3d-backup-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/* limpeza impressora3d (mantido) */
function imp3dClearAll(){
  if(!confirm('Limpar todos os dados da Impressora3D (estoque, produtos, vendas, perdas)?')) return;
  state.filaments = [];
  state.products = [];
  state.impSales = [];
  state.impLosses = [];
  saveState(); updateAll();
}

/* adicionar produto (mantido) */
function handleAddProduct(){
  const name = document.getElementById('prod-name').value.trim();
  const hours = Number(document.getElementById('prod-hours').value || 0);
  const fil_g = Number(document.getElementById('prod-fil-g').value || 0);
  const price = Number(document.getElementById('prod-price').value || 0);
  const desc = document.getElementById('prod-desc').value.trim();

  if(!name || fil_g <= 0 || price <= 0){ alert('Nome, filamento por unidade (g) e preço são obrigatórios e devem ser válidos.'); return; }
  const p = { id: Date.now().toString(), name, hours, fil_g: Number(fil_g), price: Number(price), desc };
  state.products.push(p);
  saveState();
  document.getElementById('prod-name').value='';
  document.getElementById('prod-hours').value='';
  document.getElementById('prod-fil-g').value='';
  document.getElementById('prod-price').value='';
  document.getElementById('prod-desc').value='';
  updateAll();
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
  function renderMonthIndex(){
    monthIndexEl.textContent = state.meta.activeOffset;
    monthLabelEl.textContent = computeMonthFromOffset(state.meta.activeOffset);
  }
  document.getElementById('prev-month').addEventListener('click', ()=>{
    state.meta.activeOffset = Number(state.meta.activeOffset||0)-1;
    saveState(); renderMonthIndex(); updateAll();
  });
  document.getElementById('next-month').addEventListener('click', ()=>{
    state.meta.activeOffset = Number(state.meta.activeOffset||0)+1;
    saveState(); renderMonthIndex(); updateAll();
  });
  renderMonthIndex();

  populateAccountSelects();
  renderEditableAccounts();
  updateAll();

  const expDate = document.getElementById('exp-date');
  if(expDate) expDate.value = todayISO();
  const expForm = document.getElementById('expense-form');
  if(expForm) expForm.addEventListener('submit', handleExpenseSubmit);

  // Auto selecionar Caju quando tipo = "vr"
  const expTypeSel = document.getElementById('exp-type');
  const expAccountSel = document.getElementById('exp-account');
  if (expTypeSel && expAccountSel) {
    expTypeSel.addEventListener('change', () => {
      if (expTypeSel.value === 'vr') {
        const caju = state.accounts.find(a =>
          a.name.toLowerCase().includes('caju') ||
          a.name.toLowerCase().includes('vr')
        );
        if (caju) {
          expAccountSel.value = caju.id;
        }
      }
    });
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

  // botão de transferência Shopee -> Nubank
  const shToNbBtn = document.getElementById('sh-to-nb');
  if(shToNbBtn) shToNbBtn.addEventListener('click', ()=>{
    const v = Number(prompt('Valor para transferir Shopee → Nubank (R$):','0'));
    if(!v || v <= 0) return;
    transferShopeeToNubank(v);
  });
});

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
}

/* ---------- FIM DO ARQUIVO ---------- */
