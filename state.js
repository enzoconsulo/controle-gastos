const STORAGE_KEY = "controleExcel_v10";

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
  productBoxes: [{ id: 'box-default', name: 'Geral', emoji: '📦' }],
  products: [],       // {id,name,hours,fil_g,price,desc}
  impSales: [],       // {id,date,productId,filamentId,accountId,qty,amountGross,feeTotal,netReceived,materialCost,profit}
  impLosses: [],      // {id,date,filamentId,grams,cost,reason}
  impExternalSales: [],
  impStock: [], // {id,date,productId,filamentId,qty,materialCost,hourlyCost,packagingCost}
  meta: { baseMonth: null, activeOffset: 0, lastCreditClosed: null }
};

let state = loadState();
window.state = state;

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

      if(!s.productBoxes) {
        s.productBoxes = [{ id: 'box-default', name: 'Geral', emoji: '📦' }];
        
        // Se já existiam produtos com categorias antigas (texto), converte em caixas
        if(Array.isArray(s.products)){
          const catNames = [...new Set(s.products.map(p => p.category).filter(c => c && c !== 'Geral'))];
          catNames.forEach((catName, idx) => {
            s.productBoxes.push({ id: 'box-mig-' + idx, name: catName, emoji: '📁' });
          });
          // Atualiza os produtos para usarem boxId em vez de category
          s.products.forEach(p => {
            const catName = p.category || 'Geral';
            const box = s.productBoxes.find(b => b.name === catName);
            p.boxId = box ? box.id : 'box-default';
            delete p.category; // Limpa o dado velho
          });
        }
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
