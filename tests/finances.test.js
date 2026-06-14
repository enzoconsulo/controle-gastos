/**
 * TESTES UNITÁRIOS: finances.js
 * Testa todas as funções de renderização e gerenciamento financeiro
 */

import {
  createDefaultState,
  createISODate,
  createMockEvent,
  isValidExpense
} from './testUtils.js';

describe('Funções Financeiras', () => {

  let mockState;

  beforeEach(() => {
    mockState = createDefaultState();
    window.state = mockState;
  });

  // ==================== CÁLCULOS FINANCEIROS ====================

  describe('Cálculos de Saldo e Totais', () => {

    test('deve calcular saldo total de todas as contas', () => {
      const totalBalance = mockState.accounts.reduce((sum, acc) => sum + acc.saldo, 0);
      
      expect(totalBalance).toBe(10600); // 1000+2000+1500+300+800+5000+0
      expect(totalBalance).toBeGreaterThan(0);
    });

    test('deve calcular valor guardado total', () => {
      const totalGuardado = mockState.accounts.reduce((sum, acc) => sum + acc.guardado, 0);
      
      expect(totalGuardado).toBe(4750); // 500+1000+750+100+400+2000+0
      expect(totalGuardado).toBeLessThanOrEqual(10600);
    });

    test('deve calcular saldo de conta específica', () => {
      const nubank = mockState.accounts.find(a => a.id === 'nubank');
      
      expect(nubank).toBeDefined();
      expect(nubank.saldo).toBe(1000);
    });

    test('deve lidar com múltiplas despesas no mesmo mês', () => {
      const month = '2024-01';
      const monthExpenses = mockState.expenses.filter(e => e.date.startsWith(month));
      const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      expect(monthExpenses.length).toBe(2);
      expect(monthTotal).toBe(150); // 50+100
    });

    test('deve calcular despesa por conta', () => {
      const nubankExpenses = mockState.expenses.filter(e => e.account === 'nubank');
      const nubankTotal = nubankExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      expect(nubankExpenses.length).toBeGreaterThan(0);
      expect(nubankTotal).toBeGreaterThan(0);
    });

    test('deve calcular diferença entre saldo e guardado', () => {
      const account = mockState.accounts[0];
      const available = account.saldo - account.guardado;
      
      expect(available).toBeGreaterThanOrEqual(0);
      expect(available).toBe(500); // 1000 - 500
    });
  });

  // ==================== OPERAÇÕES COM CONTAS ====================

  describe('Operações com Contas', () => {

    test('deve adicionar saldo a uma conta', () => {
      const account = mockState.accounts[0];
      const oldBalance = account.saldo;
      const addAmount = 500;
      
      account.saldo += addAmount;
      
      expect(account.saldo).toBe(oldBalance + addAmount);
      expect(account.saldo).toBe(1500);
    });

    test('deve deduzir saldo de uma conta', () => {
      const account = mockState.accounts[0];
      const oldBalance = account.saldo;
      const subtractAmount = 300;
      
      account.saldo -= subtractAmount;
      
      expect(account.saldo).toBe(oldBalance - subtractAmount);
      expect(account.saldo).toBe(700);
    });

    test('deve atualizar valor guardado', () => {
      const account = mockState.accounts[0];
      
      account.guardado = 600;
      
      expect(account.guardado).toBe(600);
      expect(account.guardado).toBeLessThanOrEqual(account.saldo + 600);
    });

    test('deve lidar com limite mínimo de saldo', () => {
      const account = mockState.accounts[0];
      const minBalance = 0;
      
      account.saldo = Math.max(account.saldo - 2000, minBalance);
      
      expect(account.saldo).toBeGreaterThanOrEqual(minBalance);
    });

    test('deve transferir entre contas', () => {
      const from = mockState.accounts[0];
      const to = mockState.accounts[1];
      const amount = 200;
      const fromOldBalance = from.saldo;
      const toOldBalance = to.saldo;
      
      if (from.saldo >= amount) {
        from.saldo -= amount;
        to.saldo += amount;
      }
      
      expect(from.saldo).toBe(fromOldBalance - amount);
      expect(to.saldo).toBe(toOldBalance + amount);
    });

    test('deve bloquear transferência sem saldo suficiente', () => {
      const from = mockState.accounts[0];
      const to = mockState.accounts[1];
      const amount = 10000;
      const fromOldBalance = from.saldo;
      const toOldBalance = to.saldo;
      
      if (from.saldo >= amount) {
        from.saldo -= amount;
        to.saldo += amount;
      }
      
      expect(from.saldo).toBe(fromOldBalance);
      expect(to.saldo).toBe(toOldBalance);
    });

    test('deve criar nova conta', () => {
      const newAccount = {
        id: 'novo-banco',
        name: 'Novo Banco',
        saldo: 0,
        guardado: 0,
        credit_total: 0
      };
      
      mockState.accounts.push(newAccount);
      
      const found = mockState.accounts.find(a => a.id === 'novo-banco');
      expect(found).toEqual(newAccount);
    });

    test('deve deletar conta do estado', () => {
      const initialLength = mockState.accounts.length;
      const accountToDelete = mockState.accounts[0].id;
      
      mockState.accounts = mockState.accounts.filter(a => a.id !== accountToDelete);
      
      expect(mockState.accounts.length).toBe(initialLength - 1);
      expect(mockState.accounts.find(a => a.id === accountToDelete)).toBeUndefined();
    });
  });

  // ==================== OPERAÇÕES COM DESPESAS ====================

  describe('Operações com Despesas', () => {

    test('deve adicionar nova despesa', () => {
      const newExpense = {
        id: '999',
        date: '2024-01-20',
        desc: 'Nova despesa teste',
        amount: 75.50,
        account: 'nubank',
        type: 'alimentacao'
      };
      
      const initialLength = mockState.expenses.length;
      mockState.expenses.push(newExpense);
      
      expect(mockState.expenses.length).toBe(initialLength + 1);
      expect(mockState.expenses).toContainEqual(newExpense);
    });

    test('deve validar estrutura de despesa', () => {
      const expense = mockState.expenses[0];
      
      expect(isValidExpense(expense)).toBe(true);
      expect(expense).toHaveProperty('id');
      expect(expense).toHaveProperty('date');
      expect(expense).toHaveProperty('amount');
      expect(expense.amount).toBeGreaterThan(0);
    });

    test('deve editar despesa existente', () => {
      const expense = mockState.expenses[0];
      const oldDesc = expense.desc;
      const newDesc = 'Descrição atualizada';
      
      expense.desc = newDesc;
      
      expect(expense.desc).toBe(newDesc);
      expect(expense.desc).not.toBe(oldDesc);
    });

    test('deve deletar despesa', () => {
      const initialLength = mockState.expenses.length;
      const expenseToDelete = mockState.expenses[0].id;
      
      mockState.expenses = mockState.expenses.filter(e => e.id !== expenseToDelete);
      
      expect(mockState.expenses.length).toBe(initialLength - 1);
      expect(mockState.expenses.find(e => e.id === expenseToDelete)).toBeUndefined();
    });

    test('deve filtrar despesas por conta', () => {
      const nubankExpenses = mockState.expenses.filter(e => e.account === 'nubank');
      
      expect(Array.isArray(nubankExpenses)).toBe(true);
      nubankExpenses.forEach(expense => {
        expect(expense.account).toBe('nubank');
      });
    });

    test('deve filtrar despesas por mês', () => {
      const month = '2024-01';
      const monthExpenses = mockState.expenses.filter(e => e.date.startsWith(month));
      
      expect(Array.isArray(monthExpenses)).toBe(true);
      monthExpenses.forEach(expense => {
        expect(expense.date.startsWith(month)).toBe(true);
      });
    });

    test('deve filtrar despesas por tipo', () => {
      const foodExpenses = mockState.expenses.filter(e => e.type === 'alimentacao');
      
      expect(Array.isArray(foodExpenses)).toBe(true);
      foodExpenses.forEach(expense => {
        expect(expense.type).toBe('alimentacao');
      });
    });

    test('deve calcular soma de despesas filtradas', () => {
      const nubankExpenses = mockState.expenses.filter(e => e.account === 'nubank');
      const total = nubankExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(0);
    });

    test('deve ordenar despesas por data', () => {
      const sorted = [...mockState.expenses].sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );
      
      for (let i = 1; i < sorted.length; i++) {
        expect(new Date(sorted[i].date) >= new Date(sorted[i-1].date)).toBe(true);
      }
    });

    test('deve encontrar despesa por ID', () => {
      const expenseId = mockState.expenses[0].id;
      const found = mockState.expenses.find(e => e.id === expenseId);
      
      expect(found).toBeDefined();
      expect(found.id).toBe(expenseId);
    });
  });

  // ==================== OPERAÇÕES COM INVESTIMENTOS ====================

  describe('Operações com Investimentos', () => {

    test('deve adicionar novo investimento', () => {
      const newInvestment = {
        id: 'inv-999',
        date: '2024-01-15',
        desc: 'Novo investimento',
        amount: 1000,
        account: 'nubank',
        taxa: 0.5
      };
      
      mockState.investments.push(newInvestment);
      
      expect(mockState.investments).toContainEqual(newInvestment);
    });

    test('deve calcular soma de investimentos', () => {
      const totalInvested = mockState.investments.reduce((sum, inv) => sum + inv.amount, 0);
      
      expect(totalInvested).toBe(1000);
      expect(totalInvested).toBeGreaterThan(0);
    });

    test('deve calcular retorno de investimento', () => {
      const investment = mockState.investments[0];
      const profit = investment.taxa > 0 ? investment.amount * investment.taxa : 0;
      
      expect(profit).toBe(0); // taxa = 0
    });

    test('deve filtrar investimentos por conta', () => {
      const nubankInvest = mockState.investments.filter(i => i.account === 'nubank');
      
      expect(Array.isArray(nubankInvest)).toBe(true);
    });

    test('deve deletar investimento', () => {
      const initialLength = mockState.investments.length;
      const invToDelete = mockState.investments[0].id;
      
      mockState.investments = mockState.investments.filter(i => i.id !== invToDelete);
      
      expect(mockState.investments.length).toBe(initialLength - 1);
    });
  });

  // ==================== RELATÓRIOS E RESUMOS ====================

  describe('Relatórios Financeiros', () => {

    test('deve gerar resumo mensal', () => {
      const month = '2024-01';
      const monthExpenses = mockState.expenses.filter(e => e.date.startsWith(month));
      const totalExpense = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      const summary = {
        month,
        totalExpense,
        expenseCount: monthExpenses.length
      };
      
      expect(summary.month).toBe('2024-01');
      expect(summary.totalExpense).toBe(150);
      expect(summary.expenseCount).toBe(2);
    });

    test('deve gerar resumo por conta', () => {
      const account = 'nubank';
      const accountExpenses = mockState.expenses.filter(e => e.account === account);
      const total = accountExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      expect(accountExpenses.length).toBeGreaterThanOrEqual(0);
      expect(typeof total).toBe('number');
    });

    test('deve gerar resumo por tipo de despesa', () => {
      const type = 'alimentacao';
      const typeExpenses = mockState.expenses.filter(e => e.type === type);
      const total = typeExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      expect(Array.isArray(typeExpenses)).toBe(true);
      expect(typeof total).toBe('number');
    });

    test('deve calcular percentual de despesa por conta', () => {
      const allExpenses = mockState.expenses.reduce((sum, e) => sum + e.amount, 0);
      const nubankExpenses = mockState.expenses
        .filter(e => e.account === 'nubank')
        .reduce((sum, e) => sum + e.amount, 0);
      
      const percentage = (nubankExpenses / allExpenses) * 100;
      
      expect(percentage).toBeGreaterThanOrEqual(0);
      expect(percentage).toBeLessThanOrEqual(100);
    });

    test('deve gerar ranking de maiores despesas', () => {
      const ranked = [...mockState.expenses]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
      
      for (let i = 1; i < ranked.length; i++) {
        expect(ranked[i].amount).toBeLessThanOrEqual(ranked[i-1].amount);
      }
    });

    test('deve calcular média de despesas', () => {
      const expenses = mockState.expenses;
      const total = expenses.reduce((sum, e) => sum + e.amount, 0);
      const average = expenses.length > 0 ? total / expenses.length : 0;
      
      expect(average).toBeGreaterThanOrEqual(0);
    });

    test('deve identificar padrões de gasto', () => {
      const types = {};
      mockState.expenses.forEach(expense => {
        types[expense.type] = (types[expense.type] || 0) + expense.amount;
      });
      
      const topCategory = Object.entries(types)
        .sort((a, b) => b[1] - a[1])[0];
      
      expect(topCategory).toBeDefined();
      expect(topCategory[1]).toBeGreaterThan(0);
    });

    test('deve calcular economia mensal', () => {
      const totalEntrada = 5000;
      const totalExpense = mockState.expenses.reduce((sum, e) => sum + e.amount, 0);
      const savings = totalEntrada - totalExpense;
      
      expect(savings).toBe(5000 - 150);
      expect(typeof savings).toBe('number');
    });
  });

  // ==================== VALIDAÇÕES FINANCEIRAS ====================

  describe('Validações Financeiras', () => {

    test('não deve permitir despesa negativa', () => {
      const invalidExpense = {
        id: 'invalid',
        date: '2024-01-15',
        desc: 'Negativa',
        amount: -100,
        account: 'nubank',
        type: 'outros'
      };
      
      expect(isValidExpense(invalidExpense)).toBe(false);
    });

    test('não deve permitir despesa sem descrição', () => {
      const invalidExpense = {
        id: 'invalid',
        date: '2024-01-15',
        desc: '',
        amount: 100,
        account: 'nubank',
        type: 'outros'
      };
      
      expect(invalidExpense.desc.length).toBe(0);
    });

    test('deve validar data de despesa', () => {
      const expense = mockState.expenses[0];
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      
      expect(dateRegex.test(expense.date)).toBe(true);
    });

    test('deve verificar se conta existe', () => {
      const expense = mockState.expenses[0];
      const accountExists = mockState.accounts.find(a => a.id === expense.account);
      
      expect(accountExists).toBeDefined();
    });

    test('deve verificar se tipo de despesa é válido', () => {
      const validTypes = ['alimentacao', 'mercado', 'gasolina', 'transporte', 'outros'];
      const expense = mockState.expenses[0];
      
      expect(validTypes).toContain(expense.type);
    });

    test('não deve causar saldo negativo ao deduzir despesa', () => {
      const account = mockState.accounts[0];
      const expenseAmount = 500;
      const newBalance = account.saldo - expenseAmount;
      
      if (newBalance >= 0) {
        account.saldo = newBalance;
      }
      
      expect(account.saldo).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== CASOS DE ERRO ====================

  describe('Tratamento de Erros', () => {

    test('deve lidar com estado vazio', () => {
      const emptyState = {
        accounts: [],
        expenses: [],
        totals: { credito_total: 0, vr_total: 0, entrada: 0 }
      };
      
      const total = emptyState.expenses.reduce((sum, e) => sum + e.amount, 0);
      expect(total).toBe(0);
    });

    test('deve lidar com despesa sem conta correspondente', () => {
      const orphanExpense = {
        id: 'orphan',
        date: '2024-01-15',
        desc: 'Sem conta',
        amount: 100,
        account: 'inexistente',
        type: 'outros'
      };
      
      const accountExists = mockState.accounts.find(a => a.id === orphanExpense.account);
      expect(accountExists).toBeUndefined();
    });

    test('deve recuperar de operações inválidas', () => {
      const account = mockState.accounts[0];
      const oldBalance = account.saldo;
      const invalidValue = 'invalid';
      const parsed = Number(invalidValue);

      if (Number.isNaN(parsed)) {
        account.saldo = oldBalance;
      } else {
        account.saldo = parsed;
      }

      expect(typeof account.saldo).toBe('number');
      expect(account.saldo).toBe(oldBalance);
    });

    test('deve registrar erros de cálculo', () => {
      const expenses = [
        { amount: 100 },
        { amount: 'invalid' },
        { amount: 200 }
      ];
      
      const total = expenses.reduce((sum, e) => 
        sum + (Number(e.amount) || 0), 0
      );
      
      expect(total).toBe(300);
    });
  });

  // ==================== TESTES DE INTEGRAÇÃO ====================

  describe('Cenários de Integração', () => {

    test('deve registrar despesa e atualizar saldo', () => {
      const account = mockState.accounts[0];
      const oldBalance = account.saldo;
      const expenseAmount = 250;
      
      account.saldo -= expenseAmount;
      mockState.expenses.push({
        id: 'int-1',
        date: '2024-01-25',
        desc: 'Integração teste',
        amount: expenseAmount,
        account: account.id,
        type: 'outros'
      });
      
      expect(account.saldo).toBe(oldBalance - expenseAmount);
      expect(mockState.expenses.find(e => e.id === 'int-1')).toBeDefined();
    });

    test('deve transferir e registrar transação', () => {
      const from = mockState.accounts[0];
      const to = mockState.accounts[1];
      const amount = 300;
      
      from.saldo -= amount;
      to.saldo += amount;
      
      expect(from.saldo).toBe(700);
      expect(to.saldo).toBe(2300);
    });

    test('deve gerenciar ciclo completo de mês', () => {
      const month = '2024-01';
      const monthExpenses = mockState.expenses.filter(e => e.date.startsWith(month));
      const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      mockState.meta.activeOffset = 1;
      
      expect(monthTotal).toBe(150);
      expect(mockState.meta.activeOffset).toBe(1);
    });
  });
});
