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
  investBoxes: [],
  meta: { baseMonth: null, activeOffset: 0 }
};

let state = loadState();

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
      // ancora o índice no ciclo da fatura atual (24→23)
      s.meta.baseMonth = billingMonthOf(todayISO());
      return s;
    }
  }catch(e){console.error(e);}
  const copy = JSON.parse(JSON.stringify(DEFAULT));
  copy.meta.baseMonth = billingMonthOf(todayISO());
  return copy;
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

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
}

function renderYellow(){
  const d = calcDerived(getActiveMonth());
  document.getElementById('avail-credit').textContent = money(d.available_credit_total);
  document.getElementById('avail-vr').textContent = money(d.available_vr);
  document.getElementById('avail-saldo').textContent = money(d.saldo_display);
  document.getElementById('avail-guardado').textContent = money(d.guardado_total);
  document.getElementById('credit-debit-small').textContent = money(d.credito_debito);
}

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

/* investimentos: resumo + log + caixinhas */
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

/* caixinhas */
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

/* log */
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

/* criar caixinha */
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

/* submit gasto/entrada — sem reload, atualiza tudo na hora e vai pro dashboard */
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

function applyStartMonthConfig(){
  // lê valores da UI
  const vr = Number(document.getElementById('inicio-vr-total').value || 0);
  const newGlobalCredit = Number(document.getElementById('inicio-credit-global').value || 0);

  const currentMonth = getActiveMonth();
  const prevMonth = computeMonthFromOffset(state.meta.activeOffset - 1);

  /* 1) fechar o ciclo do cartão: calcular gasto de crédito do mês anterior */
  const prevCreditTotal = Number(state.totals.credito_total || 0);
  let creditUsedPrevMonth = 0;
  state.expenses
    .filter(e => billingMonthOf(e.date) === prevMonth && e.type === 'credito')
    .forEach(e => creditUsedPrevMonth += Number(e.amount || 0));

  const creditBalance = prevCreditTotal - creditUsedPrevMonth;

  /* 2) aplicar sobra/falta no Nubank */
  const nubank = state.accounts.find(a => a.name.toLowerCase().includes('nubank'));
  if(nubank && creditBalance !== 0){
    nubank.saldo = Number(nubank.saldo || 0) + creditBalance;
  }

  /* 3) substituir crédito global pelo novo valor informado */
  state.totals.credito_total = newGlobalCredit;

  /* 4) atualizar VR -> Caju (sobrescreve saldo do Caju) */
  state.totals.vr_total = vr;
  const caju = state.accounts.find(a => a.name.toLowerCase().includes('caju') || a.name.toLowerCase().includes('vr'));
  if(caju){
    caju.saldo = Number(vr || 0);
  }

  /* 5) atualizar créditos por conta (inputs dentro do inicio-credits) */
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

  alert(
    `Virada do cartão aplicada.\n` +
    `Fechamento do ciclo anterior: ${money(creditBalance)} (aplicado no Nubank).`
  );
}

function applyStartSalary(){
  const entrada = Number(document.getElementById('inicio-entrada-total').value || 0);
  if(!entrada || entrada <= 0){
    alert('Informe um valor de entrada válido.');
    return;
  }

  const month = getActiveMonth();
  const itau = state.accounts.find(a => a.name.toLowerCase().includes('itau'));
  if(!itau){
    alert('Conta Itaú não encontrada nas contas.');
    return;
  }

  // gravar em startEntries (mantém compatibilidade com gráficos)
  state.startEntries = (state.startEntries || []).filter(se => !(se.month === month && se.accountId === itau.id));
  state.startEntries.push({ month, accountId: itau.id, amount: Number(entrada) });

  // somar ao saldo do Itau (soma, não sobrescreve)
  itau.saldo = Number(itau.saldo || 0) + Number(entrada);

  // salvar e atualizar
  state.totals.entrada = entrada;
  saveState();
  updateAll();

  alert(`Entrada de ${money(entrada)} aplicada ao ${itau.name}.`);
}

/* backup: exportar/importar JSON */
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

/* init */
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

  const applyBtn = document.getElementById('apply-start-month');
  const applySalaryBtn = document.getElementById('apply-start-salary'); // novo
  const clearBtn = document.getElementById('clear-start-month');
  if(applyBtn) applyBtn.addEventListener('click', applyStartMonthConfig);
  if(applySalaryBtn) applySalaryBtn.addEventListener('click', applyStartSalary); // liga o botão novo
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
}
