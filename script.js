// controleExcel_v10
// - Gastos no crédito ainda separados por banco
// - Crédito total disponível agora é GLOBAL (state.totals.credito_total - total gasto no crédito no mês)
// - Quadro amarelo mostra "Crédito (soma disponível)" (global)
// - Tabela não mostra mais coluna "Crédito Disp." por banco
// - Gráfico "Crédito disponível — por conta" removido
// - Campos de credit_total por conta permanecem apenas como referência/registro

const STORAGE_KEY = "controleExcel_v10";

const DEFAULT = {
  accounts: [
    { id: "nubank", name: "Nubank", saldo: 0, guardado: 0, credit_total: 0 },
    { id: "sicoob", name: "Sicoob", saldo: 0, guardado: 0, credit_total: 0 },
    { id: "itau", name: "Itau", saldo: 0, guardado: 0, credit_total: 0 },
    { id: "caju", name: "Caju", saldo: 0, guardado: 0, credit_total: 0 }
  ],
  totals: { credito_total: 0, vr_total: 0, entrada: 0 },
  expenses: [],
  investments: [],
  startEntries: [],
  meta: { baseMonth: null, activeOffset: 0 }
};

let state = loadState();

// -------- load / save / migration --------
function loadState(){
  try {
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
      if(!s.meta) s.meta = DEFAULT.meta;
      if(!s.meta.baseMonth) s.meta.baseMonth = new Date().toISOString().slice(0,7);
      return s;
    }
  } catch(e){ console.error('load error', e); }
  const copy = JSON.parse(JSON.stringify(DEFAULT));
  copy.meta.baseMonth = new Date().toISOString().slice(0,7);
  return copy;
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

// -------- helpers --------
function money(v){ v = Number(v||0); return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
const sum = (arr, fn)=> arr.reduce((s,x)=> s + (Number(fn?fn(x):x)||0), 0);
function todayISO(){ return new Date().toISOString().slice(0,10); }
function computeMonthFromOffset(offset){
  const [y,m] = (state.meta.baseMonth || todayISO().slice(0,7)).split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function monthOf(d){ return (d||'').slice(0,7); }
function getActiveMonth(){ return computeMonthFromOffset(state.meta.activeOffset); }

// -------- grouping / derived --------
function monthlySumsByAccount(month){
  const map = {};
  state.accounts.forEach(a => map[a.id] = { gasto_credito:0, gasto_vr:0, gasto_saldo:0 });
  state.expenses.filter(e => monthOf(e.date) === month).forEach(e=>{
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

// -------- rendering & charts --------
let gastoChart=null, categoryChart=null, monthlyChart=null, entradaChart=null;

function renderAccountsTable(){
  const tbody = document.getElementById('accounts-body'); tbody.innerHTML='';
  const month = getActiveMonth();
  const sums = monthlySumsByAccount(month);
  state.accounts.forEach(a=>{
    const s = sums[a.id] || { gasto_credito:0, gasto_vr:0, gasto_saldo:0 };
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${a.name}</td>
      <td>${money(a.saldo)}</td>
      <td>${money(s.gasto_credito)}</td>
      <td>${money(s.gasto_vr)}</td>
      <td>${money(a.guardado||0)}</td>`;
    tbody.appendChild(tr);
  });
}

function renderYellow(){
  const d = calcDerived(getActiveMonth());
  document.getElementById('avail-credit').textContent = money(d.available_credit_total);
  document.getElementById('avail-vr').textContent = money(d.available_vr);
  document.getElementById('avail-saldo').textContent = money(d.saldo_display);
  document.getElementById('avail-guardado').textContent = money(d.guardado_total);
  document.getElementById('credit-debit-small').textContent = money(d.credito_debito);
}

function renderGastoCreditoChart(){
  const ctx = document.getElementById('gasto-credito-chart').getContext('2d');
  const month = getActiveMonth();
  const sums = monthlySumsByAccount(month);
  const labels = state.accounts.map(a=>a.name);
  const data = state.accounts.map(a => (sums[a.id] ? sums[a.id].gasto_credito : 0));
  if(gastoChart) gastoChart.destroy();
  gastoChart = new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'Gasto Crédito',data}]},options:{plugins:{legend:{display:false}}}});
}

function renderCategoryPie(){
  const ctx = document.getElementById('category-pie-chart').getContext('2d');
  const month = getActiveMonth();
  const map = {};
  state.expenses.filter(e => monthOf(e.date) === month).forEach(e=>{
    if(e.type === 'entrada') return;
    map[e.category] = (map[e.category]||0) + Number(e.amount||0);
  });
  const labels = Object.keys(map);
  const data = labels.map(k=>map[k]);
  if(categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx,{type:'pie',data:{labels,datasets:[{data}]},options:{plugins:{legend:{position:'bottom'}}}});
}

function monthlyTotalsLastN(n=6){
  const arr=[];
  for(let i=state.meta.activeOffset-(n-1); i<=state.meta.activeOffset; i++){
    const month = computeMonthFromOffset(i);
    const total = state.expenses.filter(e => monthOf(e.date) === month && e.type !== 'entrada').reduce((s,x)=>s+Number(x.amount||0),0);
    arr.push({month,total});
  }
  return arr;
}
function renderMonthlyLine(){
  const ctx = document.getElementById('monthly-line-chart').getContext('2d');
  const arr = monthlyTotalsLastN(6);
  const labels = arr.map(x=>x.month), data = arr.map(x=>x.total);
  if(monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Gasto total (6 meses)',data,fill:false}]},options:{plugins:{legend:{display:false}}}});
}

// Entradas pie (Input + opcional Entrada inicial)
function getEntradasDistribution(month, includeStart){
  const map = {};
  state.expenses.filter(e => monthOf(e.date) === month && e.type === 'entrada').forEach(e=>{
    map[e.accountId] = (map[e.accountId]||0) + Number(e.amount||0);
  });
  if(includeStart && state.startEntries){
    state.startEntries.filter(s => s.month === month).forEach(s=>{
      map[s.accountId] = (map[s.accountId]||0) + Number(s.amount||0);
    });
  }
  return map;
}
function renderEntradaPie(){
  const ctx = document.getElementById('entrada-pie-chart').getContext('2d');
  const month = getActiveMonth();
  const includeStart = document.getElementById('include-start-entrada').checked;
  const map = getEntradasDistribution(month, includeStart);
  const labels = Object.keys(map).map(id => (state.accounts.find(a=>a.id===id) || {name:id}).name);
  const data = Object.keys(map).map(k => map[k]);
  if(entradaChart) entradaChart.destroy();
  entradaChart = new Chart(ctx, { type: 'pie', data: { labels, datasets: [{ data }]}, options:{plugins:{legend:{position:'bottom'}}} });
}

// -------- selects & editable accounts --------
function populateAccountSelects(){
  const sel = document.getElementById('exp-account');
  const selLog = document.getElementById('log-account-filter');
  const selInvest = document.getElementById('invest-account');
  sel.innerHTML=''; selLog.innerHTML='<option value="all">Todas</option>'; selInvest.innerHTML='';
  state.accounts.forEach(a=>{
    const o=document.createElement('option'); o.value=a.id; o.textContent=a.name; sel.appendChild(o);
    const o2=document.createElement('option'); o2.value=a.id; o2.textContent=a.name; selLog.appendChild(o2);
    const o3=document.createElement('option'); o3.value=a.id; o3.textContent=a.name; selInvest.appendChild(o3);
  });

  const inicioCredits = document.getElementById('inicio-credits');
  if(inicioCredits){
    inicioCredits.innerHTML = '';
    state.accounts.forEach((a, idx) => {
      const card = document.createElement('div'); card.className = 'account-card';
      card.innerHTML = `<h4>${a.name}</h4>
        <div class="account-row"><label>Crédito (da conta)</label><input data-acc="${idx}" data-field="credit_total" type="number" step="0.01" value="${a.credit_total||0}" /></div>`;
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

  document.getElementById('inicio-vr-total').value = state.totals.vr_total || 0;
  document.getElementById('inicio-entrada-total').value = state.totals.entrada || 0;
  document.getElementById('inicio-credit-global').value = state.totals.credito_total || 0;
}

function renderEditableAccounts(){
  const c = document.getElementById('editable-accounts'); c.innerHTML='';
  state.accounts.forEach((acc, idx)=>{
    const card = document.createElement('div'); card.className='account-card';
    card.innerHTML = `<h4>${acc.name}</h4>
      <div class="account-row"><label>Saldo</label><input data-acc="${idx}" data-field="saldo" type="number" step="0.01" value="${acc.saldo}" /></div>
      <div class="account-row"><label>Guardado</label><input data-acc="${idx}" data-field="guardado" type="number" step="0.01" value="${acc.guardado||0}" /></div>
      <div class="account-row"><label>Crédito (desta conta)</label><input data-acc="${idx}" data-field="credit_total" type="number" step="0.01" value="${acc.credit_total||0}" /></div>`;
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

// -------- investimentos --------
function renderInvestimentos(){
  const list = document.getElementById('invest-list'); list.innerHTML='';
  state.accounts.forEach(a=>{
    const item=document.createElement('div'); item.className='invest-item';
    item.innerHTML=`<div>${a.name}</div><div>${money(a.guardado||0)}</div>`;
    list.appendChild(item);
  });
  document.getElementById('guardado-total').textContent = money(sum(state.accounts, x=>x.guardado||0));
  renderInvestLog();
}
function renderInvestLog(){
  const tbody = document.getElementById('invest-log-body'); tbody.innerHTML='';
  const arr = [...state.investments].sort((a,b)=> a.date < b.date ? 1 : -1);
  arr.forEach(i=>{
    const acc = state.accounts.find(a=>a.id === i.accountId);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i.date}</td><td>${acc?acc.name:i.accountId}</td><td>${i.action}</td><td>${money(i.amount)}</td><td>${i.desc||''}</td>`;
    tbody.appendChild(tr);
  });
}

// -------- logs --------
function renderLogTable(){
  const tbody = document.getElementById('log-body'); tbody.innerHTML='';
  const accountFilter = document.getElementById('log-account-filter').value;
  const onlyMonth = document.getElementById('log-show-only-month').checked;
  const month = getActiveMonth();
  let arr = state.expenses.slice();
  if(onlyMonth) arr = arr.filter(e => monthOf(e.date) === month);
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
      if(!confirm('Excluir esse gasto?')) return;
      const exp = state.expenses.find(x=>x.id===id);
      if(exp) applyExpenseReverse(exp);
      state.expenses = state.expenses.filter(x=>x.id!==id);
      saveState(); updateAll(); renderLogTable();
    });
  });
}

// -------- apply / reverse expense --------
function applyExpenseEffects(exp){
  if(exp.type === 'vr'){
    const caju = state.accounts.find(a=>a.name.toLowerCase().includes('caju'));
    if(caju) exp.accountId = caju.id;
  }
  const acc = state.accounts.find(a=>a.id===exp.accountId);
  if(!acc) return;
  if(exp.type === 'saldo'){ acc.saldo = Number(acc.saldo||0) - Number(exp.amount||0); }
  else if(exp.type === 'entrada'){
    acc.saldo = Number(acc.saldo||0) + Number(exp.amount||0);
    if(exp.category === 'investimento') acc.guardado = Number(acc.guardado||0) + Number(exp.amount||0);
  }
}
function applyExpenseReverse(exp){
  const acc = state.accounts.find(a=>a.id===exp.accountId);
  if(!acc) return;
  if(exp.type === 'saldo'){ acc.saldo = Number(acc.saldo||0) + Number(exp.amount||0); }
  else if(exp.type === 'entrada'){ acc.saldo = Number(acc.saldo||0) - Number(exp.amount||0);
    if(exp.category === 'investimento') acc.guardado = Number(acc.guardado||0) - Number(exp.amount||0);
  }
}

// -------- invest action --------
function handleInvestAction(){
  const accountId = document.getElementById('invest-account').value;
  const amount = Number(document.getElementById('invest-amount').value || 0);
  const action = document.getElementById('invest-action').value;
  const desc = document.getElementById('invest-desc').value.trim() || '';
  if(!amount || amount <= 0){ alert('Valor inválido'); return; }
  const acc = state.accounts.find(a=>a.id===accountId);
  if(!acc){ alert('Conta inválida'); return; }
  if(Number(acc.saldo||0) < amount){ if(!confirm('Saldo pode ficar negativo. Continuar?')) return; }
  acc.saldo = Number(acc.saldo||0) - amount;
  acc.guardado = Number(acc.guardado||0) + amount;
  const entry = { id: Date.now().toString(), date: todayISO(), accountId, action, amount, desc };
  state.investments.push(entry); saveState(); updateAll();
  document.getElementById('invest-amount').value = ''; document.getElementById('invest-desc').value = '';
  alert('Guardado registrado.');
}

// -------- expense submit --------
function handleExpenseSubmit(e){
  e.preventDefault();
  const date = document.getElementById('exp-date').value || todayISO();
  const desc = document.getElementById('exp-desc').value.trim() || '';
  const amount = Number(document.getElementById('exp-amount').value || 0);
  const type = document.getElementById('exp-type').value;
  let accountId = document.getElementById('exp-account').value;
  const method = document.getElementById('exp-method').value.trim() || '';
  const category = document.getElementById('exp-category').value || 'outros';
  if(!amount || amount <= 0){ alert('Valor inválido'); return; }

  // valida apenas contra crédito GLOBAL (não por banco)
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
  state.expenses.push(newExp);
  saveState();
  location.reload();
}

// -------- início do mês (VR, Entrada inicial, crédito global + startEntries) --------
function applyStartMonthConfig(){
  const vr = Number(document.getElementById('inicio-vr-total').value || 0);
  const entrada = Number(document.getElementById('inicio-entrada-total').value || 0);
  const globalCredit = Number(document.getElementById('inicio-credit-global').value || 0);

  state.totals.vr_total = vr;
  state.totals.entrada = entrada;
  state.totals.credito_total = globalCredit;

  const inicioCredits = document.getElementById('inicio-credits');
  if(inicioCredits){
    state.accounts.forEach((acc, idx) => {
      const inp = inicioCredits.querySelector(`input[data-acc="${idx}"]`);
      const val = inp ? Number(inp.value || 0) : Number(acc.credit_total || 0);
      acc.credit_total = val;
    });
  }

  const caju = state.accounts.find(a => a.name.toLowerCase().includes('caju') || a.name.toLowerCase().includes('vr'));
  if(caju){ caju.saldo = Number(vr || 0); }

  const month = getActiveMonth();
  const itau = state.accounts.find(a => a.name.toLowerCase().includes('itau'));
  if(itau){
    state.startEntries = (state.startEntries || []).filter(se => !(se.month === month && se.accountId === itau.id));
    if(entrada && entrada > 0){
      state.startEntries.push({ month, accountId: itau.id, amount: Number(entrada) });
      itau.saldo = Number(entrada);
    }
  }

  saveState();
  updateAll();
  alert('Dados do início do mês aplicados (VR -> Caju, Entrada inicial -> Itau, crédito global definido).');
}
function clearStartMonthFields(){
  document.getElementById('inicio-vr-total').value = '';
  document.getElementById('inicio-entrada-total').value = '';
  document.getElementById('inicio-credit-global').value = '';
  const inicioCredits = document.getElementById('inicio-credits');
  if(inicioCredits) inicioCredits.querySelectorAll('input').forEach(i=> i.value = '');
}

// -------- init --------
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
  function renderMonthIndex(){ monthIndexEl.textContent = state.meta.activeOffset; monthLabelEl.textContent = computeMonthFromOffset(state.meta.activeOffset); }
  document.getElementById('prev-month').addEventListener('click', ()=>{ state.meta.activeOffset = Number(state.meta.activeOffset||0)-1; saveState(); renderMonthIndex(); updateAll(); });
  document.getElementById('next-month').addEventListener('click', ()=>{ state.meta.activeOffset = Number(state.meta.activeOffset||0)+1; saveState(); renderMonthIndex(); updateAll(); });
  renderMonthIndex();

  populateAccountSelects();
  renderEditableAccounts();
  updateAll();

  document.getElementById('exp-date').value = todayISO();
  document.getElementById('expense-form').addEventListener('submit', handleExpenseSubmit);
  document.getElementById('invest-submit').addEventListener('click', handleInvestAction);
  document.getElementById('apply-start-month').addEventListener('click', applyStartMonthConfig);
  document.getElementById('clear-start-month').addEventListener('click', clearStartMonthFields);

  document.getElementById('log-account-filter').addEventListener('change', renderLogTable);
  document.getElementById('log-show-only-month').addEventListener('change', renderLogTable);

  const includeToggle = document.getElementById('include-start-entrada');
  if(includeToggle) includeToggle.addEventListener('change', ()=>{ renderEntradaPie(); });

  document.getElementById('save-btn').addEventListener('click', ()=>{ saveState(); alert('Salvo localmente no navegador.'); });
  document.getElementById('reset-btn').addEventListener('click', ()=>{
    if(!confirm('Tem certeza? Isso ZERARÁ Saldos, Guardado, Créditos, Entrada inicial e todos os logs.')) return;
    state = JSON.parse(JSON.stringify(DEFAULT));
    state.meta.baseMonth = (new Date()).toISOString().slice(0,7);
    state.meta.activeOffset = 0;
    saveState(); location.reload();
  });
});

// -------- updateAll --------
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
}
