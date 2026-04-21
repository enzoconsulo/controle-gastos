const BUSINESS_ACCOUNTS = ['imp3d', 'shopee', 'mercado_pago'];

let gastoChart=null, categoryChart=null, monthlyChart=null, entradaChart=null;

/* ---------- render ---------- */
function renderAccountsTable(){
  const tbody = document.getElementById('accounts-body');
  if(!tbody) return;
  tbody.innerHTML = '';
  const month = getActiveMonth();
  const sums = monthlySumsByAccount(month);

  // Renderiza Contas Pessoais primeiro
  const personalAccs = state.accounts.filter(a => !BUSINESS_ACCOUNTS.includes(a.id));
  personalAccs.forEach(a => {
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

  // Renderiza Divisor e Contas do Negócio
  const businessAccs = state.accounts.filter(a => BUSINESS_ACCOUNTS.includes(a.id));
  if(businessAccs.length > 0){
    const divTr = document.createElement('tr');
    divTr.innerHTML = `<td colspan="5" style="background: rgba(59,130,246,0.1); text-align: center; font-size: 0.75rem; font-weight: 800; color: #60a5fa; padding: 8px; letter-spacing: 0.1em;">📦 CONTAS DO NEGÓCIO (ISOLADAS)</td>`;
    tbody.appendChild(divTr);

    businessAccs.forEach(a => {
      const s = sums[a.id] || { gasto_credito:0, gasto_vr:0, gasto_saldo:0 };
      const tr = document.createElement('tr');
      tr.style.background = 'rgba(0,0,0,0.2)'; // Fundo levemente mais escuro
      tr.innerHTML = `
        <td style="color: var(--muted);">${a.name}</td>
        <td style="color: var(--muted);">${money(a.saldo)}</td>
        <td style="color: var(--muted);">${money(s.gasto_credito)}</td>
        <td></td>
        <td style="color: var(--muted);">${money(a.guardado || 0)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // atualizar resumo conta imp3d
  const imp3dAcc = state.accounts.find(a=>a.id==='imp3d');
  const imp3dBalanceEl = document.getElementById('imp3d-acc-balance');
  if(imp3dBalanceEl) imp3dBalanceEl.textContent = imp3dAcc ? money(imp3dAcc.saldo) : '—';
  const shopeeAcc = state.accounts.find(a=>a.id==='shopee');
  const shopeeBalanceEl = document.getElementById('shopee-acc-balance');
  if(shopeeBalanceEl) shopeeBalanceEl.textContent = shopeeAcc ? money(shopeeAcc.saldo) : '—';
}

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
  
  // Filtra apenas contas pessoais
  const personalAccounts = state.accounts.filter(a => !BUSINESS_ACCOUNTS.includes(a.id));

  const total_gasto_credito = sum(personalAccounts, a => sums[a.id] ? sums[a.id].gasto_credito : 0);
  const available_credit_total = Number(state.totals.credito_total || 0) - total_gasto_credito;

  const total_gasto_vr = sum(personalAccounts, a => sums[a.id] ? sums[a.id].gasto_vr : 0);
  const available_vr = Number(state.totals.vr_total||0) - total_gasto_vr;

  const guardado_total = sum(personalAccounts, a => a.guardado || 0);
  
  const total_saldos = sum(personalAccounts, a => a.saldo || 0);
  const vrAccount = personalAccounts.find(a => a.name.toLowerCase().includes('caju') || a.name.toLowerCase().includes('vr'));
  const saldo_display = total_saldos - (vrAccount ? Number(vrAccount.saldo) : 0);
  
  const credito_debito = available_credit_total + saldo_display;

  return { sumsByAccount: sums, total_gasto_credito, available_credit_total, available_vr, guardado_total, saldo_display, credito_debito };
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
    const isBusiness = BUSINESS_ACCOUNTS.includes(acc.id);
    const card = document.createElement('div'); 
    card.className='account-card';
    if(isBusiness) card.style.border = '1px solid rgba(59, 130, 246, 0.3)'; // Borda azul para contas da loja

    card.innerHTML = `<h4>${acc.name} ${isBusiness ? '<span style="font-size:0.7rem; color:#60a5fa; float:right;">NEGÓCIO</span>' : ''}</h4>
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

/* charts (mantidos) */


function renderGastoCreditoChart(){
  const el = document.getElementById('gasto-credito-chart');
  if(!el) return;
  const ctx = el.getContext('2d');
  const month = getActiveMonth();
  const sums = monthlySumsByAccount(month);
  
  const personalAccounts = state.accounts.filter(a => !BUSINESS_ACCOUNTS.includes(a.id));
  const labels = personalAccounts.map(a=>a.name);
  const data = personalAccounts.map(a => (sums[a.id] ? sums[a.id].gasto_credito : 0));
  
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
    .filter(e => billingMonthOf(e.date) === month && !BUSINESS_ACCOUNTS.includes(e.accountId))
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
      .filter(e => billingMonthOf(e.date) === month && e.type !== 'entrada' && !BUSINESS_ACCOUNTS.includes(e.accountId))
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
    .filter(e => billingMonthOf(e.date) === month && e.type === 'entrada' && !BUSINESS_ACCOUNTS.includes(e.accountId))
    .forEach(e=>{
      map[e.accountId] = (map[e.accountId]||0) + Number(e.amount||0);
    });
  if(includeStart && state.startEntries){
    state.startEntries
      .filter(s => s.month === month && !BUSINESS_ACCOUNTS.includes(s.accountId))
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

/* investimentos: resumo + log + caixinhas (mantidos) */
function renderInvestimentos(){
  const personalAccounts = state.accounts.filter(a => !BUSINESS_ACCOUNTS.includes(a.id));
  const list = document.getElementById('invest-list'); 
  if(list){
    list.innerHTML='';
    personalAccounts.forEach(a=>{
      const item=document.createElement('div'); item.className='invest-item';
      item.innerHTML=`<div>${a.name}</div><div>${money(a.guardado||0)}</div>`;
      list.appendChild(item);
    });
  }

  const totalEl = document.getElementById('guardado-total');
  if(totalEl) totalEl.textContent = money(sum(personalAccounts, x=>x.guardado||0));

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
