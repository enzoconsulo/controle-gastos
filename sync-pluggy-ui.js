(function () {
  const RENDER_BACKEND_URL = "https://controle-gastos-be.onrender.com";
  const CLIENT_USER_ID = "enzo"; // pode ser qualquer string (uso pessoal)

  function waitForState(timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const t = setInterval(() => {
        if (window.state && Array.isArray(window.state.expenses)) {
            clearInterval(t);
            resolve(true);
        } else if (Date.now() - start > timeoutMs) {
            clearInterval(t);
            reject(new Error("state nao carregou a tempo. confira se sync-pluggy-ui.js está depois do script.js"));
        }
        }, 100);
    });
    }

  function hashKey(parts) {
    const base = parts.join("|");
    let h = 0;
    for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
    return "sync-" + h.toString(16);
  }

  function importTransactions(txs, accountFallback = "nubank") {

    const existing = new Set((window.state.expenses || []).map(e => e._syncKey).filter(Boolean));
    let added = 0, skipped = 0;

    for (const t of txs) {
      const date = t.date;
      const desc = t.description || "";
      const signed = Number(t.amountSigned || 0);
      if (!date || !desc || !signed) continue;

      // regra simples:
      // + => entrada
      // - => saldo (ou credito se for cartão)
      let type = signed > 0 ? "entrada" : "saldo";
      if (t.isCreditCard && signed < 0) type = "credito";

      const amount = Math.abs(signed);

      // aqui você pode melhorar depois: mapear conta por accountName
      const accountId = window.state.accounts.some(a => a.id === accountFallback) ? accountFallback : window.state.accounts[0]?.id;

      const key = hashKey([t.id || "", date, desc.toLowerCase(), amount.toFixed(2), accountId, type]);
      if (existing.has(key)) { skipped++; continue; }

      const exp = {
        id: key,
        _syncKey: key,
        date,
        desc: `[Nubank] ${desc}`,
        amount,
        type,
        accountId,
        method: "sync",
        category: "outros"
      };

      if (typeof window.applyExpenseEffects === "function") window.applyExpenseEffects(exp);
      window.state.expenses.push(exp);
      existing.add(key);
      added++;
    }

    if (typeof window.saveState === "function") window.saveState();
    if (typeof window.updateAll === "function") window.updateAll();
    alert(`Sincronização concluída.\nAdicionados: ${added}\nIgnorados: ${skipped}`);
  }

  async function getConnectToken(itemId) {
    const r = await fetch(`${RENDER_BACKEND_URL}/connect-token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientUserId: CLIENT_USER_ID, itemId: itemId || null })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Falha ao gerar connect token");
    return data.connectToken || data.accessToken;
  }

  async function sync(itemId, from, to) {
    const r = await fetch(`${RENDER_BACKEND_URL}/sync`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId, from: from || null, to: to || null })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Falha ao sincronizar");
    return data.transactions || [];
    }

  function mountUI() {
    const tab = document.getElementById("tab-log");
    if (!tab) return;

    const card = document.createElement("div");
    card.className = "panel-card";
    card.style.marginTop = "14px";
    card.innerHTML = `
      <h3 class="card-title">Nubank (login + sincronizar)</h3>
      <p class="muted" style="margin-top:6px">
        1) Conectar (login/consentimento) • 2) Sincronizar (importar transações)
      </p>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; align-items:end">
        <div style="display:flex; flex-direction:column; gap:4px">
            <label style="font-size:0.85rem;color:var(--muted)">De</label>
            <input id="nu-from" type="date" style="padding:8px;border-radius:8px;background:#020617;border:1px solid rgba(255,255,255,0.08);color:#fff"/>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px">
            <label style="font-size:0.85rem;color:var(--muted)">Até</label>
            <input id="nu-to" type="date" style="padding:8px;border-radius:8px;background:#020617;border:1px solid rgba(255,255,255,0.08);color:#fff"/>
        </div>
       </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px">
        <button id="btn-nu-connect" class="btn">Conectar Nubank</button>
        <button id="btn-nu-sync" class="btn-primary">Sincronizar</button>
      </div>
      <small class="muted" style="display:block; margin-top:8px">
        Dica: a conexão fica salva neste aparelho (localStorage).
      </small>
    `;
    tab.appendChild(card);

    const toD = new Date();
    const fromD = new Date();
    fromD.setDate(fromD.getDate() - 1);
    card.querySelector("#nu-to").value = toD.toISOString().slice(0, 10);
    card.querySelector("#nu-from").value = fromD.toISOString().slice(0, 10);

    const ITEM_KEY = "pluggy_item_id";
    const getItemId = () => localStorage.getItem(ITEM_KEY);
    const setItemId = (v) => localStorage.setItem(ITEM_KEY, v);

    // Abrir widget Pluggy Connect
    card.querySelector("#btn-nu-connect").addEventListener("click", async () => {
    try {
        await waitForState();

        const itemId = getItemId();
        const connectToken = await getConnectToken(itemId);

        const pc = new window.PluggyConnect({
        connectToken,
        onSuccess: ({ item }) => {
            if (item?.id) setItemId(item.id);
            alert("Nubank conectado com sucesso!");
        },
        onError: (err) => alert("Erro ao conectar: " + (err?.message || "desconhecido"))
        });

        pc.init();
    } catch (e) {
        alert(e.message || String(e));
    }
    });

    // Sincronizar
    card.querySelector("#btn-nu-sync").addEventListener("click", async () => {
    try {
        await waitForState();

        const itemId = getItemId();
        if (!itemId) return alert("Primeiro clique em 'Conectar Nubank'.");

        const from = card.querySelector("#nu-from")?.value || "";
        const to = card.querySelector("#nu-to")?.value || "";

        if ((from && !to) || (!from && to)) {
        return alert("Preencha as duas datas (De e Até) ou deixe ambas vazias.");
        }
        if (from && to && from > to) {
        return alert("A data 'De' não pode ser maior que a data 'Até'.");
        }

        const txs = await sync(itemId, from || null, to || null);
        importTransactions(txs, "nubank");
    } catch (e) {
        alert(e.message || String(e));
    }
    });
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(mountUI, 200));
})();

/* ========================================================
   INTEGRAÇÃO APPLE PAY (SUPABASE API)
   ======================================================== */
const SUPABASE_URL = "https://vrtbzubfmjmbyofksnzs.supabase.co";

async function syncApplePayDireto() {
  let SUPABASE_KEY = localStorage.getItem("secretSupaKey");
  
  // Pede a senha na primeira vez e esconde no navegador
  if (!SUPABASE_KEY) {
    SUPABASE_KEY = prompt("🔒 Segurança: Insira a Chave (Publishable/Anon) do Supabase para puxar os gastos:");
    if (SUPABASE_KEY) {
      localStorage.setItem("secretSupaKey", SUPABASE_KEY.trim());
    } else {
      return; 
    }
  }

  const HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json"
  };

  try {
    // 1. Busca os gastos pendentes na nuvem (GET)
    const resBusca = await fetch(`${SUPABASE_URL}/rest/v1/pendentes?select=*`, {
      method: "GET",
      headers: HEADERS
    });
    
    // Se a chave estiver errada, apaga a memória
    if (!resBusca.ok) {
        if(resBusca.status === 401 || resBusca.status === 403) {
            alert("❌ Chave do Supabase inválida. Recarregue a página e tente novamente.");
            localStorage.removeItem("secretSupaKey");
        }
        return;
    }
/* ========================================================
   BOTÃO PARA TROCAR A CHAVE DO SUPABASE
   ======================================================== */
document.addEventListener('DOMContentLoaded', () => {
    const btnChangeKey = document.getElementById('btn-change-supa-key');
    
    if (btnChangeKey) {
        btnChangeKey.addEventListener('click', () => {
            const currentKey = localStorage.getItem("secretSupaKey") || "";
            const novaChave = prompt("🔑 Insira a nova Chave (Publishable/Anon) do Supabase:\n\n(Se quiser apagar a chave atual, deixe em branco e dê OK)", currentKey);
            
            if (novaChave !== null) { // null significa que o usuário clicou em "Cancelar"
                if (novaChave.trim() !== "") {
                    localStorage.setItem("secretSupaKey", novaChave.trim());
                    alert("✅ Chave atualizada com sucesso!");
                } else {
                    if (confirm("Você deixou o campo em branco. Tem certeza que deseja apagar a chave salva?")) {
                        localStorage.removeItem("secretSupaKey");
                        alert("🗑️ Chave apagada com sucesso!");
                    }
                }
            }
        });
    }
});
    const pendentes = await resBusca.json();

    if (pendentes && pendentes.length > 0) {
      let idsParaApagar = [];
      let importados = 0;
      
      // Função auxiliar para achar a conta dinamicamente pelos IDs reais do estado
      const findAccId = (keyword) => {
          const acc = state.accounts.find(a => a.name.toLowerCase().includes(keyword) || a.id === keyword);
          return acc ? acc.id : null;
      };
      
      // 2. Processa cada gasto
      pendentes.forEach(exp => {
         // Cria um ID único para evitar duplicar se rodar duas vezes rápido
         const uniqueId = `supa-${exp.id}`;
         const exists = state.expenses.find(e => e.id === uniqueId); 
         
         if (!exists) {
            // Limpa formatação caso o iPhone envie como "R$ 15,90"
            const limpo = String(exp.valor).replace(/[^\d,-]/g, '').replace(',', '.');
            const amountNumber = parseFloat(limpo) || 0;

            // ==========================================
            // 🧠 ROTEADOR INTELIGENTE DE CARTÕES
            // Alinhado perfeitamente com os IDs do seu state.js
            // ==========================================
            const nomeCartao = (exp.cartao || "").toLowerCase();
            
            // Fallback padrão se não reconhecer o cartão
            let contaDestino = "nubank"; 
            let tipoGasto = "credito";
            let categoriaGasto = "outros";
            
            if (nomeCartao.includes("sicoob")) {
                contaDestino = findAccId("sicoob") || "sicoob";
            } else if (nomeCartao.includes("itau") || nomeCartao.includes("itaú")) {
                contaDestino = findAccId("itau") || "itau";
            } else if (nomeCartao.includes("mercado") || nomeCartao.includes("mp") || nomeCartao.includes("pago")) {
                contaDestino = "mercado_pago";
            } else if (nomeCartao.includes("nubank")) {
                contaDestino = "nubank";
            } else if (nomeCartao.includes("caju") || nomeCartao.includes("vr")) {
                contaDestino = "caju"; 
                tipoGasto = "vr"; 
                categoriaGasto = "alimentacao";
            }

            // Cria o objeto exato que o sistema processa
            const novaDespesa = {
              id: uniqueId,
              date: exp.date ? exp.date.substring(0,10) : new Date().toISOString().slice(0,10),
              desc: exp.estabelecimento || "Apple Pay",
              amount: amountNumber,
              type: tipoGasto, 
              accountId: contaDestino,
              method: exp.cartao || "Apple Pay", 
              category: categoriaGasto 
            };

            // Aplica os efeitos na conta (abate saldo/crédito)
            if (typeof applyExpenseEffects === 'function') applyExpenseEffects(novaDespesa);
            state.expenses.push(novaDespesa);
            importados++;
         }
         idsParaApagar.push(exp.id); 
      });
      
      if(importados > 0) {
          saveState(); 
          updateAll(); 
      }

      // 3. Manda apagar da nuvem o que já foi lido (DELETE)
      if (idsParaApagar.length > 0) {
        const idsFormatados = idsParaApagar.join(',');
        await fetch(`${SUPABASE_URL}/rest/v1/pendentes?id=in.(${idsFormatados})`, {
          method: "DELETE",
          headers: HEADERS
        });
        if(importados > 0) alert(`💸 Sincronizado! ${importados} despesa(s) do Apple Pay importada(s).`);
      }
    }
  } catch (error) {
    console.error("Erro na sincronização:", error);
  }
}

// Executa automaticamente toda vez que a tela principal terminar de carregar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(syncApplePayDireto, 1000); 
});

/* ========================================================
   BOTÕES DE CONTROLE DO SUPABASE (SINC E CHAVE)
   ======================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Botão de Trocar a Chave
    const btnChangeKey = document.getElementById('btn-change-supa-key');
    if (btnChangeKey) {
        btnChangeKey.addEventListener('click', () => {
            const currentKey = localStorage.getItem("secretSupaKey") || "";
            const novaChave = prompt("🔑 Insira a nova Chave (Publishable/Anon) do Supabase:\n\n(Se quiser apagar a chave atual, deixe em branco e dê OK)", currentKey);
            
            if (novaChave !== null) { 
                if (novaChave.trim() !== "") {
                    localStorage.setItem("secretSupaKey", novaChave.trim());
                    alert("✅ Chave atualizada com sucesso!");
                } else {
                    if (confirm("Você deixou o campo em branco. Tem certeza que deseja apagar a chave salva?")) {
                        localStorage.removeItem("secretSupaKey");
                        alert("🗑️ Chave apagada com sucesso!");
                    }
                }
            }
        });
    }

    // 2. Botão de Sincronizar Wallet Manualmente
    const btnSyncWallet = document.getElementById('btn-sync-wallet');
    if (btnSyncWallet) {
        btnSyncWallet.addEventListener('click', () => {
            // Como a função já avisa na tela quantos importou, é só chamá-la direto
            syncApplePayDireto(); 
        });
    }
});
