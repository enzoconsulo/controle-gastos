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
    { id: "mercado_pago", name: "Mercado Pago", saldo: 0, guardado: 0, credit_total: 0 },
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
  impExternalSales: [],
  impStock: [], // {id,date,productId,filamentId,qty,materialCost,hourlyCost,packagingCost}
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
      if(Array.isArray(s.products)){
        s.products.forEach(p => {
          if(p && p.energy_h === undefined) p.energy_h = 0;
          if(p && p.pack === undefined) p.pack = 0;
          ensureProductVariants(p);
        });
      }
      if(!s.impSales) s.impSales = [];
      if(!s.impLosses) s.impLosses = [];
      if(!s.impExternalSales) s.impExternalSales = [];
      if(!s.impStock) s.impStock = [];
      if(Array.isArray(s.impStock)){
        s.impStock.forEach(stock=>{
          if(!stock.snapshot){
            const prod = (s.products || []).find(p=>p.id===stock.productId);
            const fil = (s.filaments || []).find(f=>f.id===stock.filamentId);
            if(prod && fil){
              const qty = Number(stock.qty || 1) || 1;
              const initial = Number(fil.initialWeight || fil.weight || 0);
              const pricePerGram = initial > 0 ? Number(fil.price || 0) / initial : 0;
      
              const unitMaterialCost = stock.materialCost !== undefined
                ? Number(stock.materialCost || 0) / qty
                : Number(prod.fil_g || 0) * pricePerGram;
      
              const unitHourlyCost = stock.hourlyCost !== undefined
                ? Number(stock.hourlyCost || 0) / qty
                : Number(prod.hours || 0) * Number(prod.energy_h || 0);
      
              const unitPackagingCost = stock.packagingCost !== undefined
                ? Number(stock.packagingCost || 0) / qty
                : Number(prod.pack || 0);
      
              stock.snapshot = {
                salePricePerUnit: Number(prod.price || 0),
                unitMaterialCost,
                unitHourlyCost,
                unitPackagingCost
              };
            }
          }
        });
      }
      // garantir contas imp3d / shopee em states antigos
      const hasImp3d = (s.accounts || []).some(a=>a.id === 'imp3d');
      const hasShopee = (s.accounts || []).some(a=>a.id === 'shopee');
      const hasMercadoPago = (s.accounts || []).some(a => a.id === 'mercado_pago');
      if(!hasImp3d) s.accounts.push({ id: "imp3d", name: "imp3d", saldo: 0, guardado: 0, credit_total: 0 });
      if(!hasShopee) s.accounts.push({ id: "shopee", name: "Shopee", saldo: 0, guardado: 0, credit_total: 0 });
      if(!hasMercadoPago) s.accounts.push({ id: "mercado_pago", name: "Mercado Pago", saldo: 0, guardado: 0, credit_total: 0 });

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
  const shopeeAcc = state.accounts.find(a=>a.id==='shopee');
  const shopeeBalanceEl = document.getElementById('shopee-acc-balance');
  if(shopeeBalanceEl) shopeeBalanceEl.textContent = shopeeAcc ? money(shopeeAcc.saldo) : '—';
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
  const selTransfer = document.getElementById('exp-transfer-account');
  const selLog = document.getElementById('log-account-filter');
  const selInvest = document.getElementById('invest-account');
  const boxSel = document.getElementById('box-account');

  if(sel) sel.innerHTML='';
  if(selTransfer) selTransfer.innerHTML='';
  if(selLog) selLog.innerHTML='<option value="all">Todas</option>';
  if(selInvest) selInvest.innerHTML='';
  if(boxSel) boxSel.innerHTML='';

  state.accounts.forEach(a=>{
    if(sel){
      const o=document.createElement('option');
      o.value=a.id;
      o.textContent=a.name;
      sel.appendChild(o);
    }

    if(selTransfer){
      const oT=document.createElement('option');
      oT.value=a.id;
      oT.textContent=a.name;
      selTransfer.appendChild(oT);
    }

    if(selLog){
      const o2=document.createElement('option');
      o2.value=a.id;
      o2.textContent=a.name;
      selLog.appendChild(o2);
    }

    if(selInvest){
      const o3=document.createElement('option');
      o3.value=a.id;
      o3.textContent=a.name;
      selInvest.appendChild(o3);
    }

    if(boxSel){
      const o4=document.createElement('option');
      o4.value=a.id;
      o4.textContent=a.name;
      boxSel.appendChild(o4);
    }
  });

  const inicioCredits = document.getElementById('inicio-credits');
  if(inicioCredits){
    inicioCredits.innerHTML = '';
    state.accounts.forEach((a, idx) => {
      const card = document.createElement('div');
      card.className = 'account-card';
      card.innerHTML = `<h4>${a.name}</h4>
        <div class="account-row"><label>Crédito</label><input data-acc="${idx}" data-field="credit_total" type="number" step="0.01" value="${a.credit_total||0}" /></div>`;
      inicioCredits.appendChild(card);
    });

    inicioCredits.querySelectorAll('input').forEach(inp=>{
      inp.addEventListener('input', e=>{
        const idx = Number(e.target.dataset.acc);
        const field = e.target.dataset.field;
        state.accounts[idx][field] = Number(e.target.value || 0);
        saveState();
        updateAll();
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
    const destAcc = state.accounts.find(a=>a.id===exp.transferToAccountId);
    
    let contaTexto = acc ? acc.name : exp.accountId;
    if(exp.type === 'transferencia' && destAcc){
      contaTexto = `${contaTexto} → ${destAcc.name}`;
    }
    
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${exp.date}</td><td>${exp.desc||''}</td><td>${contaTexto}</td><td>${exp.type}</td><td>${exp.category||''}</td><td>${money(exp.amount)}</td><td>${exp.method||''}</td><td><button data-id="${exp.id}" class="btn small del">Excluir</button></td>`;
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

  if(exp.type === 'transferencia'){
    const fromAcc = state.accounts.find(a => a.id === exp.accountId);
    const toAcc = state.accounts.find(a => a.id === exp.transferToAccountId);

    if(!fromAcc || !toAcc) return;

    fromAcc.saldo = Number(fromAcc.saldo || 0) - Number(exp.amount || 0);
    toAcc.saldo = Number(toAcc.saldo || 0) + Number(exp.amount || 0);
    return;
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
  if(exp.type === 'transferencia'){
    const fromAcc = state.accounts.find(a => a.id === exp.accountId);
    const toAcc = state.accounts.find(a => a.id === exp.transferToAccountId);

    if(!fromAcc || !toAcc) return;

    fromAcc.saldo = Number(fromAcc.saldo || 0) + Number(exp.amount || 0);
    toAcc.saldo = Number(toAcc.saldo || 0) - Number(exp.amount || 0);
    return;
  }

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
  const transferToAccountId = document.getElementById('exp-transfer-account')?.value || '';
  const method = document.getElementById('exp-method').value.trim() || '';
  const category = document.getElementById('exp-category').value || 'outros';

  if(!amount || amount <= 0){
    alert('Valor inválido');
    return;
  }

  if(type === 'credito'){
    const month = getActiveMonth();
    const sums = monthlySumsByAccount(month);
    const total_used = sum(Object.values(sums), x => x.gasto_credito);
    const avail = Number(state.totals.credito_total || 0) - total_used;

    if(avail < amount){
      if(!confirm(`Crédito disponível global é ${money(avail)}. Deseja registrar mesmo assim?`)) return;
    }
  }

  if(type === 'transferencia'){
    if(!transferToAccountId){
      alert('Selecione a conta destino.');
      return;
    }

    if(accountId === transferToAccountId){
      alert('A conta de origem e destino não podem ser a mesma.');
      return;
    }

    const fromAcc = state.accounts.find(a => a.id === accountId);
    if(fromAcc && Number(fromAcc.saldo || 0) < amount){
      if(!confirm(`A conta origem possui saldo de ${money(fromAcc.saldo)} e pode ficar negativa. Deseja continuar?`)) return;
    }
  }

  const newExp = {
    id: Date.now().toString(),
    date,
    desc,
    amount,
    type,
    accountId,
    transferToAccountId: type === 'transferencia' ? transferToAccountId : '',
    method,
    category
  };

  applyExpenseEffects(newExp);

  if(!Array.isArray(state.expenses)) state.expenses = [];
  state.expenses.push(newExp);

  saveState();
  updateAll();

  document.getElementById('exp-amount').value = '';
  document.getElementById('exp-desc').value = '';
  document.getElementById('exp-method').value = '';
  const transferSel = document.getElementById('exp-transfer-account');
  if(transferSel) transferSel.value = '';

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
    // FIX: Subtrai o valor anterior antes de somar o novo para evitar saldo duplicado
    const existingEntry = (state.startEntries || []).find(se => se.month === currentMonth && se.accountId === itau.id);
    if(existingEntry) {
        itau.saldo = Number(itau.saldo || 0) - existingEntry.amount;
    }

    state.startEntries = (state.startEntries || []).filter(se => !(se.month === currentMonth && se.accountId === itau.id));
    state.startEntries.push({ month: currentMonth, accountId: itau.id, amount: entrada });
    itau.saldo = Number(itau.saldo || 0) + entrada; // SOMA de forma segura agora
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

function getFilamentPricePerGram(f){
  const initial = Number(f.initialWeight || f.weight || 0);
  const price = Number(f.price || 0);
  return initial > 0 ? (price / initial) : 0;
}

function populateImp3dStockSelects(){
  const stockProd = document.getElementById('stock-prod');
  const stockVariant = document.getElementById('stock-variant');
  const stockFil = document.getElementById('stock-fil');

  if(stockProd){
    const current = stockProd.value;
    stockProd.innerHTML = '';
    if(!state.products.length){
      const o = document.createElement('option');
      o.value = '';
      o.textContent = 'Nenhum produto';
      stockProd.appendChild(o);
    } else {
      state.products.forEach(prod=>{
        const o = document.createElement('option');
        o.value = prod.id;
        o.textContent = `${prod.name} — ${money(prod.price)}`;
        stockProd.appendChild(o);
      });
      if(current) stockProd.value = current;
    }
  }

  if(stockVariant){
    const prod = state.products.find(p => p.id === (stockProd?.value || ''));
    const currentVariant = stockVariant.value;
    stockVariant.innerHTML = '';

    if(!prod){
      const o = document.createElement('option');
      o.value = '';
      o.textContent = 'Selecione um produto';
      stockVariant.appendChild(o);
    } else {
      ensureProductVariants(prod);

      prod.variants.forEach(v=>{
        const o = document.createElement('option');
        o.value = v.id;
        o.textContent = `${v.label} — ${money(v.price)}`;
        stockVariant.appendChild(o);
      });

      if(currentVariant && prod.variants.some(v => v.id === currentVariant)){
        stockVariant.value = currentVariant;
      } else {
        stockVariant.value = prod.variants[0]?.id || 'default';
      }
    }
  }

  if(stockFil){
    const current = stockFil.value;
    stockFil.innerHTML = '';
    if(!state.filaments.length){
      const o = document.createElement('option');
      o.value = '';
      o.textContent = 'Nenhum filamento';
      stockFil.appendChild(o);
    } else {
      state.filaments.forEach(f=>{
        const o = document.createElement('option');
        o.value = f.id;
        o.textContent = `${f.color} — ${f.type} (${Number(f.weight || 0).toFixed(2)} g)`;
        stockFil.appendChild(o);
      });
      if(current) stockFil.value = current;
    }
  }

  const sellStockItem = document.getElementById('sell-stock-item');
  if(sellStockItem){
    const current = sellStockItem.value;
    sellStockItem.innerHTML = '';
    const items = state.impStock || [];

    if(!items.length){
      const o = document.createElement('option');
      o.value = '';
      o.textContent = 'Nenhum item em estoque';
      sellStockItem.appendChild(o);
    } else {
      items.forEach(stock=>{
        const prod = state.products.find(p=>p.id===stock.productId) || { name: stock.productId };
        const o = document.createElement('option');
        o.value = stock.id;
        o.textContent = `${prod.name} — lote ${stock.id} — ${stock.qty} un`;
        sellStockItem.appendChild(o);
      });
      if(current) sellStockItem.value = current;
    }
  }
}

/* Render lista de filamentos */
function renderFilaments(){
  const container = document.getElementById('filaments-list');
  const total = sum(state.filaments, x=>x.weight||0);
  const totalEl = document.getElementById('imp3d-total-fil');
  if(totalEl) totalEl.textContent = `${total.toFixed(2)} g`;
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


    container.querySelectorAll('.fil-withdraw').forEach(b => {
    b.addEventListener('click', e => {
      const id = e.target.dataset.id;
      // Em vez dos prompts, agora chamamos a nova função do formulário:
      openWithdrawFormForFilament(id, e.target);
    });
  });
  
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

/* Helper Novo: Fecha todos os painéis de produto para manter apenas 1 aberto */
function closeAllProductPanels() {
  // Fecha todas as caixas de edição (oculta)
  document.querySelectorAll('.prod-edit-box').forEach(box => box.style.display = 'none');
  // Remove todos os painéis de cálculo de lucro
  document.querySelectorAll('[id^="imp3d-profit-preview-"]').forEach(box => box.remove());
  // Remove todos os painéis de venda rápida
  document.querySelectorAll('[id^="imp3d-sell-form-"]').forEach(box => box.remove());
}

function renderProducts(){
  // Atualiza as opções dinâmicas do menu de caixas sempre que renderizar
  updateCategoryDatalist();

  const container = document.getElementById('prod-list');
  const countEl = document.getElementById('imp3d-count-prod');
  if(!container) return;
  
  container.innerHTML='';

  // 1. Pesquisa
  const searchInput = document.getElementById('prod-search');
  const searchTerm = (searchInput ? searchInput.value : '').toLowerCase().trim();

  let filtered = state.products;
  if (searchTerm) {
    filtered = state.products.filter(p => {
      const matchName = p.name.toLowerCase().includes(searchTerm);
      const matchCat = (p.category || 'Geral').toLowerCase().includes(searchTerm);
      return matchName || matchCat;
    });
  }

  if(countEl) countEl.textContent = String(filtered.length);

  if(!filtered.length){
    const p = document.createElement('p');
    p.className='muted';
    p.textContent = searchTerm ? 'Nenhum produto encontrado na pesquisa.' : 'Nenhum produto cadastrado.';
    container.appendChild(p);
    return;
  }

  // 2. Agrupa pelas Caixas
  const grouped = {};
  filtered.forEach(prod => {
    const cat = prod.category || 'Geral';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(prod);
  });

  // 3. Renderiza Caixas Retráteis
  Object.keys(grouped).sort().forEach(cat => {
    const catWrapper = document.createElement('div');
    catWrapper.style.marginBottom = '20px';
    catWrapper.style.background = 'rgba(255,255,255,0.02)';
    catWrapper.style.border = '1px solid rgba(148,163,184,0.12)';
    catWrapper.style.borderRadius = '24px';
    catWrapper.style.padding = '16px';
    
    // Cabeçalho Clicável (Retrátil)
    catWrapper.innerHTML = `
      <div class="box-header-toggle" style="display:flex; align-items:center; justify-content:space-between; cursor:pointer; margin-bottom: 16px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.25); border-radius: 12px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">📦</div>
          <div>
            <h4 style="font-weight: 700; font-size: 1.1rem; color: #fff; line-height: 1.2;">${cat}</h4>
            <span style="font-size: 0.8rem; color: var(--muted);">${grouped[cat].length} produto(s) nesta caixa</span>
          </div>
        </div>
        <div class="toggle-icon" style="font-size: 1.2rem; color: var(--muted);">▼</div>
      </div>
      <div class="cat-list" style="display:flex; flex-direction:column; gap:10px;"></div>
    `;

    const headerToggle = catWrapper.querySelector('.box-header-toggle');
    const catList = catWrapper.querySelector('.cat-list');
    const toggleIcon = catWrapper.querySelector('.toggle-icon');

    // Lógica para esconder/mostrar os itens da caixa ao clicar no título
    headerToggle.addEventListener('click', () => {
      if(catList.style.display === 'none'){
        catList.style.display = 'flex';
        toggleIcon.textContent = '▼';
      } else {
        catList.style.display = 'none';
        toggleIcon.textContent = '▶';
      }
    });

    grouped[cat].forEach(prod => {
      ensureProductVariants(prod);
      const variantSummary = prod.variants.map(v => `${v.label}: ${money(v.price)}`).join(' • ');

      const card = document.createElement('div');
      card.className = 'box-card';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '10px';

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
          <div style="min-width:0;">
            <div style="font-weight:700">${prod.name}</div>
            <div style="font-size:0.85rem;color:var(--muted); line-height:1.35; margin-top:4px;">
              Horas: ${Number(prod.hours || 0).toFixed(2)}
              — Filamento por unidade: ${Number(prod.fil_g || 0).toFixed(2)} g
              — Custo/h: ${money(prod.energy_h || 0)}
              — Embalagem: ${money(prod.pack || 0)}
            </div>
            <div style="font-size:0.85rem;color:var(--muted); margin-top:6px">${prod.desc || ''}</div>
            <div style="font-size:0.78rem;color:var(--muted-soft); margin-top:6px">${variantSummary}</div>
          </div>

          <div style="text-align:right; flex:none;">
            <div style="font-weight:700">${money(prod.price)}</div>
            <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
              <button class="btn small prod-edit-toggle" data-id="${prod.id}">Editar</button>
              <button class="btn small prod-preview" data-id="${prod.id}">Exibir lucro</button>
              <button class="btn small prod-sell" data-id="${prod.id}">Vender</button>
              <button class="btn small prod-stock" data-id="${prod.id}">Estocar</button>
              <button class="btn small prod-del" data-id="${prod.id}">Excluir</button>
            </div>
          </div>
        </div>

        <div class="prod-edit-box" id="edit-${prod.id}" style="display:none; margin-top:10px;">
          <div class="form-grid">
            
            <div class="form-field" style="grid-column:1/-1">
              <label>Mover para Caixa / Categoria</label>
              <input class="edit-category" list="box-options" data-id="${prod.id}" value="${prod.category || 'Geral'}" placeholder="Deixe em branco ou digite Geral para remover da caixa">
            </div>
            
            <div class="form-field">
              <label>Nome do Produto</label>
              <input class="edit-name" data-id="${prod.id}" value="${prod.name}">
            </div>

            <div class="form-field">
              <label>Horas</label>
              <input type="number" step="0.1" class="edit-hours" data-id="${prod.id}" value="${prod.hours}">
            </div>

            <div class="form-field">
              <label>Filamento (g)</label>
              <input type="number" step="0.01" class="edit-fil" data-id="${prod.id}" value="${prod.fil_g}">
            </div>

            <div class="form-field">
              <label>Energia (R$/h)</label>
              <input type="number" step="0.01" class="edit-energy" data-id="${prod.id}" value="${prod.energy_h}">
            </div>

            <div class="form-field">
              <label>Embalagem</label>
              <input type="number" step="0.01" class="edit-pack" data-id="${prod.id}" value="${prod.pack}">
            </div>

            <div class="form-field">
              <label>Preço base</label>
              <input type="number" step="0.01" class="edit-price" data-id="${prod.id}" value="${prod.price}">
            </div>

            <div class="form-field" style="grid-column:1/-1">
              <label>Descrição</label>
              <input class="edit-desc" data-id="${prod.id}" value="${prod.desc || ''}">
            </div>

            <div class="prod-variants-panel" style="grid-column:1/-1; padding:16px; border-radius:24px; border:1px solid rgba(148,163,184,0.15); background:rgba(255,255,255,0.02); margin-top: 8px;">
              <div style="font-weight:700; margin-bottom:14px; font-size:1.05rem; color:var(--text);">Variações Cadastradas</div>

              <div class="variant-list" id="variant-list-${prod.id}" style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
                ${prod.variants.map(v => `
                  <div class="variant-row" data-variant-id="${v.id}" style="display:grid; grid-template-columns:1fr 1fr auto; gap:12px; align-items:center; padding:12px; border-radius:18px; background:rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05);">
                    <div class="form-field" style="margin:0; gap:4px;">
                      <label>Nome da variação</label>
                      <input class="variant-label" data-product="${prod.id}" data-variant="${v.id}" type="text" value="${v.label}"/>
                    </div>
                    <div class="form-field" style="margin:0; gap:4px;">
                      <label>Preço (R$)</label>
                      <input class="variant-price" data-product="${prod.id}" data-variant="${v.id}" type="number" step="0.01" value="${v.price}"/>
                    </div>
                    <div style="display:flex; align-items:flex-end; gap:6px; height:100%; padding-bottom:2px;">
                      ${
                        v.id === 'default'
                          ? '<div style="display:flex; align-items:center; justify-content:center; height: 46px; padding: 0 16px; border-radius: 16px; background: rgba(255,255,255,0.05); color:var(--muted); font-size:0.85rem;">Padrão</div>'
                          : `<button class="btn small prod-variant-del" data-product="${prod.id}" data-variant="${v.id}" type="button" style="height: 46px; border-radius: 16px; background: rgba(239,68,68,0.1); color: var(--danger); border: 1px solid rgba(239,68,68,0.2);">Remover</button>`
                      }
                    </div>
                  </div>
                `).join('')}
              </div>

              <div style="padding: 16px; border-radius: 20px; border: 1px dashed rgba(148,163,184,0.3); background: rgba(0,0,0,0.15);">
                <div style="font-weight:600; font-size:0.9rem; color: var(--muted); margin-bottom: 12px;">➕ Adicionar Nova Variação</div>
                <div class="form-grid" style="grid-template-columns: 1fr 1fr auto; align-items: end; gap: 12px;">
                  <div class="form-field" style="margin:0; gap:4px;">
                    <label>Nome (Ex: Rosa)</label>
                    <input type="text" class="variant-new-label" data-id="${prod.id}" placeholder="Ex: Rosa">
                  </div>
                  <div class="form-field" style="margin:0; gap:4px;">
                    <label>Preço (R$)</label>
                    <input type="number" step="0.01" class="variant-new-price" data-id="${prod.id}" placeholder="Ex: 15.00">
                  </div>
                  <div class="form-actions" style="margin:0;">
                    <button class="btn-primary small prod-variant-add" data-id="${prod.id}" type="button" style="height: 46px; border-radius: 16px;">Adicionar</button>
                  </div>
                </div>
              </div>
            </div>

            <div style="grid-column:1/-1; display:flex; gap:8px; flex-wrap:wrap; margin-top: 10px;">
              <button class="btn small btn-primary prod-save" data-id="${prod.id}">Salvar Alterações</button>
              <button class="btn small prod-cancel" data-id="${prod.id}">Cancelar</button>
            </div>
          </div>
        </div>
      `;

      catList.appendChild(card);
    });

    container.appendChild(catWrapper);
  });

  // Eventos dos botões gerados
  container.querySelectorAll('.prod-del').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.target.dataset.id;
      if(!confirm('Excluir produto?')) return;
      state.products = state.products.filter(p=>p.id !== id);
      saveState();
      updateAll();
    });
  });

  container.querySelectorAll('.prod-edit-toggle').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.target.dataset.id;
      const box = document.getElementById(`edit-${id}`);
      const isCurrentlyOpen = box && box.style.display === 'block';

      if(typeof closeAllProductPanels === 'function') closeAllProductPanels();

      if(box && !isCurrentlyOpen){
        box.style.display = 'block'; 
      }
    });
  });

  container.querySelectorAll('.prod-cancel').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.target.dataset.id;
      const box = document.getElementById(`edit-${id}`);
      if(box) box.style.display = 'none';
    });
  });

  container.querySelectorAll('.prod-save').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.target.dataset.id;
      const prod = state.products.find(p=>p.id === id);
      if(!prod) return;

      const catEl = document.querySelector(`.edit-category[data-id="${id}"]`);
      const nameEl = document.querySelector(`.edit-name[data-id="${id}"]`);
      const hoursEl = document.querySelector(`.edit-hours[data-id="${id}"]`);
      const filEl = document.querySelector(`.edit-fil[data-id="${id}"]`);
      const energyEl = document.querySelector(`.edit-energy[data-id="${id}"]`);
      const packEl = document.querySelector(`.edit-pack[data-id="${id}"]`);
      const priceEl = document.querySelector(`.edit-price[data-id="${id}"]`);
      const descEl = document.querySelector(`.edit-desc[data-id="${id}"]`);

      // Se apagarem o texto ou escreverem Geral, ele vai pra Geral
      const category = (catEl?.value || '').trim() || 'Geral';
      const name = (nameEl?.value || '').trim();
      const hours = Number(hoursEl?.value || 0);
      const fil_g = Number(filEl?.value || 0);
      const energy_h = Number(energyEl?.value || 0);
      const pack = Number(packEl?.value || 0);
      const price = Number(priceEl?.value || 0);
      const desc = (descEl?.value || '').trim();

      if(!name){
        alert('Nome inválido.');
        return;
      }
      if(fil_g <= 0 || price <= 0){
        alert('Filamento por unidade e preço precisam ser maiores que zero.');
        return;
      }

      prod.category = category; // Atualiza a caixa
      prod.name = name;
      prod.hours = hours;
      prod.fil_g = fil_g;
      prod.energy_h = energy_h;
      prod.pack = pack;
      prod.price = price;
      prod.desc = desc;

      ensureProductVariants(prod);
      const base = prod.variants.find(v => v.id === 'default');
      if(base) base.price = price;
      if(base && (!base.label || base.label.trim() === '')){
        base.label = 'Padrão';
      }

      const variantRows = document.querySelectorAll(`#edit-${id} .variant-row`);
      const variants = [];
      variantRows.forEach(row=>{
        const vid = row.dataset.variantId;
        const labelEl = row.querySelector('.variant-label');
        const priceElRow = row.querySelector('.variant-price');

        const label = (labelEl?.value || '').trim();
        const vPrice = Number(priceElRow?.value || 0);

        if(!label || vPrice <= 0) return;

        variants.push({
          id: vid || `var-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          label,
          price: vPrice
        });
      });

      if(!variants.some(v => v.id === 'default')){
        variants.unshift({
          id: 'default',
          label: base?.label || 'Padrão',
          price: Number(base?.price ?? price)
        });
      } else {
        const def = variants.find(v => v.id === 'default');
        if(def && !def.label) def.label = base?.label || 'Padrão';
      }

      prod.variants = variants;

      saveState();
      updateAll();
    });
  });

  container.querySelectorAll('.prod-variant-add').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.target.dataset.id;
      const prod = state.products.find(p=>p.id === id);
      if(!prod) return;
      ensureProductVariants(prod);

      const labelEl = document.querySelector(`.variant-new-label[data-id="${id}"]`);
      const priceEl = document.querySelector(`.variant-new-price[data-id="${id}"]`);
      const label = (labelEl?.value || '').trim();
      const price = Number(priceEl?.value || 0);

      if(!label || price <= 0){
        alert('Dados da variação inválidos.');
        return;
      }

      prod.variants.push({
        id: `var-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        label,
        price
      });

      saveState();
      updateAll();
    });
  });

  container.querySelectorAll('.prod-variant-del').forEach(b=>{
    b.addEventListener('click', e=>{
      const productId = e.target.dataset.product;
      const variantId = e.target.dataset.variant;
      const prod = state.products.find(p=>p.id === productId);
      if(!prod) return;

      ensureProductVariants(prod);
      if(variantId === 'default'){
        alert('A variação padrão não pode ser removida.');
        return;
      }

      prod.variants = prod.variants.filter(v => v.id !== variantId);
      saveState();
      updateAll();
    });
  });

  container.querySelectorAll('.prod-preview').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.target.dataset.id;
      if(typeof openProfitCalcPreviewForProduct === 'function') {
        openProfitCalcPreviewForProduct(id, e.target);
      }
    });
  });

  container.querySelectorAll('.prod-sell').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.target.dataset.id;
      if(typeof openSellFormForProduct === 'function') {
        openSellFormForProduct(id, e.target);
      }
    });
  });

  container.querySelectorAll('.prod-stock').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.target.dataset.id;
      const inSubFolder = window.location.pathname.includes('/impressora3d/');
      const targetPath = inSubFolder ? 'estoque.html' : 'impressora3d/estoque.html';
      window.location.href = `${targetPath}?prod=${encodeURIComponent(id)}`;
    });
  });
}

function openProfitCalcPreviewForProduct(productId, anchorBtn){
  const existing = document.getElementById('imp3d-profit-preview-' + productId);
  
  // LÓGICA NOVA: Fecha qualquer outro painel aberto no sistema
  closeAllProductPanels(); 

  // Se ele já estava aberto, o limpador acima removeu, então apenas saímos (efeito Toggle)
  if(existing){
    return;
  }

  const prod = state.products.find(p=>p.id === productId);
  if(!prod) return;

  ensureProductVariants(prod);

  const form = document.createElement('div');
  form.id = 'imp3d-profit-preview-' + productId;
  form.style.marginTop = '10px';
  form.style.padding = '12px';
  form.style.borderRadius = '14px';
  form.style.background = 'rgba(255,255,255,0.03)';
  form.style.border = '1px solid rgba(148,163,184,0.12)';

  form.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px;">
      <strong style="font-size:0.95rem;">Cálculo estimado de lucro</strong>
      <button type="button" class="btn small" id="${form.id}-close">Fechar</button>
    </div>

    <div class="form-grid">
      <div class="form-field">
        <label>Variação</label>
        <select id="${form.id}-variant"></select>
      </div>

      <div class="form-field">
        <label>Filamento</label>
        <select id="${form.id}-fil"></select>
      </div>

      <div class="form-field">
        <label>Quantidade</label>
        <input id="${form.id}-qty" type="number" step="1" value="1">
      </div>

      <div class="form-field">
        <label>Preço de venda (R$)</label>
        <input id="${form.id}-price" type="number" step="0.01" value="${Number(prod.price || 0)}">
      </div>
    </div>

    <div class="imp3d-sell-preview" style="margin-top:12px;">
      <div><span class="label">Custo material</span><span class="value" id="${form.id}-mat">R$ 0,00</span></div>
      <div><span class="label">Taxa Shopee</span><span class="value" id="${form.id}-fee">R$ 0,00</span></div>
      <div><span class="label">Líquido</span><span class="value" id="${form.id}-net">R$ 0,00</span></div>
      <div><span class="label">Lucro estimado</span><span class="value" id="${form.id}-profit">R$ 0,00</span></div>
    </div>
  `;

  const card = anchorBtn.closest('.box-card');
  card.parentNode.insertBefore(form, card.nextSibling);

  const variantSel = document.getElementById(`${form.id}-variant`);
  const filSel = document.getElementById(`${form.id}-fil`);
  const qtyInput = document.getElementById(`${form.id}-qty`);
  const priceInput = document.getElementById(`${form.id}-price`);
  const closeBtn = document.getElementById(`${form.id}-close`);

  fillVariantSelect(variantSel, prod, 'default');

  filSel.innerHTML = '';
  state.filaments.forEach(f=>{
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = `${f.color} — ${f.type} (${Number(f.weight || 0).toFixed(2)} g)`;
    filSel.appendChild(opt);
  });

  if(!state.filaments.length){
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Nenhum filamento';
    filSel.appendChild(opt);
  }

  function syncPrice(){
    const v = getProductVariant(prod, variantSel.value);
    if(v) priceInput.value = Number(v.price || 0).toFixed(2);
  }

  function recompute(){
    const fil = state.filaments.find(f => f.id === filSel.value);
    const qty = Number(qtyInput.value || 0);
    const price = Number(priceInput.value || 0);

    const matEl = document.getElementById(`${form.id}-mat`);
    const feeEl = document.getElementById(`${form.id}-fee`);
    const netEl = document.getElementById(`${form.id}-net`);
    const profitEl = document.getElementById(`${form.id}-profit`);

    if(!fil || qty <= 0 || price <= 0){
      matEl.textContent = money(0);
      feeEl.textContent = money(0);
      netEl.textContent = money(0);
      profitEl.textContent = money(0);
      return;
    }

    const initial = Number(fil.initialWeight || fil.weight || 0);
    const priceRolo = Number(fil.price || 0);
    const pricePerGram = initial > 0 ? (priceRolo / initial) : 0;

    const materialCostUnit = Number(prod.fil_g || 0) * pricePerGram;
    const hourlyCostUnit = Number(prod.hours || 0) * Number(prod.energy_h || 0);
    const packagingCostUnit = Number(prod.pack || 0);

    const gross = price * qty;
    const feePerUnit = Number(SHOPEE_FEE_FIXED) + Number(SHOPEE_FEE_PCT) * price;
    const feeTotal = feePerUnit * qty;

    const materialCostTotal = materialCostUnit * qty;
    const hourlyCostTotal = hourlyCostUnit * qty;
    const packagingCostTotal = packagingCostUnit * qty;

    const net = gross - feeTotal;
    const profit = net - (materialCostTotal + hourlyCostTotal + packagingCostTotal);

    matEl.textContent = money(materialCostTotal);
    feeEl.textContent = money(feeTotal);
    netEl.textContent = money(net);
    profitEl.textContent = money(profit);
  }

  variantSel.addEventListener('change', ()=>{
    syncPrice();
    recompute();
  });

  filSel.addEventListener('change', ()=>{
    const autoVariantId = matchVariantToFilament(prod, filSel.value);
    if(autoVariantId) variantSel.value = autoVariantId;
    syncPrice();
    recompute();
  });
  
  qtyInput.addEventListener('input', recompute);
  priceInput.addEventListener('input', recompute);

  closeBtn.addEventListener('click', ()=>{
    form.remove();
  });

  syncPrice();
  setTimeout(recompute, 50);
}

function editProduct(productId){
  const prod = state.products.find(p => p.id === productId);
  if(!prod){
    alert('Produto não encontrado.');
    return;
  }

  const newName = prompt('Nome do produto:', prod.name);
  if(newName === null) return;

  const newHours = prompt('Horas de impressão:', String(prod.hours ?? 0));
  if(newHours === null) return;

  const newFilG = prompt('Filamento por unidade (g):', String(prod.fil_g ?? 0));
  if(newFilG === null) return;

  const newEnergy = prompt('Custo energia (R$/h):', String(prod.energy_h ?? 0));
  if(newEnergy === null) return;

  const newPack = prompt('Custo embalagem (R$):', String(prod.pack ?? 0));
  if(newPack === null) return;

  const newPrice = prompt('Preço de venda (R$):', String(prod.price ?? 0));
  if(newPrice === null) return;

  const newDesc = prompt('Descrição (opcional):', prod.desc || '');
  if(newDesc === null) return;

  const name = newName.trim();
  const hours = Number(newHours || 0);
  const fil_g = Number(newFilG || 0);
  const energy_h = Number(newEnergy || 0);
  const pack = Number(newPack || 0);
  const price = Number(newPrice || 0);
  const desc = newDesc.trim();

  if(!name){
    alert('Nome inválido.');
    return;
  }
  if(fil_g <= 0 || price <= 0){
    alert('Filamento por unidade e preço de venda precisam ser maiores que zero.');
    return;
  }

  prod.name = name;
  prod.hours = hours;
  prod.fil_g = fil_g;
  prod.energy_h = energy_h;
  prod.pack = pack;
  prod.price = price;
  prod.desc = desc;

  saveState();
  updateAll();
}

/* abre formulário de retirada/perda de filamento inline */
function openWithdrawFormForFilament(filamentId, anchorBtn) {
  const existing = document.getElementById('imp3d-withdraw-form-' + filamentId);
  if (existing) { existing.remove(); return; }

  const f = state.filaments.find(x => x.id === filamentId);
  if (!f) return;

  const form = document.createElement('div');
  form.id = 'imp3d-withdraw-form-' + filamentId;
  form.style.marginTop = '8px';
  form.style.padding = '12px';
  form.style.background = 'rgba(0,0,0,0.06)';
  form.style.borderRadius = '8px';
  form.style.border = '1px solid rgba(255,255,255,0.03)';

  // Gera as opções de contas dinamicamente para o select
  let accountsOptions = state.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  let defaultAcc = state.accounts.find(a => a.id === 'nubank') ? 'nubank' : state.accounts[0].id;

  form.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end;">
        <div style="flex:1; min-width:160px;">
          <label style="font-size:0.85rem;color:var(--muted)">Motivo / Tipo</label>
          <select id="withdraw-mode-${filamentId}" style="width:100%;padding:8px;border-radius:8px;background:#020617;border:1px solid rgba(255,255,255,0.03)">
            <option value="1">Perda / Prejuízo / Falha</option>
            <option value="2">Venda Externa (Fora da Shopee)</option>
          </select>
        </div>
        <div style="width:120px;">
          <label style="font-size:0.85rem;color:var(--muted)">Gramas (g)</label>
          <input id="withdraw-grams-${filamentId}" type="number" step="0.1" placeholder="Ex: 50" style="width:100%;padding:8px;border-radius:8px;background:#020617;border:1px solid rgba(255,255,255,0.03)"/>
        </div>
      </div>

      <div id="withdraw-loss-fields-${filamentId}" style="display:flex; gap:8px; flex-wrap:wrap;">
        <div style="flex:1;">
          <label style="font-size:0.85rem;color:var(--muted)">Detalhe da perda (Opcional)</label>
          <input id="withdraw-reason-${filamentId}" type="text" placeholder="Ex: Falha na base, suporte quebrado..." style="width:100%;padding:8px;border-radius:8px;background:#020617;border:1px solid rgba(255,255,255,0.03)"/>
        </div>
      </div>

      <div id="withdraw-sale-fields-${filamentId}" style="display:none; gap:8px; flex-wrap:wrap;">
        <div style="flex:1; min-width:120px;">
          <label style="font-size:0.85rem;color:var(--muted)">Valor pago (R$)</label>
          <input id="withdraw-gross-${filamentId}" type="number" step="0.01" placeholder="Ex: 45.00" style="width:100%;padding:8px;border-radius:8px;background:#020617;border:1px solid rgba(255,255,255,0.03)"/>
        </div>
        <div style="flex:1; min-width:120px;">
          <label style="font-size:0.85rem;color:var(--muted)">Frete (R$) - Opcional</label>
          <input id="withdraw-freight-${filamentId}" type="number" step="0.01" placeholder="Ex: 15.00" style="width:100%;padding:8px;border-radius:8px;background:#020617;border:1px solid rgba(255,255,255,0.03)"/>
        </div>
        <div style="flex:1; min-width:150px;">
          <label style="font-size:0.85rem;color:var(--muted)">Conta Destino</label>
          <select id="withdraw-acc-${filamentId}" style="width:100%;padding:8px;border-radius:8px;background:#020617;border:1px solid rgba(255,255,255,0.03)">
            ${accountsOptions}
          </select>
        </div>
      </div>

      <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:4px;">
        <button id="withdraw-confirm-${filamentId}" class="btn-primary">Confirmar retirada</button>
        <button id="withdraw-cancel-${filamentId}" class="btn ghost">Cancelar</button>
      </div>
    </div>
  `;

  // Insere o formulário logo abaixo do card do filamento
  const card = anchorBtn.closest('.box-card');
  card.parentNode.insertBefore(form, card.nextSibling);

  // Lógica para alternar os campos visíveis (Perda x Venda Externa)
  const modeSel = document.getElementById(`withdraw-mode-${filamentId}`);
  const lossFields = document.getElementById(`withdraw-loss-fields-${filamentId}`);
  const saleFields = document.getElementById(`withdraw-sale-fields-${filamentId}`);
  const accSel = document.getElementById(`withdraw-acc-${filamentId}`);
  
  if (accSel) accSel.value = defaultAcc;

  modeSel.addEventListener('change', (e) => {
    if (e.target.value === '1') {
      lossFields.style.display = 'flex';
      saleFields.style.display = 'none';
    } else {
      lossFields.style.display = 'none';
      saleFields.style.display = 'flex';
    }
  });

  // Lógica do botão Cancelar
  document.getElementById(`withdraw-cancel-${filamentId}`).addEventListener('click', () => {
    form.remove();
  });

  // Lógica do botão Confirmar (executa os cálculos que antes ficavam nos prompts)
  document.getElementById(`withdraw-confirm-${filamentId}`).addEventListener('click', () => {
    const mode = modeSel.value;
    const grams = Number(document.getElementById(`withdraw-grams-${filamentId}`).value || 0);

    if (!grams || grams <= 0) {
      alert('Preencha uma quantidade válida de gramas.');
      return;
    }

    const unitCost = getFilamentPricePerGram(f);
    const autoCost = grams * unitCost;

    if (Number(f.weight || 0) < grams) {
      if (!confirm(`Este rolo tem apenas ${Number(f.weight || 0).toFixed(2)} g. Deseja registrar mesmo assim (ficará negativo)?`)) return;
    }

    if (mode === '1') {
      // 1) LÓGICA DE PERDA
      const reason = document.getElementById(`withdraw-reason-${filamentId}`).value.trim() || 'Perda / falha de impressão';
      
      f.weight = Number(f.weight || 0) - grams;
      state.impLosses.push({
        id: 'loss-' + Date.now().toString(),
        date: todayISO(),
        filamentId: filamentId,
        grams: Number(grams),
        unitCost: Number(unitCost),
        cost: Number(autoCost),
        reason: reason,
        mode: 'perda'
      });

      saveState();
      updateAll();
      alert(`Perda registrada com sucesso.\n${grams} g retirados.\nCusto: ${money(autoCost)}`);

    } else if (mode === '2') {
      // 2) LÓGICA DE VENDA EXTERNA
      const gross = Number(document.getElementById(`withdraw-gross-${filamentId}`).value || 0);
      const freightCost = Number(document.getElementById(`withdraw-freight-${filamentId}`).value || 0);
      const accId = accSel.value;

      if (!gross || gross <= 0) {
        alert('Para venda externa, o valor pago deve ser maior que zero.');
        return;
      }

      f.weight = Number(f.weight || 0) - grams;

      // Cria a entrada de dinheiro
      const saleEntry = {
        id: 'imp3d-ext-sale-' + Date.now().toString(),
        date: todayISO(),
        desc: `Venda externa (${f.color} — ${f.type})`,
        amount: Number(gross),
        type: 'entrada',
        accountId: accId,
        method: 'venda externa',
        category: 'venda_externa'
      };
      applyExpenseEffects(saleEntry);
      state.expenses.push(saleEntry);

      // Cria o débito do frete (se houver)
      if (freightCost > 0) {
        const freightExp = {
          id: 'imp3d-ext-freight-' + Date.now().toString(),
          date: todayISO(),
          desc: `Frete venda externa (${f.color} — ${f.type})`,
          amount: Number(freightCost),
          type: 'saldo',
          accountId: accId,
          method: 'frete externo',
          category: 'frete_externo'
        };
        applyExpenseEffects(freightExp);
        state.expenses.push(freightExp);
      }

      // Registra a venda no painel da Impressora3D
      state.impSales.push({
        id: 'imp3d-ext-' + Date.now().toString(),
        date: todayISO(),
        productId: 'Venda externa',
        filamentId: filamentId,
        accountId: accId,
        qty: Number(grams),
        amountGross: Number(gross),
        feeTotal: 0,
        netReceived: Number(gross - freightCost),
        materialCost: Number(autoCost),
        hourlyCost: 0,
        packagingCost: 0,
        mandatoryReinvest: Number(autoCost + freightCost),
        profit: Number(gross - freightCost - autoCost),
        channel: 'externa'
      });

      saveState();
      updateAll();
      alert(`Venda externa registrada!\nLíquido: ${money(gross - freightCost)}\nLucro: ${money(gross - freightCost - autoCost)}`);
    }
  });
}

function openSellFormForProduct(productId, anchorBtn){
  const existing = document.getElementById('imp3d-sell-form-'+productId);
  
  // LÓGICA NOVA: Fecha qualquer outro painel aberto
  closeAllProductPanels();

  // Se já estava aberto, sai
  if(existing){ 
    return; 
  }

  const prod = state.products.find(p=>p.id===productId);
  if(!prod) return;

  ensureProductVariants(prod);

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
        <label style="font-size:0.85rem;color:var(--muted)">Variação</label>
        <select id="sell-variant-${productId}" style="width:100%;padding:8px;border-radius:8px;background:#020617;border:1px solid rgba(255,255,255,0.03)"></select>
      </div>
      <div style="flex:1; min-width:160px">
        <label style="font-size:0.85rem;color:var(--muted)">Filamento</label>
        <select id="sell-fil-${productId}" style="width:100%;padding:8px;border-radius:8px;background:#020617;border:1px solid rgba(255,255,255,0.03)"></select>
      </div>
      <div style="width:110px">
        <label style="font-size:0.85rem;color:var(--muted)">Quantidade</label>
        <input id="sell-qty-${productId}" type="number" step="1" value="1" style="width:100%;padding:8px;border-radius:8px;background:#020617;border:1px solid rgba(255,255,255,0.03)"/>
      </div>
      <div style="flex:1; min-width:140px">
        <label style="font-size:0.85rem;color:var(--muted)">Conta (recebe valor)</label>
        <select id="sell-acc-${productId}" style="width:100%;padding:8px;border-radius:8px;background:#020617;border:1px solid rgba(255,255,255,0.03)"></select>
      </div>
      <div style="width:120px">
        <label style="font-size:0.85rem;color:var(--muted)">Preço (R$)</label>
        <input id="sell-price-${productId}" type="number" step="0.01" value="${Number(prod.price || 0)}" style="width:100%;padding:8px;border-radius:8px;background:#020617;border:1px solid rgba(255,255,255,0.03)"/>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        <button id="sell-confirm-${productId}" class="btn-primary">Confirmar venda</button>
        <button id="sell-cancel-${productId}" class="btn ghost">Cancelar</button>
      </div>
    </div>
  `;
  const card = anchorBtn.closest('.box-card');
  card.parentNode.insertBefore(form, card.nextSibling);

  const variantSel = document.getElementById(`sell-variant-${productId}`);
  const filSel = document.getElementById(`sell-fil-${productId}`);
  const accSel = document.getElementById(`sell-acc-${productId}`);
  const qtyInput = document.getElementById(`sell-qty-${productId}`);
  const priceInput = document.getElementById(`sell-price-${productId}`);

  fillVariantSelect(variantSel, prod, 'default');

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

  accSel.innerHTML = '';
  state.accounts.forEach(a=>{
    const o = document.createElement('option');
    o.value = a.id;
    o.textContent = a.name;
    accSel.appendChild(o);
  });
  if(state.accounts.some(a=>a.id==='shopee')) accSel.value = 'shopee';

  function syncPriceFromVariant(){
    const v = getProductVariant(prod, variantSel.value);
    if(v) priceInput.value = Number(v.price || 0).toFixed(2);
  }

  variantSel.addEventListener('change', syncPriceFromVariant);

  filSel.addEventListener('change', ()=>{
    const autoVariantId = matchVariantToFilament(prod, filSel.value);
    if(autoVariantId) variantSel.value = autoVariantId;
    syncPriceFromVariant();
  });

  document.getElementById(`sell-cancel-${productId}`).addEventListener('click', ()=>{
    form.remove();
  });

  document.getElementById(`sell-confirm-${productId}`).addEventListener('click', ()=>{
    const filId = filSel.value;
    const qty = Number(qtyInput.value || 0);
    const accId = accSel.value;
    const price = Number(priceInput.value || 0);

    if(!filId || qty <= 0 || !accId || price <= 0){
      alert('Preencha filamento, quantidade, conta e preço corretos.');
      return;
    }

    sellProduct(productId, filId, accId, qty, price);
    form.remove();
  });

  syncPriceFromVariant();
}

function sellFromStock(stockId, qtyToSell){
  const stock = state.impStock.find(s => s.id === stockId);
  if(!stock){
    alert('Item não encontrado.');
    return;
  }

  const prod = state.products.find(p => p.id === stock.productId);
  if(!prod){
    alert('Produto inválido.');
    return;
  }

  qtyToSell = Number(qtyToSell || 0);
  const available = Number(stock.qty || 0);

  if(qtyToSell <= 0 || qtyToSell > available){
    alert('Quantidade inválida.');
    return;
  }

  // snapshot salvo no lote, se existir
  let snapshot = stock.snapshot ? JSON.parse(JSON.stringify(stock.snapshot)) : null;

  // Se o lote não tiver custo válido, pede manualmente o preço por grama
  const currentMaterialCost = Number(snapshot?.unitMaterialCost || 0);
  const currentPricePerGram = snapshot?.filamentSnapshot?.pricePerGram;

  let manualPricePerGram = null;

  if(!snapshot || !currentMaterialCost || currentMaterialCost <= 0){
    const defaultVal =
      (currentPricePerGram !== undefined && currentPricePerGram !== null && currentPricePerGram !== '')
        ? String(currentPricePerGram)
        : '0';

    const val = prompt(
      'Esse item do estoque não tem custo de filamento válido.\nDigite o preço por grama do filamento para esta venda:',
      defaultVal
    );

    if(val === null) return;

    manualPricePerGram = Number(val || 0);
    if(!manualPricePerGram || manualPricePerGram <= 0){
      alert('Preço por grama inválido.');
      return;
    }
  } else {
    // Se quiser, ainda permite sobrescrever manualmente mesmo quando já existe custo salvo
    const useManual = confirm('Deseja sobrescrever o custo do filamento desta venda com um preço por grama manual?');
    if(useManual){
      const defaultVal =
        (currentPricePerGram !== undefined && currentPricePerGram !== null && currentPricePerGram !== '')
          ? String(currentPricePerGram)
          : String((Number(snapshot.unitMaterialCost || 0) / Number(prod.fil_g || 1)) || 0);

      const val = prompt('Preço por grama do filamento para esta venda:', defaultVal);
      if(val === null) return;

      manualPricePerGram = Number(val || 0);
      if(!manualPricePerGram || manualPricePerGram <= 0){
        alert('Preço por grama inválido.');
        return;
      }
    }
  }

  // Se o usuário informou manualmente, recria um snapshot temporário só para esta venda
  if(manualPricePerGram !== null){
    snapshot = {
      salePricePerUnit: Number(snapshot?.salePricePerUnit || prod.price || 0),
      unitMaterialCost: Number(prod.fil_g || 0) * manualPricePerGram,
      unitHourlyCost: Number(prod.hours || 0) * Number(prod.energy_h || 0),
      unitPackagingCost: Number(prod.pack || 0),
      // FIX: Preservando as variáveis para não quebrar a estrutura do histórico
      variantId: snapshot?.variantId || 'default',
      variantLabel: snapshot?.variantLabel || 'Padrão',
      filamentSnapshot: {
        id: stock.snapshot?.filamentSnapshot?.id || stock.filamentId || 'manual',
        color: stock.snapshot?.filamentSnapshot?.color || 'Manual',
        type: stock.snapshot?.filamentSnapshot?.type || 'Manual',
        pricePerGram: manualPricePerGram
      }
    };
  }

  const result = processImp3dSale({
    productId: stock.productId,
    filamentId: stock.filamentId || stock.snapshot?.filamentSnapshot?.id || 'filamento_removido',
    accountId: 'shopee',
    qty: qtyToSell,
    pricePerUnit: Number(snapshot?.salePricePerUnit || prod.price || 0),
    snapshot,
    skipFilamentDebit: true,
    channel: 'estoque'
  });

  if(!result) return;

  stock.qty = available - qtyToSell;
  if(stock.qty <= 0){
    state.impStock = state.impStock.filter(s => s.id !== stockId);
  }

  saveState();
  updateAll();

  alert(
    `Venda do estoque realizada.\n` +
    `Bruto: ${money(result.amountGross)}\n` +
    `Taxa Shopee: ${money(result.feeTotal)}\n` +
    `Líquido recebido: ${money(result.netReceived)}\n` +
    `Lucro real: ${money(result.profit)}`
  );
}

function buildImp3dUnitSnapshot(prod, fil, salePricePerUnit, variant = null){
  const salePrice = Number(salePricePerUnit || prod.price || 0);
  const initial = Number(fil.initialWeight || fil.weight || 0);
  const pricePerGram = initial > 0 ? Number(fil.price || 0) / initial : 0;

  return {
    salePricePerUnit: salePrice,
    unitMaterialCost: Number(prod.fil_g || 0) * pricePerGram,
    unitHourlyCost: Number(prod.hours || 0) * Number(prod.energy_h || 0),
    unitPackagingCost: Number(prod.pack || 0),

    variantId: variant?.id || 'default',
    variantLabel: variant?.label || 'Padrão',
    
    // O filamentSnapshot PRECISA estar aqui para manter o histórico de custo e material
    filamentSnapshot: {
      id: fil.id,
      color: fil.color,
      type: fil.type,
      price: Number(fil.price || 0),
      initialWeight: Number(fil.initialWeight || fil.weight || 0),
      pricePerGram
    }
  };
}

function stockProduct(productId, variantId, filamentId, qty, note){
  const prod = state.products.find(p => p.id === productId);
  const fil = state.filaments.find(f => f.id === filamentId);

  if(!prod || !fil) return alert('Produto ou filamento inválido');

  ensureProductVariants(prod);

  const variant = getProductVariant(prod, variantId || 'default') || getProductVariant(prod, 'default');
  if(!variant) return alert('Variação inválida');

  qty = Number(qty || 0);
  if(qty <= 0) return alert('Quantidade inválida');

  const totalFilNeeded = Number(prod.fil_g || 0) * qty;

  if(Number(fil.weight || 0) < totalFilNeeded){
    if(!confirm('Filamento insuficiente. Deseja permitir negativo?')) return;
  }

  const snapshot = buildImp3dUnitSnapshot(prod, fil, variant.price, variant);

  fil.weight = Number(fil.weight || 0) - totalFilNeeded;

  state.impStock.push({
    id: Date.now().toString(),
    date: todayISO(),
    productId,
    variantId: variant.id,
    variantLabel: variant.label,
    variantPrice: Number(variant.price || 0),
    filamentId,
    qty: Number(qty),
    note: note || '',
    snapshot
  });

  saveState();
  updateAll();
  alert(`Item estocado com sucesso!\nQuantidade: ${qty}`);
}

function calcImp3dSaleMetrics(prod, fil, qty, pricePerUnit){
  qty = Number(qty || 0);
  pricePerUnit = Number(pricePerUnit || 0);

  const totalFilNeeded = Number(prod.fil_g || 0) * qty;

  // custo do filamento
  const initial = Number(fil.initialWeight || fil.weight || 0);
  const priceRolo = Number(fil.price || 0);
  const pricePerGram = initial > 0 ? (priceRolo / initial) : 0;
  const materialCostUnit = Number(prod.fil_g || 0) * pricePerGram;
  const materialCostTotal = materialCostUnit * qty;

  // custo por hora
  const hourlyCostUnit = Number(prod.hours || 0) * Number(prod.energy_h || 0);
  const hourlyCostTotal = hourlyCostUnit * qty;

  // custo de embalagem
  const packagingCostUnit = Number(prod.pack || 0);
  const packagingCostTotal = packagingCostUnit * qty;

  // taxas Shopee
  const feePerUnit = Number(SHOPEE_FEE_FIXED) + Number(SHOPEE_FEE_PCT) * Number(pricePerUnit || 0);
  const feeTotal = feePerUnit * qty;

  // valores
  const amountGross = Number(pricePerUnit || 0) * qty;
  const netReceived = amountGross - feeTotal;
  const mandatoryReinvest = materialCostTotal + hourlyCostTotal + packagingCostTotal;
  const profit = netReceived - mandatoryReinvest;

  return {
    totalFilNeeded,
    materialCostTotal,
    hourlyCostTotal,
    packagingCostTotal,
    feeTotal,
    amountGross,
    netReceived,
    mandatoryReinvest,
    profit
  };
}

/* vendendo: determinístico, registra entradas/despesas nas contas corretas */
function sellProduct(productId, filamentId, accountId, qty, pricePerUnit){
  const result = processImp3dSale({
    productId,
    filamentId,
    accountId: 'shopee',
    qty,
    pricePerUnit,
    skipFilamentDebit: false,
    channel: 'normal'
  });

  if(!result) return;

  saveState();
  updateAll();

  alert(
    `Venda registrada.\n` +
    `Bruto: ${money(result.amountGross)}\n` +
    `Taxa Shopee: ${money(result.feeTotal)}\n` +
    `Líquido recebido: ${money(result.netReceived)}\n` +
    `Reinvestimento obrigatório: ${money(result.mandatoryReinvest)}\n` +
    ` - Filamento: ${money(result.materialCostTotal)}\n` +
    ` - Custo por hora: ${money(result.hourlyCostTotal)}\n` +
    ` - Embalagem: ${money(result.packagingCostTotal)}\n` +
    `Lucro real: ${money(result.profit)}`
  );
}

function renderImpStock(){
  const el = document.getElementById('stock-list');
  if(!el) return;

  el.innerHTML = '';

  if(!state.impStock.length){
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Nenhum item em estoque.';
    el.appendChild(empty);
    return;
  }

  state.impStock.forEach(stock=>{
    const prod = state.products.find(p=>p.id===stock.productId) || {name:'?'};
    const totalUnitCost = Number(stock.snapshot?.unitMaterialCost || 0)
      + Number(stock.snapshot?.unitHourlyCost || 0)
      + Number(stock.snapshot?.unitPackagingCost || 0);

    const card = document.createElement('div');
    card.className = 'box-card';
    card.style.display = 'flex';
    card.style.justifyContent = 'space-between';
    card.style.alignItems = 'center';

    card.innerHTML = `
      <div>
        <div style="font-weight:700">${prod.name}</div>
        <div style="font-size:0.85rem;color:var(--muted);">
          Lote: ${stock.id} — Qtd: ${stock.qty} — Custo/un: ${money(totalUnitCost)} — Preço/un: ${money(stock.snapshot?.salePricePerUnit || 0)}
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="number" min="1" max="${stock.qty}" step="1" class="stock-sell-qty" data-id="${stock.id}" value="1" style="width:90px"/>
        <button class="btn small sell-stock" data-id="${stock.id}">Vender</button>
      </div>
    `;
    el.appendChild(card);
  });

  el.querySelectorAll('.sell-stock').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const stockId = e.target.dataset.id;
      const qtyInput = el.querySelector(`.stock-sell-qty[data-id="${stockId}"]`);
      const qty = Number(qtyInput?.value || 0);
      sellFromStock(stockId, qty);
    });
  });
}



/* render vendas - agora mostra colunas com cálculo e soma total recebido / lucro */
function renderImpSales(){
  const tbody = document.getElementById('imp3d-sales-body');

  const arr = [...state.impSales].sort((a,b)=> a.date < b.date ? 1 : -1);

  let totalReceived = 0;
  let totalProfit = 0;
  let totalMandatoryReinvest = 0;

  if(tbody){
    tbody.innerHTML = '';

    arr.forEach(s=>{
      const prod = state.products.find(p=>p.id===s.productId) || {name:s.productId};
      const fil = state.filaments.find(f=>f.id===s.filamentId) || {color:s.filamentId};

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${s.date}</td>
        <td>${prod.name}</td>
        <td>${fil.color||fil.id}</td>
        <td>${s.qty}</td>
        <td>${money(s.amountGross||0)}</td>
        <td>${money(s.feeTotal||0)}</td>
        <td>${money(s.netReceived||0)}</td>
        <td>${money(s.materialCost||0)}</td>
        <td>${money(s.hourlyCost||0)}</td>
        <td>${money(s.packagingCost||0)}</td>
        <td>${money(s.mandatoryReinvest||0)}</td>
        <td>${money(s.profit||0)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  arr.forEach(s=>{
    totalReceived += Number(s.netReceived || 0);
    totalProfit += Number(s.profit || 0);
    totalMandatoryReinvest += Number(s.mandatoryReinvest || 0);
  });

  const recEl = document.getElementById('imp3d-total-received');
  const profEl = document.getElementById('imp3d-total-profit');
  const reinvEl = document.getElementById('imp3d-total-reinvest');

  if(recEl) recEl.textContent = money(totalReceived);
  if(profEl) profEl.textContent = money(totalProfit);
  if(reinvEl) reinvEl.textContent = money(totalMandatoryReinvest);
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

function getGroupedStock(){
  const map = {};

  state.impStock.forEach(s => {
    const qty = Number(s.qty || 0);
    const unitMaterial = Number(s.snapshot?.unitMaterialCost || 0);
    const unitHourly = Number(s.snapshot?.unitHourlyCost || 0);
    const unitPackaging = Number(s.snapshot?.unitPackagingCost || 0);
    const unitTotalCost = unitMaterial + unitHourly + unitPackaging;
    const totalCost = unitTotalCost * qty;

    // Agrupa por Produto + Variação para não misturar
    const groupKey = s.productId + '_' + (s.variantId || 'default');

    if(!map[groupKey]){
      map[groupKey] = {
        productId: s.productId,
        variantId: s.variantId || 'default',
        variantLabel: s.variantLabel || 'Padrão',
        qty: 0,
        totalCost: 0,
        lotIds: []
      };
    }

    map[groupKey].qty += qty;
    map[groupKey].totalCost += totalCost;
    map[groupKey].lotIds.push(s.id);
  });

  return Object.values(map);
}

function renderImpStock(){
  const tbody = document.getElementById('imp3d-stock-body');
  if(!tbody) return;

  tbody.innerHTML = '';
  const grouped = getGroupedStock();

  if(!grouped.length){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" class="muted">Nenhum item em estoque.</td>`; // Agora com colspan 6
    tbody.appendChild(tr);
    return;
  }

  grouped.forEach(g => {
    const prod = state.products.find(p => p.id === g.productId) || { name: g.productId };
    const avgUnit = g.qty > 0 ? (g.totalCost / g.qty) : 0;
    const firstLot = state.impStock.find(s => s.productId === g.productId && s.variantId === g.variantId);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${prod.name}</td>
      <td>${g.variantLabel}</td>
      <td>${g.qty}</td>
      <td>${money(avgUnit)}</td>
      <td>${money(g.totalCost)}</td>
      <td>
        <button class="btn small stock-open" data-product="${g.productId}" data-lot="${firstLot ? firstLot.id : ''}">
          Vender
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Re-anexa os eventos do botão "Vender" da tabela
  tbody.querySelectorAll('.stock-open').forEach(btn => {
    btn.addEventListener('click', e => {
      const lotId = e.target.dataset.lot || '';
      const sellSel = document.getElementById('sell-stock-item');
      if(sellSel && lotId){
        sellSel.value = lotId;
      }
      const qtyInput = document.getElementById('sell-stock-qty');
      if(qtyInput) qtyInput.focus();
    });
  });
}

/* export/import especifico Impressora3D (mantido) */
function imp3dExport(){
  const data = {
    filaments: state.filaments,
    products: state.products,
    impSales: state.impSales,
    impLosses: state.impLosses,
    impStock: state.impStock
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

function updateCategoryDatalist() {
  const dl = document.getElementById('box-options');
  if(!dl) return;
  
  const cats = new Set();
  state.products.forEach(p => {
    const c = (p.category || '').trim();
    if(c && c.toLowerCase() !== 'geral') cats.add(c);
  });
  
  dl.innerHTML = '';
  Array.from(cats).sort().forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    dl.appendChild(opt);
  });
}

function handleAddProduct(){
  const catInput = document.getElementById('prod-category')?.value.trim();
  const cat = catInput ? catInput : 'Geral'; // Se deixar em branco, vai para "Geral"
  
  const name = document.getElementById('prod-name').value.trim();
  const hours = Number(document.getElementById('prod-hours').value || 0);
  const fil_g = Number(document.getElementById('prod-fil-g').value || 0);
  const energy_h = Number(document.getElementById('prod-energy-h').value || 0);
  const pack = Number(document.getElementById('prod-pack').value || 0);
  const price = Number(document.getElementById('prod-price').value || 0);
  const desc = document.getElementById('prod-desc').value.trim();

  if(!name || fil_g <= 0 || price <= 0){
    alert('Nome, filamento por unidade (g) e preço são obrigatórios e devem ser válidos.');
    return;
  }

  const p = {
    id: Date.now().toString(),
    category: cat,
    name,
    hours: Number(hours),
    fil_g: Number(fil_g),
    energy_h: Number(energy_h),
    pack: Number(pack),
    price: Number(price),
    desc,
    variants: [
      { id: 'default', label: 'Padrão', price: Number(price) }
    ]
  };

  state.products.push(p);
  saveState();

  // Limpa apenas os dados, mantém a Caixa preenchida para agilizar cadastros em massa
  document.getElementById('prod-name').value = '';
  document.getElementById('prod-hours').value = '';
  document.getElementById('prod-fil-g').value = '';
  document.getElementById('prod-energy-h').value = '';
  document.getElementById('prod-pack').value = '';
  document.getElementById('prod-price').value = '';
  document.getElementById('prod-desc').value = '';

  updateAll();
  
  const searchInput = document.getElementById('prod-search');
  if(searchInput) searchInput.value = '';
  renderProducts();
}

function processImp3dSale({
  productId,
  filamentId,
  accountId,
  qty,
  pricePerUnit,
  snapshot,
  skipFilamentDebit = false,
  channel = 'normal',
  filamentSnapshot = null
}){
  const prod = state.products.find(p => p.id === productId);
  const acc = state.accounts.find(a => a.id === accountId);
  const liveFil = state.filaments.find(f => f.id === filamentId);

  const fil = liveFil || filamentSnapshot || snapshot?.filamentSnapshot || null;

  if(!prod || !acc){
    alert('Produto/conta inválidos.');
    return null;
  }

  qty = Number(qty || 0);
  pricePerUnit = Number(pricePerUnit || 0);

  if(qty <= 0 || pricePerUnit <= 0){
    alert('Quantidade ou preço inválidos.');
    return null;
  }

  if(!snapshot && !fil){
    alert('Não foi possível localizar os dados do filamento para calcular a venda.');
    return null;
  }

  // CORREÇÃO: Calcula o valor da grama na hora da venda normal, pois 'liveFil' não tem 'pricePerGram' salvo nativamente.
  let currentPricePerGram = 0;
  if(fil){
    if(fil.pricePerGram !== undefined){
      currentPricePerGram = Number(fil.pricePerGram);
    } else {
      const initial = Number(fil.initialWeight || fil.weight || 0);
      currentPricePerGram = initial > 0 ? Number(fil.price || 0) / initial : 0;
    }
  }

  const snap = snapshot || {
    salePricePerUnit: pricePerUnit,
    unitMaterialCost: Number(prod.fil_g || 0) * currentPricePerGram,
    unitHourlyCost: Number(prod.hours || 0) * Number(prod.energy_h || 0),
    unitPackagingCost: Number(prod.pack || 0),
    filamentSnapshot: fil ? {
      id: fil.id || '',
      color: fil.color || 'Filamento',
      type: fil.type || '',
      pricePerGram: currentPricePerGram
    } : null
  };

  const totalFilNeeded = Number(prod.fil_g || 0) * qty;

  if(!skipFilamentDebit){
    if(!liveFil){
      alert('Filamento ativo não encontrado para esta venda.');
      return null;
    }

    if(Number(liveFil.weight || 0) < totalFilNeeded){
      if(!confirm(`Filamento selecionado tem ${Number(liveFil.weight || 0).toFixed(2)} g — precisa de ${totalFilNeeded.toFixed(2)} g. Continuar e permitir estoque negativo?`)) return null;
    }

    liveFil.weight = Number(liveFil.weight || 0) - totalFilNeeded;
  }

  const unitSalePrice = Number(snap.salePricePerUnit || pricePerUnit || 0);
  const amountGross = unitSalePrice * qty;

  const feePerUnit = Number(SHOPEE_FEE_FIXED) + Number(SHOPEE_FEE_PCT) * unitSalePrice;
  const feeTotal = feePerUnit * qty;

  const materialCostTotal = Number(snap.unitMaterialCost || 0) * qty;
  const hourlyCostTotal = Number(snap.unitHourlyCost || 0) * qty;
  const packagingCostTotal = Number(snap.unitPackagingCost || 0) * qty;

  const mandatoryReinvest = materialCostTotal + hourlyCostTotal + packagingCostTotal;
  const netReceived = amountGross - feeTotal;
  const profit = netReceived - mandatoryReinvest;

  const sale = {
    id: Date.now().toString(),
    date: todayISO(),
    productId,
    filamentId: filamentId || fil?.id || '',
    accountId: 'shopee',
    qty,
    amountGross,
    feeTotal,
    netReceived,
    materialCost: materialCostTotal,
    hourlyCost: hourlyCostTotal,
    packagingCost: packagingCostTotal,
    mandatoryReinvest,
    profit,
    channel
  };
  state.impSales.push(sale);

  const saleEntry = {
    id: 'imp3d-sale-' + Date.now().toString(),
    date: todayISO(),
    desc: `${channel === 'estoque' ? 'Venda estoque' : 'Venda'} ${prod.name} x${qty}`,
    amount: amountGross,
    type: 'entrada',
    accountId: 'shopee',
    method: channel === 'estoque' ? 'venda estoque' : 'venda impressora3d',
    category: 'impressora3d'
  };
  applyExpenseEffects(saleEntry);
  state.expenses.push(saleEntry);

  if(feeTotal > 0){
    const feeExp = {
      id: 'imp3d-fee-' + Date.now().toString(),
      date: todayISO(),
      desc: `Taxa Shopee — ${prod.name} x${qty}`,
      amount: feeTotal,
      type: 'saldo',
      accountId: 'shopee',
      method: 'taxa_shopee',
      category: 'taxa_plataforma'
    };
    applyExpenseEffects(feeExp);
    state.expenses.push(feeExp);
  }

  if(materialCostTotal > 0){
    const matExp = {
      id: 'imp3d-mat-' + Date.now().toString(),
      date: todayISO(),
      desc: `Custo material ${prod.name} x${qty} (${fil?.color || 'filamento'})`,
      amount: materialCostTotal,
      type: 'saldo',
      accountId: 'imp3d',
      method: 'custo material',
      category: 'custo_material'
    };
    applyExpenseEffects(matExp);
    state.expenses.push(matExp);
  }

  if(hourlyCostTotal > 0){
    const hourExp = {
      id: 'imp3d-hour-' + Date.now().toString(),
      date: todayISO(),
      desc: `Custo hora ${prod.name} x${qty}`,
      amount: hourlyCostTotal,
      type: 'saldo',
      accountId: 'imp3d',
      method: 'custo hora',
      category: 'custo_hora'
    };
    applyExpenseEffects(hourExp);
    state.expenses.push(hourExp);
  }

  if(packagingCostTotal > 0){
    const packExp = {
      id: 'imp3d-pack-' + Date.now().toString(),
      date: todayISO(),
      desc: `Custo embalagem ${prod.name} x${qty}`,
      amount: packagingCostTotal,
      type: 'saldo',
      accountId: 'imp3d',
      method: 'custo embalagem',
      category: 'custo_embalagem'
    };
    applyExpenseEffects(packExp);
    state.expenses.push(packExp);
  }

  return {
    amountGross,
    feeTotal,
    netReceived,
    materialCostTotal,
    hourlyCostTotal,
    packagingCostTotal,
    mandatoryReinvest,
    profit
  };
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
});

function updateImp3dAccountBalances(){
  const imp3dEl = document.getElementById('imp3d-acc-balance');
  const shopeeEl = document.getElementById('shopee-acc-balance');

  if(!imp3dEl && !shopeeEl) return;

  const imp3dAcc = state.accounts.find(a => a.id === 'imp3d');
  const shopeeAcc = state.accounts.find(a => a.id === 'shopee');

  if(imp3dEl){
    imp3dEl.textContent = imp3dAcc ? money(imp3dAcc.saldo || 0) : '—';
  }

  if(shopeeEl){
    shopeeEl.textContent = shopeeAcc ? money(shopeeAcc.saldo || 0) : '—';
  }
}

function ensureProductVariants(prod){
  if(!prod) return [];

  if(!Array.isArray(prod.variants) || !prod.variants.length){
    prod.variants = [{
      id: 'default',
      label: 'Padrão',
      price: Number(prod.price || 0)
    }];
  }

  prod.variants = prod.variants.map((v, idx)=>({
    id: v.id || (idx === 0 ? 'default' : `var-${idx}`),
    label: String(v.label || v.name || `Variação ${idx + 1}`).trim() || `Variação ${idx + 1}`,
    price: Number(v.price ?? prod.price ?? 0)
  }));

  if(!prod.variants.some(v => v.id === 'default')){
    prod.variants.unshift({
      id: 'default',
      label: 'Padrão',
      price: Number(prod.price || 0)
    });
  }

  return prod.variants;
}

function getProductVariant(prod, variantId){
  const variants = ensureProductVariants(prod);
  return variants.find(v => v.id === variantId) || variants[0];
}

function getProductVariantPrice(prod, variantId){
  const v = getProductVariant(prod, variantId);
  return Number(v?.price ?? prod?.price ?? 0);
}

function getProductVariantLabel(prod, variantId){
  const v = getProductVariant(prod, variantId);
  return v ? v.label : 'Padrão';
}

function matchVariantToFilament(prod, filamentId){
  const fil = state.filaments.find(f => f.id === filamentId);
  const variants = ensureProductVariants(prod);

  if(!fil || !variants.length) return variants[0]?.id || 'default';

  const needle = String(fil.color || fil.type || '').toLowerCase().trim();

  if(!needle) return variants[0]?.id || 'default';

  const exact = variants.find(v =>
    String(v.label || '').toLowerCase().includes(needle) ||
    String(v.id || '').toLowerCase().includes(needle)
  );

  return exact ? exact.id : (variants[0]?.id || 'default');
}

function fillVariantSelect(selectEl, prod, selectedId){
  if(!selectEl || !prod) return;

  const variants = ensureProductVariants(prod);
  selectEl.innerHTML = '';

  variants.forEach(v=>{
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = `${v.label} — ${money(v.price)}`;
    selectEl.appendChild(opt);
  });

  if(selectedId && variants.some(v => v.id === selectedId)){
    selectEl.value = selectedId;
  } else if(variants.some(v => v.id === 'default')){
    selectEl.value = 'default';
  } else if(variants.length){
    selectEl.value = variants[0].id;
  }
}

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
}

/* ---------- FIM DO ARQUIVO ---------- */
