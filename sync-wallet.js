/* ========================================================
   INTEGRAÇÃO APPLE PAY, E-MAIL (GOOGLE SCRIPT) E CSV
   ======================================================== */
const SUPABASE_URL = "https://vrtbzubfmjmbyofksnzs.supabase.co";

const parseDateString = (dStr) => {
    const [y, m, d] = dStr.split('-');
    return new Date(y, m - 1, d).getTime();
};

/* ==========================================
   1. FUNÇÃO CENTRAL DE PROCESSAMENTO DO CSV
   ========================================== */
function processarCSV(textoCSV) {
    const rows = textoCSV.split('\n').filter(row => row.trim().length > 0);
    if (rows.length < 2) return;

    const header = rows[0].toLowerCase();
    const isCartao = header.includes('date,title,amount');
    const isConta = header.includes('data,valor,identificador');

    if (!isCartao && !isConta) {
        alert("❌ Formato de CSV não reconhecido. O cabeçalho não coincide com o padrão do Nubank.");
        return;
    }

    const elIgnorarPix = document.getElementById('ignorar-valor-pix');
    const valorAIgnorar = elIgnorarPix && elIgnorarPix.value ? Math.abs(parseFloat(elIgnorarPix.value)) : null;
    
    // VARIÁVEL DINÂMICA DO PAGADOR
    const pagadorDinâmico = (localStorage.getItem("configPagador") || "cesar odair").toLowerCase().trim();

    let importados = 0;
    let ignorados = 0;
    let mesclados = 0;

    for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (cols.length < 3) continue;

        let rawDate, rawAmountStr, idUnico, rawDesc;

        if (isConta) {
            rawDate = cols[0].trim();
            rawAmountStr = cols[1].trim();
            idUnico = cols[2].trim();
            rawDesc = cols[3].trim().replace(/^"|"$/g, '');
        } else {
            rawDate = cols[0].trim();
            rawDesc = cols[1].trim().replace(/^"|"$/g, '');
            rawAmountStr = cols[2].trim().replace(/^"|"$/g, '');
            const textoLimpo = rawDesc.replace(/\W/g, '').substring(0, 10);
            idUnico = `cc-${rawDate}-${rawAmountStr.replace(/\D/g, '')}-${textoLimpo}`;
        }

        let amountNumber = 0;
        if (isConta) {
            amountNumber = parseFloat(rawAmountStr);
        } else {
            const limpo = rawAmountStr.replace(/\./g, '').replace(',', '.').replace(/\s/g, '');
            amountNumber = parseFloat(limpo);
        }
        
        const valorAbsoluto = Math.abs(amountNumber);
        const descMinuscula = rawDesc.toLowerCase();

        // 🛑 REGRA 1: IGNORAR TRANSFERÊNCIAS INTERNAS
        if (descMinuscula.includes('enzo cesar')) {
            ignorados++;
            continue; 
        }

        // 🛑 REGRA 2: IGNORAR "PAGAMENTO RECEBIDO" DO CARTÃO DE CRÉDITO
        if (isCartao && (descMinuscula.includes('pagamento recebido') || descMinuscula.includes('pagamento de fatura') || descMinuscula.includes('pagamento em lotérica'))) {
            ignorados++;
            continue;
        }

        let dataFormatada = rawDate;
        if (rawDate.includes('/')) {
            const partes = rawDate.split('/');
            dataFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`;
        }

        // O SISTEMA DETETA AUTOMATICAMENTE SE ENTROU OU SAIU DINHEIRO
        let tipoGasto;
        if (isConta) tipoGasto = amountNumber < 0 ? "saldo" : "entrada"; 
        else tipoGasto = amountNumber > 0 ? "credito" : "entrada"; 

        // 🟢 O ROTEADOR VIP (Categorização sem forçar a troca de saldo/entrada)
        let categoriaGasto = "outros";
        let pularDicionario = false;

        if (descMinuscula.includes('pagamento de fatura')) {
            categoriaGasto = "fatura_cartao";
            pularDicionario = true;
        } else if (pagadorDinâmico !== "" && descMinuscula.includes(pagadorDinâmico)) {
            categoriaGasto = "familia"; 
            pularDicionario = true;
        } else if (descMinuscula.includes('resgate') || descMinuscula.includes('rendimento') || descMinuscula.includes('rdb') || descMinuscula.includes('fundo')) {
            categoriaGasto = "investimento";
            pularDicionario = true;
        } else if (descMinuscula.includes('shpp') || descMinuscula.includes('shopee') || descMinuscula.includes('aliexpress') || descMinuscula.includes('shein') || descMinuscula.includes('mercado livre')) {
            categoriaGasto = "shopping";
            pularDicionario = true;
        } else if (descMinuscula.includes('eletronicwave')) {
            categoriaGasto = "lazer";
            pularDicionario = true;
        }

        // 🟡 DICIONÁRIO GERAL
        if (!pularDicionario && typeof DICT_CATEGORIAS !== "undefined") {
            for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
                if (keywords.some(kw => descMinuscula.includes(kw))) {
                    categoriaGasto = cat;
                    break;
                }
            }
        }

        // 🛡️ TRAVAS E RECONCILIAÇÃO
        if (state.expenses.some(exp => exp.id === idUnico)) {
            ignorados++;
            continue;
        }

        const tTarget = parseDateString(dataFormatada);
        const matchIndex = state.expenses.findIndex(exp => {
            if (exp.accountId !== "nubank" && exp.accountId !== "caju") return false;
            if (exp.amount !== valorAbsoluto) return false;
            if (exp.id.startsWith("cc-") || (exp.id.length === 36 && exp.id.includes('-') && exp.id.split('-').length === 5)) return false;

            const tExp = parseDateString(exp.date);
            const diffDays = Math.abs(tTarget - tExp) / (1000 * 60 * 60 * 24);
            return diffDays === 0;
        });

        if (matchIndex !== -1) {
            state.expenses[matchIndex].id = idUnico; 
            if (!state.expenses[matchIndex].method.includes("Confirmado")) {
                state.expenses[matchIndex].method += " ✓ Confirmado";
            }
            mesclados++;
            continue; 
        }

        const novaDespesa = {
            id: idUnico,
            date: dataFormatada,
            desc: rawDesc,
            amount: valorAbsoluto,
            type: tipoGasto,
            accountId: "nubank",
            method: isCartao ? "Fatura CSV" : "Extrato",
            category: categoriaGasto
        };

        if (typeof applyExpenseEffects === 'function') applyExpenseEffects(novaDespesa);
        state.expenses.push(novaDespesa);
        importados++;
    }

    if (importados > 0 || mesclados > 0) {
        saveState();
        updateAll();
    }
    
    if (elIgnorarPix) elIgnorarPix.value = '';
    alert(`📊 Extrato Processado!\n\n✨ Novos registos: ${importados}\n🔗 Mesclados c/ Apple Pay: ${mesclados}\n🚫 Já registados/Duplicados: ${ignorados}`);
}

/* ==========================================
   2. SINCRONIZAÇÃO DO APPLE PAY (SUPABASE)
   ========================================== */
async function syncApplePayDireto() {
  let SUPABASE_KEY = localStorage.getItem("secretSupaKey");
  if (!SUPABASE_KEY) {
      alert("⚠️ A Chave do Supabase não está configurada.\nVá em Configurações Locais e salve sua chave.");
      return; 
  }

  const HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json"
  };

  try {
    const resBusca = await fetch(`${SUPABASE_URL}/rest/v1/pendentes?select=*`, { method: "GET", headers: HEADERS });
    if (!resBusca.ok) {
        alert("❌ Erro ao conectar ao Supabase. Verifique se a sua Chave está correta nas Configurações Locais.");
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
         if (!state.expenses.some(e => e.id === uniqueId)) {
            const limpo = String(exp.valor).replace(/[^\d,-]/g, '').replace(',', '.');
            const amountNumber = parseFloat(limpo) || 0;

            const nomeCartao = (exp.cartao || "").toLowerCase();
            const nomeLugar = (exp.estabelecimento || "").toLowerCase();

            let contaDestino = "nubank"; 
            let tipoGasto = "credito";
            let categoriaGasto = "outros";
            
            if (typeof DICT_CATEGORIAS !== "undefined") {
                for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
                    if (keywords.some(kw => nomeLugar.includes(kw))) {
                        categoriaGasto = cat;
                        break;
                    }
                }
            }

            if (nomeCartao.includes("sicoob")) contaDestino = findAccId("sicoob") || "sicoob";
            else if (nomeCartao.includes("itau") || nomeCartao.includes("itaú")) contaDestino = findAccId("itau") || "itau";
            else if (nomeCartao.includes("mercado") || nomeCartao.includes("mp") || nomeCartao.includes("pago")) contaDestino = "mercado_pago";
            else if (nomeCartao.includes("caju") || nomeCartao.includes("vr")) {
                contaDestino = "caju"; tipoGasto = "vr"; categoriaGasto = "alimentacao";
            }

            let dataFormatada = new Date().toISOString().slice(0,10);
            if (exp.date) {
                let dStr = exp.date.trim().substring(0, 10);
                if (dStr.includes('/')) {
                    let partes = dStr.split('/');
                    if (partes.length === 3 && partes[2].length === 4) dataFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`;
                } else if (dStr.includes('-')) dataFormatada = dStr; 
            }

            const novaDespesa = {
              id: uniqueId,
              date: dataFormatada,
              desc: exp.estabelecimento || "Apple Pay",
              amount: amountNumber,
              type: tipoGasto, 
              accountId: contaDestino,
              method: exp.cartao ? `Apple Pay (${exp.cartao})` : "Apple Pay", 
              category: categoriaGasto 
            };

            if (typeof applyExpenseEffects === 'function') applyExpenseEffects(novaDespesa);
            state.expenses.push(novaDespesa);
            importados++;
         }
         idsParaApagar.push(exp.id); 
      });
      
      if(importados > 0) { saveState(); updateAll(); }

      if (idsParaApagar.length > 0) {
        const idsFormatados = idsParaApagar.join(',');
        await fetch(`${SUPABASE_URL}/rest/v1/pendentes?id=in.(${idsFormatados})`, { method: "DELETE", headers: HEADERS });
        if(importados > 0) alert(`💸 Apple Pay Sincronizado! ${importados} nova(s) despesa(s) na conta.`);
      }
    }
  } catch (error) { console.error("Erro na sincronização do Apple Pay:", error); }
}

/* ==========================================
   3. LISTENERS DA INTERFACE E CONFIGURAÇÕES
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 3.1: Carregar Configurações Locais Salvas na Tela ---
    const elGasUrl = document.getElementById('config-gas-url');
    const elSupaKey = document.getElementById('config-supa-key');
    const elPagador = document.getElementById('config-pagador');

    if (elGasUrl) elGasUrl.value = localStorage.getItem("gasEmailUrl") || "";
    if (elSupaKey) elSupaKey.value = localStorage.getItem("secretSupaKey") || "";
    if (elPagador) elPagador.value = localStorage.getItem("configPagador") || "";

    // --- 3.2: Botão Salvar Configurações ---
    const btnSaveConfigs = document.getElementById('btn-save-configs');
    if (btnSaveConfigs) {
        btnSaveConfigs.addEventListener('click', () => {
            if (elGasUrl) localStorage.setItem("gasEmailUrl", elGasUrl.value.trim());
            if (elSupaKey) localStorage.setItem("secretSupaKey", elSupaKey.value.trim());
            if (elPagador) localStorage.setItem("configPagador", elPagador.value.trim());
            
            btnSaveConfigs.textContent = "✅ Salvo com sucesso!";
            btnSaveConfigs.style.background = "#059669";
            setTimeout(() => {
                btnSaveConfigs.innerHTML = "💾 Salvar Configurações";
                btnSaveConfigs.style.background = "#10b981";
            }, 2000);
        });
    }

    // --- 3.3: Exibir Tracking de E-mail ---
    const elSyncDate = document.getElementById('last-email-sync');
    if (elSyncDate) {
        const lastSync = localStorage.getItem("lastEmailSync");
        elSyncDate.textContent = lastSync ? lastSync : "Nunca realizado";
    }

    // --- 3.4: Botões de Sincronização Executáveis ---
    const btnSyncEmail = document.getElementById('btn-sync-email');
    if (btnSyncEmail) {
        btnSyncEmail.addEventListener('click', async () => {
            const GAS_URL = localStorage.getItem("gasEmailUrl");
            if (!GAS_URL) {
                alert("⚠️ A URL do Google Script não está configurada.\nPreencha em 'Configurações Locais' e salve.");
                return;
            }

            btnSyncEmail.textContent = "⏳ Procurando e-mail...";
            btnSyncEmail.style.opacity = "0.7";

            try {
                const resposta = await fetch(GAS_URL, { redirect: "follow" });
                const json = await resposta.json();

                if (json.status === "success") {
                    if (Array.isArray(json.data)) {
                        json.data.forEach(csvText => processarCSV(csvText));
                    } else {
                        processarCSV(json.data);
                    }
                    
                    const agora = new Date().toLocaleString('pt-PT');
                    localStorage.setItem("lastEmailSync", agora);
                    if (elSyncDate) elSyncDate.textContent = agora;
                } else {
                    alert(`ℹ️ Status: ${json.message}`);
                }
            } catch (erro) {
                alert("❌ Erro ao conectar com o Google Script. Verifique se a URL na configuração está correta.");
            } finally {
                btnSyncEmail.textContent = "📩 Puxar do E-mail";
                btnSyncEmail.style.opacity = "1";
            }
        });
    }

    const btnImportCsv = document.getElementById('btn-import-csv');
    if (btnImportCsv) {
        btnImportCsv.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                processarCSV(event.target.result);
                e.target.value = ''; 
            };
            reader.readAsText(file);
        });
    }

    const btnSyncWallet = document.getElementById('btn-sync-wallet');
    if (btnSyncWallet) btnSyncWallet.addEventListener('click', syncApplePayDireto);
});