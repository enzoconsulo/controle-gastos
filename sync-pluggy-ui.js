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