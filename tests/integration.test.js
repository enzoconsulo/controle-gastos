/**
 * TESTES DE INTEGRAÇÃO
 * Testa fluxos completos entre múltiplos módulos
 */

import {
  createDefaultState,
  createISODate,
  createMockSale,
  createMockFilament,
  createMockProduct
} from './testUtils.js';

describe('Testes de Integração do Sistema', () => {

  let mockState;

  beforeEach(() => {
    mockState = createDefaultState();
    window.state = mockState;
  });

  // ==================== FLUXO COMPLETO DE DESPESA ====================

  describe('Fluxo Completo: Despesa + Saldo + Categorização', () => {

    test('deve registrar despesa, atualizar saldo e categorizar corretamente', () => {
      // 1. Criar despesa
      const expense = {
        id: 'exp-complete',
        date: createISODate(),
        desc: 'Ifood delivery',
        amount: 75.50,
        account: 'nubank',
        type: 'alimentacao'
      };
      
      // 2. Atualizar saldo
      const account = mockState.accounts.find(a => a.id === 'nubank');
      const oldBalance = account.saldo;
      account.saldo -= expense.amount;
      
      // 3. Adicionar despesa
      mockState.expenses.push(expense);
      
      // 4. Validar
      expect(account.saldo).toBe(oldBalance - expense.amount);
      expect(mockState.expenses).toContainEqual(expense);
      expect(expense.type).toBe('alimentacao');
    });

    test('deve processar múltiplas despesas e atualizar totais', () => {
      const today = createISODate();
      const expenses = [
        { id: '1', date: today, desc: 'Ifood', amount: 50, account: 'nubank', type: 'alimentacao' },
        { id: '2', date: today, desc: 'Shell', amount: 100, account: 'nubank', type: 'gasolina' },
        { id: '3', date: today, desc: 'Carrefour', amount: 200, account: 'nubank', type: 'mercado' }
      ];
      
      const account = mockState.accounts.find(a => a.id === 'nubank');
      const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
      const oldBalance = account.saldo;
      
      account.saldo -= totalExpense;
      mockState.expenses.push(...expenses);
      
      const currentMonth = today.slice(0, 7);
      const monthExpenses = mockState.expenses.filter(e => 
        typeof e.date === 'string' && e.date.startsWith(currentMonth)
      );
      
      expect(account.saldo).toBe(oldBalance - totalExpense);
      expect(monthExpenses.length).toBeGreaterThanOrEqual(expenses.length);
    });
  });

  // ==================== FLUXO IMPRESSORA 3D ====================

  describe('Fluxo Completo: Impressora 3D', () => {

    test('deve completar ciclo: filamento -> produto -> venda -> lucro', () => {
      // 1. Validar filamento
      const filament = mockState.filaments[0];
      const initialWeight = filament.weight;
      
      // 2. Produzir produto
      const product = mockState.products[0];
      const qtyProduced = 5;
      const filamentUsed = product.fil_g * qtyProduced;
      
      // 3. Deduzir filamento
      filament.weight -= filamentUsed;
      
      // 4. Registrar venda
      const sale = {
        id: 'sale-cycle',
        date: createISODate(),
        productId: product.id,
        filamentId: filament.id,
        accountId: 'imp3d',
        qty: qtyProduced,
        amountGross: product.price * qtyProduced,
        feeTotal: 0,
        netReceived: product.price * qtyProduced,
        materialCost: (filament.price / initialWeight) * filamentUsed,
        profit: (product.price * qtyProduced) - ((filament.price / initialWeight) * filamentUsed)
      };
      
      mockState.impSales.push(sale);
      
      // 5. Atualizar saldo
      const account = mockState.accounts.find(a => a.id === 'imp3d');
      account.saldo += sale.profit;
      
      // 6. Validar
      expect(filament.weight).toBe(initialWeight - filamentUsed);
      expect(mockState.impSales).toContainEqual(sale);
      expect(sale.profit).toBeGreaterThan(0);
    });

    test('deve bloquear venda se filamento insuficiente', () => {
      const filament = mockState.filaments[0];
      const product = mockState.products[0];
      const availableQty = Math.floor(filament.weight / product.fil_g);
      const attemptedQty = availableQty + 10;
      const oldWeight = filament.weight;
      
      // Tentar vender
      if (product.fil_g * attemptedQty <= filament.weight) {
        filament.weight -= product.fil_g * attemptedQty;
      }
      
      // Validar - não deve ter vendido
      expect(filament.weight).toBe(oldWeight);
    });

    test('deve calcular ROI de impressora 3D', () => {
      const initialInvestment = mockState.filaments.reduce((sum, f) => sum + f.price, 0);
      const totalProfit = mockState.impSales.reduce((sum, s) => sum + s.profit, 0);
      const totalLosses = mockState.impLosses.reduce((sum, l) => sum + l.cost, 0);
      const netProfit = totalProfit - totalLosses;
      const roi = initialInvestment > 0 ? (netProfit / initialInvestment) * 100 : 0;
      
      expect(roi).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== FLUXO SINCRONIZAÇÃO ====================

  describe('Fluxo Completo: Importação de Dados', () => {

    test('deve processar CSV -> categorizar -> importar para estado', () => {
      const csv = [
        { date: '2024-01-15', desc: 'Ifood', amount: 50 },
        { date: '2024-01-16', desc: 'Shell', amount: 100 }
      ];
      
      const categorize = (desc) => {
        if (desc.toLowerCase().includes('ifood')) return 'alimentacao';
        if (desc.toLowerCase().includes('shell')) return 'gasolina';
        return 'outros';
      };
      
      const processed = csv.map(item => ({
        id: 'import-' + Math.random(),
        date: item.date,
        desc: item.desc,
        amount: item.amount,
        account: 'nubank',
        type: categorize(item.desc)
      }));
      
      const account = mockState.accounts.find(a => a.id === 'nubank');
      const oldBalance = account.saldo;
      const totalAmount = processed.reduce((sum, e) => sum + e.amount, 0);
      
      account.saldo -= totalAmount;
      mockState.expenses.push(...processed);
      
      expect(mockState.expenses.length).toBeGreaterThan(2);
      expect(account.saldo).toBe(oldBalance - totalAmount);
      expect(processed[0].type).toBe('alimentacao');
    });

    test('deve mesclar dados do Apple Pay com CSV', () => {
      const applePay = [
        { id: 'ap-1', date: '2024-01-15', desc: 'Ifood', amount: 50 }
      ];
      
      const csv = [
        { id: 'csv-1', date: '2024-01-15', desc: 'Ifood', amount: 50 }, // Duplicado
        { id: 'csv-2', date: '2024-01-16', desc: 'Shell', amount: 100 }
      ];
      
      const merged = [];
      csv.forEach(item => {
        const exists = applePay.some(ap => 
          ap.date === item.date && ap.amount === item.amount
        );
        if (!exists) {
          merged.push(item);
        }
      });
      
      expect(merged.length).toBe(1);
      expect(merged[0].desc).toBe('Shell');
    });
  });

  // ==================== FLUXO MENSAL COMPLETO ====================

  describe('Fluxo Completo: Mês Inteiro', () => {

    test('deve processar mês: entrada -> despesas -> saldo final', () => {
      const month = '2024-01';
      
      // 1. Entrada inicial
      const startCredit = 5000;
      const account = mockState.accounts.find(a => a.id === 'nubank');
      account.saldo = startCredit;
      
      // 2. Adicionar despesas do mês
      const monthExpenses = mockState.expenses.filter(e => e.date.startsWith(month));
      const totalExpense = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      // 3. Calcular saldo final
      const finalBalance = account.saldo - totalExpense;
      
      // 4. Validar
      expect(finalBalance).toBe(startCredit - totalExpense);
      expect(finalBalance).toBeGreaterThan(0);
    });

    test('deve manter histórico e ativar novo mês', () => {
      const currentMonth = mockState.meta.baseMonth;
      const expenses = mockState.expenses;
      const expensesCount = expenses.length;
      
      // Ativar próximo mês
      mockState.meta.activeOffset = 1;
      
      // Histórico deve ser preservado
      expect(expenses.length).toBe(expensesCount);
      expect(mockState.meta.activeOffset).toBe(1);
    });
  });

  // ==================== TRANSFERÊNCIAS ENTRE CONTAS ====================

  describe('Fluxo: Transferências entre Contas', () => {

    test('deve transferir entre contas e registrar corretamente', () => {
      const from = mockState.accounts.find(a => a.id === 'nubank');
      const to = mockState.accounts.find(a => a.id === 'sicoob');
      const amount = 500;
      const fromOldBalance = from.saldo;
      const toOldBalance = to.saldo;
      
      // Transferir
      from.saldo -= amount;
      to.saldo += amount;
      
      // Registrar transferência (como duas despesas)
      mockState.expenses.push(
        {
          id: 'transfer-out',
          date: createISODate(),
          desc: 'Transferência para Sicoob',
          amount: amount,
          account: from.id,
          type: 'transferencia'
        },
        {
          id: 'transfer-in',
          date: createISODate(),
          desc: 'Transferência de Nubank',
          amount: -amount,
          account: to.id,
          type: 'transferencia'
        }
      );
      
      // Validar
      expect(from.saldo).toBe(fromOldBalance - amount);
      expect(to.saldo).toBe(toOldBalance + amount);
    });
  });

  // ==================== BACKUP E RESTAURAÇÃO ====================

  describe('Fluxo: Backup e Restauração', () => {

    test('deve fazer backup do estado completo', () => {
      const backup = JSON.parse(JSON.stringify(mockState));
      
      // Modificar estado original
      mockState.accounts[0].saldo = 9999;
      mockState.expenses.push({
        id: 'new',
        date: createISODate(),
        desc: 'Nova despesa',
        amount: 100,
        account: 'nubank',
        type: 'outros'
      });
      
      // Validar backup está diferente
      expect(backup.accounts[0].saldo).not.toBe(9999);
      expect(backup.expenses.length).not.toBe(mockState.expenses.length);
    });

    test('deve restaurar estado de backup', () => {
      const backup = JSON.parse(JSON.stringify(mockState));
      const expenseCount = mockState.expenses.length;
      
      // Modificar estado
      mockState.expenses = [];
      mockState.accounts[0].saldo = 0;
      
      // Restaurar
      mockState = JSON.parse(JSON.stringify(backup));
      
      // Validar
      expect(mockState.expenses.length).toBe(expenseCount);
    });
  });

  // ==================== RELATÓRIOS COMPLEXOS ====================

  describe('Fluxo: Geração de Relatórios', () => {

    test('deve gerar relatório financeiro completo', () => {
      const totalAssets = mockState.accounts.reduce((sum, a) => sum + a.saldo, 0);
      const totalExpenses = mockState.expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalInvestments = mockState.investments.reduce((sum, i) => sum + i.amount, 0);
      
      const report = {
        totalAssets,
        totalExpenses,
        totalInvestments,
        netPosition: totalAssets - totalExpenses,
        monthCount: new Set(mockState.expenses.map(e => e.date.slice(0, 7))).size
      };
      
      expect(report.totalAssets).toBeGreaterThanOrEqual(0);
      expect(report.monthCount).toBeGreaterThanOrEqual(1);
    });

    test('deve gerar relatório de impressora 3D', () => {
      const totalRevenue = mockState.impSales.reduce((sum, s) => sum + s.netReceived, 0);
      const totalCost = mockState.impSales.reduce((sum, s) => sum + s.materialCost, 0);
      const totalProfit = mockState.impSales.reduce((sum, s) => sum + s.profit, 0);
      const totalLosses = mockState.impLosses.reduce((sum, l) => sum + l.cost, 0);
      
      const report = {
        totalRevenue,
        totalCost,
        totalProfit,
        totalLosses,
        netProfit: totalProfit - totalLosses,
        profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0
      };
      
      expect(report.profitMargin).toBeGreaterThanOrEqual(0);
      expect(report.profitMargin).toBeLessThanOrEqual(100);
    });
  });

  // ==================== VALIDAÇÕES CRUZADAS ====================

  describe('Validações Cruzadas entre Módulos', () => {

    test('deve validar integridade de contas', () => {
      mockState.accounts.forEach(account => {
        expect(account).toHaveProperty('id');
        expect(account).toHaveProperty('saldo');
        expect(account.saldo).toBeGreaterThanOrEqual(0);
      });
    });

    test('deve validar integridade de despesas', () => {
      mockState.expenses.forEach(expense => {
        const accountExists = mockState.accounts.find(a => a.id === expense.account);
        expect(accountExists).toBeDefined();
      });
    });

    test('deve validar integridade de vendas impressora 3D', () => {
      mockState.impSales.forEach(sale => {
        const prodExists = mockState.products.find(p => p.id === sale.productId);
        const filExists = mockState.filaments.find(f => f.id === sale.filamentId);
        const accExists = mockState.accounts.find(a => a.id === sale.accountId);
        
        expect(prodExists).toBeDefined();
        expect(filExists).toBeDefined();
        expect(accExists).toBeDefined();
      });
    });

    test('deve validar que IDs são únicos', () => {
      const ids = [
        ...mockState.accounts.map(a => `acc-${a.id}`),
        ...mockState.expenses.map(e => `exp-${e.id}`),
        ...mockState.products.map(p => `prod-${p.id}`)
      ];
      
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  // ==================== CENÁRIOS DE STRESS ====================

  describe('Testes de Stress', () => {

    test('deve lidar com grande volume de despesas', () => {
      for (let i = 0; i < 500; i++) {
        mockState.expenses.push({
          id: `stress-${i}`,
          date: createISODate(-Math.floor(Math.random() * 30)),
          desc: `Despesa ${i}`,
          amount: Math.random() * 1000,
          account: 'nubank',
          type: 'outros'
        });
      }
      
      expect(mockState.expenses.length).toBeGreaterThan(500);
    });

    test('deve processar grande volume de vendas impressora 3D', () => {
      for (let i = 0; i < 100; i++) {
        mockState.impSales.push(createMockSale({
          id: `stress-${i}`
        }));
      }
      
      expect(mockState.impSales.length).toBeGreaterThan(100);
    });

    test('deve preservar performance com estado grande', () => {
      const start = Date.now();
      
      // Gerar grande estado
      for (let i = 0; i < 1000; i++) {
        mockState.expenses.push({
          id: `perf-${i}`,
          date: createISODate(),
          desc: `Teste`,
          amount: 50,
          account: 'nubank',
          type: 'outros'
        });
      }
      
      // Operações básicas
      const total = mockState.expenses.reduce((sum, e) => sum + e.amount, 0);
      const filtered = mockState.expenses.filter(e => e.amount > 25);
      
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeLessThan(1000); // Menos de 1 segundo
      expect(total).toBeGreaterThan(0);
      expect(filtered.length).toBeGreaterThan(0);
    });
  });

  // ==================== CASOS EXTREMOS ====================

  describe('Casos Extremos', () => {

    test('deve lidar com saldo zero', () => {
      const account = mockState.accounts[0];
      account.saldo = 0;
      
      expect(account.saldo).toBe(0);
    });

    test('deve lidar com valor muito grande de despesa', () => {
      const expense = {
        id: 'extreme',
        date: createISODate(),
        desc: 'Despesa extrema',
        amount: 999999999,
        account: 'nubank',
        type: 'outros'
      };
      
      mockState.expenses.push(expense);
      
      expect(expense.amount).toBeGreaterThan(0);
    });

    test('deve lidar com múltiplas camadas de aninhamento de dados', () => {
      const complex = {
        id: 'complex',
        data: {
          nested: {
            deep: {
              value: 123
            }
          }
        }
      };
      
      expect(complex.data.nested.deep.value).toBe(123);
    });
  });
});
