/* script.js
   Versão fiel ao Excel enviado:
   - Os inputs (linhas longas) atualizam as contas (saldo, gasto_credito, gasto_vr, investimento, guardado)
   - Calcula: Crédito disponível, VR disponível, Saldo (EXCLUINDO a conta VR/Caju), Guardado total
   - Mostra Créditos + Débito = CréditoDisponível + Saldo
   - Salva em localStorage
*/

// --- VALORES INICIAIS (extraídos do seu arquivo enviado) ---
const DEFAULT = {
    accounts: [
      { id: "nubank", name: "Nubank", saldo: 60, gasto_credito: 540, gasto_vr: 0, investimento: 4093, guardado: 6823 },
      { id: "sicoob", name: "Sicoob", saldo: 0, gasto_credito: 140, gasto_vr: 0, investimento: 0, guardado: 0 },
      { id: "itau", name: "Itau", saldo: 552, gasto_credito: 0, gasto_vr: 0, investimento: 450, guardado: 453 },
      { id: "caju", name: "Caju", saldo: 750, gasto_credito: 0, gasto_vr: 90, investimento: 0, guardado: 0 } // Caju = VR account
    ],
    totals: {
      credito_total: 1800,
      vr_total: 840,
      entrada: 2311
    }
  };
  
  // storage keys
  const STORAGE_KEY = "controleGastos_v1";
  
  // app state
  let state = loadState();
  
  // --- helpers
  function money(v){
    v = Number(v || 0);
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  
  function sum(arr, fn){ return arr.reduce((s,x)=>s + (Number(fn?fn(x):x)||0),0); }
  
  // --- load/save
  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){}
    // fallback to default copy
    return JSON.parse(JSON.stringify(DEFAULT));
  }
  function saveState(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  
  // --- render accounts table (painel preto)
  function renderAccountsTable(){
    const tbody = document.getElementById("accounts-body");
    tbody.innerHTML = "";
    state.accounts.forEach(acc=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${acc.name}</td>
        <td>${money(acc.saldo)}</td>
        <td>${money(acc.gasto_credito)}</td>
        <td>${money(acc.gasto_vr)}</td>
        <td>${money(acc.investimento)}</td>
        <td style="color:${acc.guardado? '#fff' : '#999'}">${money(acc.guardado)}</td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  // --- calculations (replicando as fórmulas do seu Excel)
  function calculateDerived(){
    const total_gasto_credito = sum(state.accounts, a=>a.gasto_credito);
    const available_credit = Number(state.totals.credito_total) - total_gasto_credito;
  
    const total_gasto_vr = sum(state.accounts, a=>a.gasto_vr);
    const available_vr = Number(state.totals.vr_total) - total_gasto_vr;
  
    const guardado_total = sum(state.accounts, a=>a.guardado);
  
    // saldo total = soma de todos os saldos
    const total_saldos = sum(state.accounts, a=>a.saldo);
  
    // SALDO visível no painel: exclui a conta de VR (no seu excel a conta VR é "Caju")
    const vrAccount = state.accounts.find(a => a.name.toLowerCase().includes("caju") || a.name.toLowerCase().includes("vr"));
    const saldo_display = total_saldos - (vrAccount ? Number(vrAccount.saldo) : 0);
  
    const credito_debito = available_credit + saldo_display;
  
    return {
      total_gasto_credito, available_credit,
      total_gasto_vr, available_vr,
      guardado_total, total_saldos, saldo_display,
      credito_debito
    };
  }
  
  // --- render yellow boxes
  function renderYellow(){
    const calc = calculateDerived();
    document.getElementById("avail-credit").textContent = money(calc.available_credit);
    document.getElementById("avail-vr").textContent = money(calc.available_vr);
    document.getElementById("avail-saldo").textContent = money(calc.saldo_display);
    document.getElementById("avail-guardado").textContent = money(calc.guardado_total);
    document.getElementById("credit-debit-small").textContent = money(calc.credito_debito);
  }
  
  // --- render editable accounts inputs (as linhas longas)
  function renderEditableAccounts(){
    const container = document.getElementById("editable-accounts");
    container.innerHTML = "";
    state.accounts.forEach((acc, idx)=>{
      const card = document.createElement("div");
      card.className = "account-card";
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
  
    // hook inputs
    container.querySelectorAll("input").forEach(inp=>{
      inp.addEventListener("input", (e)=>{
        const idx = Number(e.target.dataset.acc);
        const field = e.target.dataset.field;
        const val = Number(e.target.value || 0);
        state.accounts[idx][field] = val;
        updateAll();
      });
    });
  
    // totals
    document.getElementById("input-credit-total").value = state.totals.credito_total;
    document.getElementById("input-vr-total").value = state.totals.vr_total;
    document.getElementById("input-entrada").value = state.totals.entrada;
  
    ["input-credit-total","input-vr-total","input-entrada"].forEach(id=>{
      document.getElementById(id).addEventListener("input", (e)=>{
        const v = Number(e.target.value || 0);
        if(id === "input-credit-total") state.totals.credito_total = v;
        if(id === "input-vr-total") state.totals.vr_total = v;
        if(id === "input-entrada") state.totals.entrada = v;
        updateAll();
      });
    });
  }
  
  // --- chart (gasto credito)
  let gastoChart = null;
  function renderChart(){
    const ctx = document.getElementById("gasto-credito-chart").getContext("2d");
    const labels = state.accounts.map(a=>a.name);
    const data = state.accounts.map(a=>Number(a.gasto_credito)||0);
  
    if(gastoChart) gastoChart.destroy();
    gastoChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{ label: "Gasto Crédito", data }]
      },
      options: {
        plugins: { legend:{display:false}, tooltip:{callbacks:{label:ctx=> `${ctx.label}: ${money(ctx.raw)}`}} },
        scales:{ x:{ ticks:{color:'#cbd5e1'} }, y:{ ticks:{ color:'#cbd5e1', callback:val=> 'R$ ' + val }, grid:{color:'rgba(255,255,255,0.03)'} } }
      }
    });
  }
  
  // --- main render
  function updateAll(){
    renderAccountsTable();
    renderYellow();
    renderChart();
    saveState();
  }
  
  // --- reset to default
  function resetToDefault(){
    state = JSON.parse(JSON.stringify(DEFAULT));
    saveState();
    renderEditableAccounts();
    updateAll();
  }
  
  // --- init
  function init(){
    // if no saved state -> initialize from default
    if(!localStorage.getItem(STORAGE_KEY)){
      state = JSON.parse(JSON.stringify(DEFAULT));
      saveState();
    }
    // build UI
    renderEditableAccounts();
    renderAccountsTable();
    renderYellow();
    renderChart();
  
    // buttons
    document.getElementById("save-btn").addEventListener("click", ()=>{
      saveState();
      alert("Salvo localmente no navegador.");
    });
    document.getElementById("reset-btn").addEventListener("click", ()=>{
      if(confirm("Resetar para os valores originais do Excel enviado?")) resetToDefault();
    });
  }
  
  document.addEventListener("DOMContentLoaded", init);
  