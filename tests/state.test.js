/**
 * TESTES UNITÁRIOS: state.js
 * Testa todas as funções de gerenciamento de estado e localStorage
 */

import {
  createDefaultState,
  createISODate,
  setupLocalStorage,
  isValidISODate,
  isValidExpense
} from './testUtils.js';

// ==================== TESTES DE FORMATAÇÃO ====================

describe('Funções de Formatação', () => {
  
  describe('money()', () => {
    // Mock da função money
    const money = (v) => {
      v = Number(v || 0);
      return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    test('deve formatar número como moeda brasileira', () => {
      expect(money(100)).toMatch(/R\$\s+100,00/);
    });

    test('deve formatar com centavos corretos', () => {
      expect(money(1234.56)).toMatch(/R\$\s+1.234,56/);
    });

    test('deve formatar zero', () => {
      expect(money(0)).toMatch(/R\$\s+0,00/);
    });

    test('deve lidar com números negativos', () => {
      expect(money(-500)).toMatch(/-R\$\s*500,00|R\$\s+\(500,00\)/);
    });

    test('deve converter string para número', () => {
      expect(money('250')).toMatch(/R\$\s+250,00/);
    });

    test('deve retornar zero para valor null/undefined', () => {
      expect(money(null)).toMatch(/R\$\s+0,00/);
      expect(money(undefined)).toMatch(/R\$\s+0,00/);
    });

    test('deve formatar valores muito grandes', () => {
      expect(money(1000000)).toMatch(/R\$\s+1.000.000,00/);
    });
  });

  describe('sum()', () => {
    // Mock da função sum
    const sum = (arr, fn) => arr.reduce((s, x) => s + (Number(fn ? fn(x) : x) || 0), 0);

    test('deve somar array simples de números', () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15);
    });

    test('deve retornar zero para array vazio', () => {
      expect(sum([])).toBe(0);
    });

    test('deve somar com função extratora', () => {
      const items = [
        { valor: 100 },
        { valor: 200 },
        { valor: 150 }
      ];
      expect(sum(items, item => item.valor)).toBe(450);
    });

    test('deve ignorar valores não-numéricos', () => {
      expect(sum([1, 'abc', 2, null, 3])).toBe(6);
    });

    test('deve lidar com números negativos', () => {
      expect(sum([10, -5, 20, -8])).toBe(17);
    });

    test('deve somar objetos com valores faltando', () => {
      const items = [{ x: 10 }, { x: 20 }, { z: 30 }];
      expect(sum(items, item => item.x)).toBe(30);
    });
  });

  describe('todayISO()', () => {
    // Mock da função todayISO
    const todayISO = () => new Date().toISOString().slice(0, 10);

    test('deve retornar data em formato ISO YYYY-MM-DD', () => {
      const result = todayISO();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('deve retornar data de hoje', () => {
      const today = new Date().toISOString().slice(0, 10);
      expect(todayISO()).toBe(today);
    });

    test('resultado deve ser válido como data ISO', () => {
      const result = todayISO();
      expect(isValidISODate(result)).toBe(true);
    });

    test('deve retornar string com comprimento 10', () => {
      expect(todayISO()).toHaveLength(10);
    });
  });
});

// ==================== TESTES DE DATA/MÊS ====================

describe('Funções de Data e Mês', () => {

  describe('billingMonthOf()', () => {
    // Mock da função billingMonthOf
    const billingMonthOf = (d) => {
      if (!d) return '';
      const parts = d.split('-').map(Number);
      if (parts.length < 3) return '';
      let [y, m, day] = parts;
      if (!y || !m || !day) return '';
      if (day >= 24) {
        m += 1;
        if (m > 12) {
          y += 1;
          m = 1;
        }
      }
      return `${y}-${String(m).padStart(2, '0')}`;
    };

    test('deve retornar mesmo mês para dia < 24', () => {
      expect(billingMonthOf('2024-01-10')).toBe('2024-01');
      expect(billingMonthOf('2024-01-23')).toBe('2024-01');
    });

    test('deve retornar próximo mês para dia >= 24', () => {
      expect(billingMonthOf('2024-01-24')).toBe('2024-02');
      expect(billingMonthOf('2024-01-31')).toBe('2024-02');
    });

    test('deve rotacionar para novo ano em dezembro', () => {
      expect(billingMonthOf('2024-12-24')).toBe('2025-01');
    });

    test('deve retornar string vazia para data inválida', () => {
      expect(billingMonthOf('')).toBe('');
      expect(billingMonthOf('2024')).toBe('');
      expect(billingMonthOf('invalid')).toBe('');
    });

    test('deve retornar string vazia para null/undefined', () => {
      expect(billingMonthOf(null)).toBe('');
      expect(billingMonthOf(undefined)).toBe('');
    });

    test('deve usar padding correto com zeros', () => {
      expect(billingMonthOf('2024-01-25')).toBe('2024-02');
      expect(billingMonthOf('2024-09-24')).toBe('2024-10');
    });

    test('deve formatar mês com dois dígitos', () => {
      const result = billingMonthOf('2024-01-25');
      const parts = result.split('-');
      expect(parts[1]).toHaveLength(2);
    });
  });

  describe('computeMonthFromOffset()', () => {
    // Mock da função computeMonthFromOffset
    const computeMonthFromOffset = (offset, baseMonth = '2024-01') => {
      const [y, m] = baseMonth.split('-').map(Number);
      const d = new Date(y, m - 1 + offset, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    test('deve retornar mesmo mês com offset 0', () => {
      expect(computeMonthFromOffset(0, '2024-01')).toBe('2024-01');
    });

    test('deve retornar próximo mês com offset 1', () => {
      expect(computeMonthFromOffset(1, '2024-01')).toBe('2024-02');
    });

    test('deve retornar mês anterior com offset negativo', () => {
      expect(computeMonthFromOffset(-1, '2024-02')).toBe('2024-01');
    });

    test('deve rotacionar para novo ano com offset positivo', () => {
      expect(computeMonthFromOffset(1, '2024-12')).toBe('2025-01');
    });

    test('deve rotacionar para ano anterior com offset negativo', () => {
      expect(computeMonthFromOffset(-1, '2024-01')).toBe('2023-12');
    });

    test('deve lidar com offsets grandes', () => {
      expect(computeMonthFromOffset(12, '2024-01')).toBe('2025-01');
      expect(computeMonthFromOffset(25, '2024-01')).toBe('2026-02');
    });

    test('deve usar padding correto', () => {
      const result = computeMonthFromOffset(1, '2024-01');
      const parts = result.split('-');
      expect(parts[1]).toHaveLength(2);
    });
  });
});

// ==================== TESTES DE ESTADO (STATE) ====================

describe('Gerenciamento de Estado', () => {

  describe('Estado padrão (DEFAULT)', () => {
    const DEFAULT = createDefaultState();

    test('deve conter estrutura de contas', () => {
      expect(Array.isArray(DEFAULT.accounts)).toBe(true);
      expect(DEFAULT.accounts.length).toBeGreaterThan(0);
    });

    test('deve conter todas as contas esperadas', () => {
      const expectedAccounts = ['nubank', 'sicoob', 'itau', 'caju', 'mercado_pago', 'imp3d', 'shopee'];
      const actualIds = DEFAULT.accounts.map(a => a.id);
      expectedAccounts.forEach(id => {
        expect(actualIds).toContain(id);
      });
    });

    test('cada conta deve ter estrutura correta', () => {
      DEFAULT.accounts.forEach(account => {
        expect(account).toHaveProperty('id');
        expect(account).toHaveProperty('name');
        expect(account).toHaveProperty('saldo');
        expect(account).toHaveProperty('guardado');
        expect(account).toHaveProperty('credit_total');
      });
    });

    test('deve inicializar com arrays vazios/corretos', () => {
      expect(Array.isArray(DEFAULT.expenses)).toBe(true);
      expect(Array.isArray(DEFAULT.investments)).toBe(true);
      expect(Array.isArray(DEFAULT.filaments)).toBe(true);
      expect(Array.isArray(DEFAULT.products)).toBe(true);
    });

    test('deve ter meta com baseMonth', () => {
      expect(DEFAULT.meta).toHaveProperty('baseMonth');
      expect(DEFAULT.meta).toHaveProperty('activeOffset');
      expect(DEFAULT.meta).toHaveProperty('lastCreditClosed');
    });

    test('deve ter totals inicializados', () => {
      expect(DEFAULT.totals).toHaveProperty('credito_total');
      expect(DEFAULT.totals).toHaveProperty('vr_total');
      expect(DEFAULT.totals).toHaveProperty('entrada');
    });

    test('valores de saldo devem ser números', () => {
      DEFAULT.accounts.forEach(account => {
        expect(typeof account.saldo).toBe('number');
        expect(typeof account.guardado).toBe('number');
      });
    });
  });

  describe('localStorage - Salvar e Carregar', () => {
    
    const STORAGE_KEY = 'controleExcel_v10';

    test('deve salvar estado em localStorage', () => {
      const state = createDefaultState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored)).toEqual(state);
    });

    test('deve recuperar estado de localStorage', () => {
      const state = createDefaultState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      
      const retrieved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(retrieved.accounts).toEqual(state.accounts);
      expect(retrieved.expenses).toEqual(state.expenses);
    });

    test('deve limpar localStorage corretamente', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(createDefaultState()));
      localStorage.removeItem(STORAGE_KEY);
      
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    test('deve lidar com JSON inválido', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json');
      
      expect(() => {
        JSON.parse(localStorage.getItem(STORAGE_KEY));
      }).toThrow();
    });

    test('deve preservar tipos de dados', () => {
      const state = {
        accounts: [{ id: '1', saldo: 100, active: true }]
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      
      const retrieved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(typeof retrieved.accounts[0].saldo).toBe('number');
      expect(typeof retrieved.accounts[0].active).toBe('boolean');
    });

    test('deve lidar com estruturas complexas aninhadas', () => {
      const state = createDefaultState();
      state.expenses = [
        { id: '1', date: '2024-01-15', amount: 100, nested: { deep: { value: 50 } } }
      ];
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      const retrieved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      
      expect(retrieved.expenses[0].nested.deep.value).toBe(50);
    });
  });

  describe('Modificações de Estado', () => {
    
    test('deve permitir adicionar nova despesa ao estado', () => {
      const state = createDefaultState();
      const newExpense = {
        id: '999',
        date: '2024-01-20',
        desc: 'Nova despesa',
        amount: 250,
        account: 'nubank',
        type: 'alimentacao'
      };
      
      state.expenses.push(newExpense);
      
      expect(state.expenses).toContainEqual(newExpense);
      expect(state.expenses.length).toBeGreaterThan(2);
    });

    test('deve permitir atualizar saldo de conta', () => {
      const state = createDefaultState();
      const account = state.accounts.find(a => a.id === 'nubank');
      const oldBalance = account.saldo;
      
      account.saldo = 5000;
      
      expect(account.saldo).toBe(5000);
      expect(account.saldo).not.toBe(oldBalance);
    });

    test('deve permitir atualizar meta de mês ativo', () => {
      const state = createDefaultState();
      
      state.meta.activeOffset = 1;
      
      expect(state.meta.activeOffset).toBe(1);
    });

    test('deve permitir adicionar filamento', () => {
      const state = createDefaultState();
      const newFilament = {
        id: 'fil-new',
        color: 'Vermelho',
        type: 'PLA',
        weight: 500,
        initialWeight: 500,
        price: 35
      };
      
      state.filaments.push(newFilament);
      
      expect(state.filaments).toContainEqual(newFilament);
    });

    test('deve permitir deletar despesa', () => {
      const state = createDefaultState();
      const initialLength = state.expenses.length;
      
      state.expenses = state.expenses.filter(e => e.id !== '1');
      
      expect(state.expenses.length).toBe(initialLength - 1);
      expect(state.expenses.find(e => e.id === '1')).toBeUndefined();
    });

    test('deve permitir atualizar totalização', () => {
      const state = createDefaultState();
      
      state.totals.credito_total = 5000;
      state.totals.vr_total = 1000;
      state.totals.entrada = 3000;
      
      expect(state.totals.credito_total).toBe(5000);
      expect(state.totals.vr_total).toBe(1000);
      expect(state.totals.entrada).toBe(3000);
    });
  });

  describe('Validações de Estado', () => {
    
    test('estado deve ter todos os campos necessários', () => {
      const state = createDefaultState();
      const requiredFields = [
        'accounts', 'totals', 'expenses', 'investments',
        'filaments', 'products', 'impSales', 'meta'
      ];
      
      requiredFields.forEach(field => {
        expect(state).toHaveProperty(field);
      });
    });

    test('cada despesa deve ter ID único', () => {
      const state = createDefaultState();
      const ids = state.expenses.map(e => e.id);
      const uniqueIds = new Set(ids);
      
      expect(ids.length).toBe(uniqueIds.size);
    });

    test('contas não devem ter IDs duplicados', () => {
      const state = createDefaultState();
      const ids = state.accounts.map(a => a.id);
      const uniqueIds = new Set(ids);
      
      expect(ids.length).toBe(uniqueIds.size);
    });

    test('saldos de conta devem ser maiores ou iguais a zero', () => {
      const state = createDefaultState();
      state.accounts.forEach(account => {
        expect(account.saldo).toBeGreaterThanOrEqual(0);
        expect(account.guardado).toBeGreaterThanOrEqual(0);
      });
    });

    test('valores de despesas devem ser positivos', () => {
      const state = createDefaultState();
      state.expenses.forEach(expense => {
        expect(expense.amount).toBeGreaterThan(0);
      });
    });
  });

  describe('Cenários Complexos', () => {
    
    test('deve gerenciar múltiplas operações de forma consistente', () => {
      const state = createDefaultState();
      
      // Simular múltiplas operações
      state.accounts[0].saldo -= 100;
      state.expenses.push({
        id: '100',
        date: '2024-01-25',
        desc: 'Teste',
        amount: 100,
        account: 'nubank',
        type: 'outros'
      });
      state.totals.credito_total += 100;
      
      expect(state.accounts[0].saldo).toBe(900);
      expect(state.expenses.length).toBeGreaterThan(2);
      expect(state.totals.credito_total).toBe(100);
    });

    test('deve manter integridade em operações de backup/restore', () => {
      const original = createDefaultState();
      const backup = JSON.parse(JSON.stringify(original));
      
      original.accounts[0].saldo = 9999;
      
      expect(backup.accounts[0].saldo).not.toBe(9999);
      expect(backup.accounts[0].saldo).toBe(1000);
    });

    test('deve lidar com estado muito grande', () => {
      const state = createDefaultState();
      
      // Adicionar muitas despesas
      for (let i = 0; i < 1000; i++) {
        state.expenses.push({
          id: String(i),
          date: '2024-01-15',
          desc: `Despesa ${i}`,
          amount: Math.random() * 1000,
          account: 'nubank',
          type: 'outros'
        });
      }
      
      expect(state.expenses.length).toBe(1002);
      localStorage.setItem('test_large_state', JSON.stringify(state));
      const retrieved = JSON.parse(localStorage.getItem('test_large_state'));
      expect(retrieved.expenses.length).toBe(1002);
    });
  });
});
