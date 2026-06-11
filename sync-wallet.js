/* ========================================================
   INTEGRAÇÃO APPLE PAY (SUPABASE API)
   ======================================================== */
const SUPABASE_URL = "https://vrtbzubfmjmbyofksnzs.supabase.co";

async function syncApplePayDireto() {
  let SUPABASE_KEY = localStorage.getItem("secretSupaKey");
  
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
    const resBusca = await fetch(`${SUPABASE_URL}/rest/v1/pendentes?select=*`, {
      method: "GET",
      headers: HEADERS
    });
    
    if (!resBusca.ok) {
        if(resBusca.status === 401 || resBusca.status === 403) {
            alert("❌ Chave do Supabase inválida. Recarregue a página e tente novamente.");
            localStorage.removeItem("secretSupaKey");
        }
        return;
    }

    const pendentes = await resBusca.json();

    if (pendentes && pendentes.length > 0) {
      let idsParaApagar = [];
      let importados = 0;
      
      const findAccId = (keyword) => {
          const acc = state.accounts.find(a => a.name.toLowerCase().includes(keyword) || a.id === keyword);
          return acc ? acc.id : null;
      };
      
      pendentes.forEach(exp => {
         const uniqueId = `supa-${exp.id}`;
         const exists = state.expenses.find(e => e.id === uniqueId); 
         
         if (!exists) {
            const limpo = String(exp.valor).replace(/[^\d,-]/g, '').replace(',', '.');
            const amountNumber = parseFloat(limpo) || 0;

            // Pega o nome do cartão e do estabelecimento em minúsculo
            const nomeCartao = (exp.cartao || "").toLowerCase();
            const nomeLugar = (exp.estabelecimento || "").toLowerCase();

            let contaDestino = "nubank"; 
            let tipoGasto = "credito";
            let categoriaGasto = "outros";
            
            // ==========================================
            // 🧠 1. ROTEADOR DE CATEGORIAS (Pelo arquivo externo)
            // ==========================================
            // Varre a variável global DICT_CATEGORIAS que foi importada no index.html
            if (typeof DICT_CATEGORIAS !== "undefined") {
                for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
                    if (keywords.some(kw => nomeLugar.includes(kw))) {
                        categoriaGasto = cat;
                        break;
                    }
                }
            }

            // ==========================================
            // 🧠 2. ROTEADOR DE CARTÕES / CONTAS
            // ==========================================
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
                categoriaGasto = "alimentacao"; // Se for VR, força ser alimentação
            }

            // ==========================================
            // 🛠️ 3. CORREÇÃO DA DATA (Tradutor de DD/MM/YYYY para YYYY-MM-DD)
            // ==========================================
            let dataFormatada = new Date().toISOString().slice(0,10);
            if (exp.date) {
                let dStr = exp.date.trim().substring(0, 10);
                if (dStr.includes('/')) {
                    // Se o iPhone mandou "15/06/2026", converte para "2026-06-15"
                    let partes = dStr.split('/');
                    if (partes.length === 3 && partes[2].length === 4) {
                        dataFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`;
                    }
                } else if (dStr.includes('-')) {
                    dataFormatada = dStr; // Já veio correto (ex: 2026-06-15)
                }
            }

            // Cria o objeto exato que o sistema processa usando a dataFormatada
            const novaDespesa = {
              id: uniqueId,
              date: dataFormatada,
              desc: exp.estabelecimento || "Apple Pay",
              amount: amountNumber,
              type: tipoGasto, 
              accountId: contaDestino,
              method: exp.cartao || "Apple Pay", 
              category: categoriaGasto 
            };

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

      if (idsParaApagar.length > 0) {
        const idsFormatados = idsParaApagar.join(',');
        await fetch(`${SUPABASE_URL}/rest/v1/pendentes?id=in.(${idsFormatados})`, {
          method: "DELETE",
          headers: HEADERS
        });
        if(importados > 0) alert(`💸 Sincronizado! ${importados} despesa(s) importada(s) do Apple Pay.`);
      }
    }
  } catch (error) {
    console.error("Erro na sincronização:", error);
  }
}

/* ========================================================
   CONTROLES DA INTERFACE (BOTÕES DE SINC E CHAVE)
   ======================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Sincronização Automática ao abrir a tela
    setTimeout(syncApplePayDireto, 1000); 

    // 2. Botão de Trocar a Chave
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

    // 3. Botão de Sincronizar Manualmente
    const btnSyncWallet = document.getElementById('btn-sync-wallet');
    if (btnSyncWallet) {
        btnSyncWallet.addEventListener('click', () => {
            syncApplePayDireto(); 
        });
    }
});
