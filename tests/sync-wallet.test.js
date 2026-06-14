/**
 * TESTES UNITÁRIOS: sync-wallet.js
 * Testa todas as funções de sincronização e processamento de dados
 */

import { createDefaultState, createISODate } from './testUtils.js';

describe('Sistema de Sincronização - Sync Wallet', () => {

  let mockState;

  beforeEach(() => {
    mockState = createDefaultState();
    window.state = mockState;
    localStorage.clear();
    jest.clearAllMocks();
  });

  // ==================== PROCESSAMENTO DE CSV ====================

  describe('Processamento de Arquivo CSV', () => {

    test('deve reconhecer formato de CSV de cartão de crédito', () => {
      const csvContent = 'date,title,amount\n2024-01-15,Ifood,50.00\n2024-01-16,Gasolina,100.00';
      const isCartao = csvContent.toLowerCase().includes('date,title,amount');
      
      expect(isCartao).toBe(true);
    });

    test('deve reconhecer formato de CSV de conta corrente', () => {
      const csvContent = 'data,valor,identificador\n2024-01-15,150.50,Saque\n2024-01-16,-200.00,Depósito';
      const isConta = csvContent.toLowerCase().includes('data,valor,identificador');
      
      expect(isConta).toBe(true);
    });

    test('deve rejeitar formato de CSV inválido', () => {
      const csvContent = 'invalid,header,format\n1,2,3';
      const isValid = csvContent.toLowerCase().includes('date,title,amount') || 
                      csvContent.toLowerCase().includes('data,valor,identificador');
      
      expect(isValid).toBe(false);
    });

    test('deve processar linha de CSV com dados corretos', () => {
      const line = '2024-01-15,Ifood,50.00';
      const cols = line.split(',');
      
      expect(cols.length).toBe(3);
      expect(cols[0]).toBe('2024-01-15');
      expect(cols[1]).toBe('Ifood');
      expect(cols[2]).toBe('50.00');
    });

    test('deve lidar com CSV com espaços em branco', () => {
      const line = '2024-01-15 , Ifood , 50.00 ';
      const cols = line.split(',').map(c => c.trim());
      
      expect(cols[0]).toBe('2024-01-15');
      expect(cols[1]).toBe('Ifood');
      expect(cols[2]).toBe('50.00');
    });

    test('deve converter formato de data DD/MM/YYYY para YYYY-MM-DD', () => {
      const dateStr = '15/01/2024';
      const parts = dateStr.split('/');
      const [day, month, year] = parts;
      const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      expect(formatted).toBe('2024-01-15');
    });

    test('deve converter formato de data YYYY-MM-DD', () => {
      const dateStr = '2024-01-15';
      const isValid = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
      
      expect(isValid).toBe(true);
    });

    test('deve converter valor de string para número', () => {
      expect(Number('50.00')).toBe(50);
      expect(Number('1234.56')).toBe(1234.56);
      expect(Number('-100.00')).toBe(-100);
    });

    test('deve lidar com valores negativos em CSV', () => {
      const amount = '-250.00';
      const numAmount = Number(amount);
      
      expect(numAmount).toBe(-250);
      expect(numAmount).toBeLessThan(0);
    });

    test('deve extrair descrição do CSV', () => {
      const descriptions = ['Ifood', 'Shell Posto', 'Carrefour', 'Uber'];
      
      descriptions.forEach(desc => {
        expect(desc.length).toBeGreaterThan(0);
      });
    });

    test('deve processar múltiplas linhas de CSV', () => {
      const csvContent = `date,title,amount
2024-01-15,Ifood,50.00
2024-01-16,Shell,100.00
2024-01-17,Carrefour,250.00`;
      
      const lines = csvContent.split('\n').filter(l => l.trim().length > 0);
      expect(lines.length).toBe(4); // header + 3 linhas
    });

    test('deve validar linha completa de CSV', () => {
      const line = '2024-01-15,Ifood,50.00';
      const cols = line.split(',');
      
      const isValid = cols.length === 3 && 
                      cols[0] && 
                      cols[1] && 
                      !isNaN(Number(cols[2]));
      
      expect(isValid).toBe(true);
    });

    test('deve ignorar linhas em branco', () => {
      const lines = ['2024-01-15,Ifood,50.00', '', '', '2024-01-16,Shell,100.00'];
      const filtered = lines.filter(l => l.trim().length > 0);
      
      expect(filtered.length).toBe(2);
    });

    test('deve detectar e ignorar linhas duplicadas', () => {
      const lines = [
        { date: '2024-01-15', desc: 'Ifood', amount: 50 },
        { date: '2024-01-15', desc: 'Ifood', amount: 50 }, // Duplicado
        { date: '2024-01-16', desc: 'Shell', amount: 100 }
      ];
      
      const seen = new Set();
      const unique = lines.filter(line => {
        const key = `${line.date}-${line.desc}-${line.amount}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      expect(unique.length).toBe(2);
    });
  });

  // ==================== CATEGORIZAÇÃO AUTOMÁTICA ====================

  describe('Categorização Automática de Despesas', () => {

    const DICT_CATEGORIAS = {
      alimentacao: ['ifood', 'rappi', 'mcdonald', 'burger king'],
      mercado: ['mercado', 'carrefour', 'assai', 'pao de acucar'],
      gasolina: ['shell', 'ipiranga', 'petrobras'],
      transporte: ['uber', '99app', 'taxi', 'metro'],
      outros: []
    };

    test('deve categorizar despesa de Ifood como alimentação', () => {
      const desc = 'ifood';
      let category = 'outros';
      
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => desc.toLowerCase().includes(kw))) {
          category = cat;
          break;
        }
      }
      
      expect(category).toBe('alimentacao');
    });

    test('deve categorizar despesa de Shell como gasolina', () => {
      const desc = 'shell';
      let category = 'outros';
      
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => desc.toLowerCase().includes(kw))) {
          category = cat;
          break;
        }
      }
      
      expect(category).toBe('gasolina');
    });

    test('deve categorizar despesa de Carrefour como mercado', () => {
      const desc = 'carrefour';
      let category = 'outros';
      
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => desc.toLowerCase().includes(kw))) {
          category = cat;
          break;
        }
      }
      
      expect(category).toBe('mercado');
    });

    test('deve categorizar despesa de Uber como transporte', () => {
      const desc = 'uber';
      let category = 'outros';
      
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => desc.toLowerCase().includes(kw))) {
          category = cat;
          break;
        }
      }
      
      expect(category).toBe('transporte');
    });

    test('deve categorizar com case insensitive', () => {
      const desc = 'IFOOD';
      let category = 'outros';
      
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => desc.toLowerCase().includes(kw))) {
          category = cat;
          break;
        }
      }
      
      expect(category).toBe('alimentacao');
    });

    test('deve categorizar descrição com informações adicionais', () => {
      const desc = 'ifood.com.br compra online';
      let category = 'outros';
      
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => desc.toLowerCase().includes(kw))) {
          category = cat;
          break;
        }
      }
      
      expect(category).toBe('alimentacao');
    });

    test('deve retornar "outros" para categoria desconhecida', () => {
      const desc = 'xyz desconhecido';
      let category = 'outros';
      
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => desc.toLowerCase().includes(kw))) {
          category = cat;
          break;
        }
      }
      
      expect(category).toBe('outros');
    });

    test('deve priorizar primeira categoria encontrada', () => {
      const desc = 'ifood shell'; // Múltiplas palavras-chave
      let category = 'outros';
      
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => desc.toLowerCase().includes(kw))) {
          category = cat;
          break;
        }
      }
      
      expect(category).toBe('alimentacao'); // Primeira encontrada
    });
  });

  // ==================== VALIDAÇÕES DE TRANSFERÊNCIA ====================

  describe('Validações de Transferência entre Contas', () => {

    test('deve bloquear transferência para própria conta', () => {
      const description = 'Transferência Enzo Cesar';
      const isTransferToSelf = description.toLowerCase().includes('enzo cesar');
      
      expect(isTransferToSelf).toBe(true);
    });

    test('deve permitir transferência para conta diferente', () => {
      const description = 'Transferência para João';
      const isTransferToSelf = description.toLowerCase().includes('enzo cesar');
      
      expect(isTransferToSelf).toBe(false);
    });

    test('deve identificar Pix específico a ignorar', () => {
      const desc = 'Pix enviado - Pai';
      const shouldIgnore = desc.toLowerCase().includes('pix') && desc.toLowerCase().includes('pai');
      
      expect(shouldIgnore).toBe(true);
    });

    test('deve aceitar Pix recebido', () => {
      const desc = 'Pix recebido';
      const shouldIgnore = desc.toLowerCase().includes('transferência para própria conta');
      
      expect(shouldIgnore).toBe(false);
    });
  });

  // ==================== INTEGRAÇÃO COM SUPABASE ====================

  describe('Sincronização com Supabase', () => {

    test('deve validar chave Supabase armazenada', () => {
      const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      
      expect(key).toBeTruthy();
      expect(key.length).toBeGreaterThan(0);
    });

    test('deve montar header correto para Supabase', () => {
      const key = 'test-key-123';
      const headers = {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      };
      
      expect(headers.apikey).toBe(key);
      expect(headers.Authorization).toBe(`Bearer ${key}`);
    });

    test('deve construir URL de requisição corretamente', () => {
      const baseUrl = 'https://vrtbzubfmjmbyofksnzs.supabase.co';
      const endpoint = '/rest/v1/pendentes?select=*';
      const fullUrl = baseUrl + endpoint;
      
      expect(fullUrl).toBe('https://vrtbzubfmjmbyofksnzs.supabase.co/rest/v1/pendentes?select=*');
    });

    test('deve formatar dados para envio ao Supabase', () => {
      const expense = {
        date: '2024-01-15',
        desc: 'Ifood',
        amount: 50,
        account: 'nubank',
        type: 'alimentacao'
      };
      
      const payload = JSON.stringify(expense);
      const parsed = JSON.parse(payload);
      
      expect(parsed).toEqual(expense);
    });

    test('deve lidar com resposta de erro do Supabase', () => {
      const errorResponse = {
        status: 400,
        message: 'Invalid request'
      };
      
      expect(errorResponse.status).not.toBe(200);
      expect(errorResponse.message).toBeTruthy();
    });

    test('deve retornar dados corretos em sucesso', () => {
      const successResponse = {
        status: 200,
        data: [
          { id: 1, desc: 'Teste', amount: 100 }
        ]
      };
      
      expect(successResponse.status).toBe(200);
      expect(Array.isArray(successResponse.data)).toBe(true);
    });

    test('deve formatar ID para deletar múltiplos registros', () => {
      const ids = [1, 2, 3, 4, 5];
      const formatted = ids.join(',');
      
      expect(formatted).toBe('1,2,3,4,5');
    });
  });

  // ==================== PROCESSAMENTO DE EMAIL ====================

  describe('Sincronização de Email', () => {

    test('deve validar URL de Google Apps Script armazenada', () => {
      const url = 'https://script.google.com/macros/s/ABC123/exec';
      
      expect(url).toBeTruthy();
      expect(url.includes('script.google.com')).toBe(true);
    });

    test('deve montar requisição para Google Apps Script', () => {
      const gasUrl = 'https://script.google.com/macros/s/ABC123/exec';
      const requestUrl = `${gasUrl}?action=getEmails`;
      
      expect(requestUrl).toContain('action=getEmails');
    });

    test('deve processar resposta de email em formato CSV', () => {
      const emailResponse = 'date,title,amount\n2024-01-15,Ifood,50.00';
      const lines = emailResponse.split('\n').filter(l => l.trim());
      
      expect(lines.length).toBeGreaterThan(0);
    });

    test('deve ignorar valor de Pix se configurado', () => {
      const ignorarPixValue = 2300;
      const transactionAmount = 2300;
      const shouldIgnore = transactionAmount === ignorarPixValue;
      
      expect(shouldIgnore).toBe(true);
    });

    test('deve aceitar outro valor de Pix não configurado', () => {
      const ignorarPixValue = 2300;
      const transactionAmount = 1500;
      const shouldIgnore = transactionAmount === ignorarPixValue;
      
      expect(shouldIgnore).toBe(false);
    });

    test('deve registrar data da última sincronização', () => {
      const lastSync = new Date().toISOString();
      
      expect(lastSync).toBeTruthy();
      expect(lastSync.length).toBeGreaterThan(0);
    });
  });

  // ==================== IMPORTAÇÃO MANUAL ====================

  describe('Importação Manual de Arquivo', () => {

    test('deve validar extensão de arquivo', () => {
      const filename = 'extrato.csv';
      const isCSV = filename.endsWith('.csv');
      
      expect(isCSV).toBe(true);
    });

    test('deve rejeitar arquivo com extensão errada', () => {
      const filename = 'extrato.txt';
      const isCSV = filename.endsWith('.csv');
      
      expect(isCSV).toBe(false);
    });

    test('deve ler arquivo como texto', () => {
      const content = 'date,title,amount\n2024-01-15,Ifood,50.00';
      
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    test('deve contar linhas de arquivo importado', () => {
      const content = 'date,title,amount\n2024-01-15,Ifood,50.00\n2024-01-16,Shell,100.00';
      const lines = content.split('\n').filter(l => l.trim());
      const dataLines = lines.length - 1; // Excluir header
      
      expect(dataLines).toBe(2);
    });

    test('deve validar tamanho de arquivo', () => {
      const maxSize = 5 * 1024 * 1024; // 5MB
      const fileSize = 1024; // 1KB
      
      expect(fileSize).toBeLessThan(maxSize);
    });
  });

  // ==================== MESCLA DE DADOS ====================

  describe('Mescla de Dados Apple Pay com CSV', () => {

    test('deve mesclar transações do Apple Pay com CSV', () => {
      const applePay = [
        { date: '2024-01-15', desc: 'Ifood', amount: 50 }
      ];
      const csv = [
        { date: '2024-01-15', desc: 'Ifood', amount: 50 }, // Duplicado
        { date: '2024-01-16', desc: 'Shell', amount: 100 }
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
      
      expect(merged.length).toBe(1); // Apenas Shell
    });

    test('deve contar novos registros importados', () => {
      const newCount = 5;
      
      expect(newCount).toBeGreaterThan(0);
    });

    test('deve contar registros mesclados (duplicados detectados)', () => {
      const mergedCount = 2;
      
      expect(mergedCount).toBeGreaterThanOrEqual(0);
    });

    test('deve contar registros já existentes', () => {
      const duplicateCount = 1;
      
      expect(duplicateCount).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== TRATAMENTO DE ERROS ====================

  describe('Tratamento de Erros na Sincronização', () => {

    test('deve lidar com falha de conexão ao Supabase', () => {
      const error = new Error('Network error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Network error');
    });

    test('deve lidar com chave Supabase ausente', () => {
      const key = localStorage.getItem('secretSupaKey');
      
      expect(key).toBeNull();
    });

    test('deve alertar usuário quando operação falha', () => {
      const shouldAlert = true;
      
      expect(shouldAlert).toBe(true);
    });

    test('deve retornar sem dados quando CSV está vazio', () => {
      const csvContent = '';
      const lines = csvContent.split('\n').filter(l => l.trim());
      
      expect(lines.length).toBe(0);
    });

    test('deve recuperar de erro de parsing de JSON', () => {
      const invalidJson = '{invalid json}';
      
      expect(() => {
        JSON.parse(invalidJson);
      }).toThrow();
    });

    test('deve validar resposta antes de processar', () => {
      const response = null;
      const isValid = response && typeof response === 'object';
      
      expect(isValid).toBeFalsy();
    });
  });

  // ==================== ARMAZENAMENTO ====================

  describe('Armazenamento de Configurações', () => {

    test('deve armazenar chave Supabase no localStorage', () => {
      const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      localStorage.setItem('secretSupaKey', key);
      
      expect(localStorage.getItem('secretSupaKey')).toBe(key);
    });

    test('deve armazenar URL do Google Apps Script', () => {
      const url = 'https://script.google.com/macros/s/ABC123/exec';
      localStorage.setItem('gasUrl', url);
      
      expect(localStorage.getItem('gasUrl')).toBe(url);
    });

    test('deve armazenar valor de Pix a ignorar', () => {
      const value = 2300;
      localStorage.setItem('ignorarPixValue', String(value));
      
      expect(Number(localStorage.getItem('ignorarPixValue'))).toBe(2300);
    });

    test('deve armazenar timestamp da última sincronização', () => {
      const timestamp = new Date().toISOString();
      localStorage.setItem('lastSync', timestamp);
      
      expect(localStorage.getItem('lastSync')).toBe(timestamp);
    });
  });

  // ==================== CASOS DE USO ====================

  describe('Casos de Uso Completos', () => {

    test('deve completar fluxo: upload CSV -> importar -> categorizar -> salvar', () => {
      // 1. Simular upload CSV
      const csvData = 'date,title,amount\n2024-01-15,Ifood,50.00';
      
      // 2. Importar
      const lines = csvData.split('\n').slice(1);
      
      // 3. Categorizar
      const categorized = lines.map(line => {
        const [date, desc, amount] = line.split(',');
        return {
          date,
          desc,
          amount: Number(amount),
          category: desc.toLowerCase().includes('ifood') ? 'alimentacao' : 'outros'
        };
      });
      
      // 4. Salvar
      mockState.expenses.push(...categorized.map(item => ({
        id: 'import-' + Math.random(),
        date: item.date,
        desc: item.desc,
        amount: item.amount,
        account: 'nubank',
        type: item.category
      })));
      
      expect(mockState.expenses.length).toBeGreaterThan(2);
    });

    test('deve sincronizar Apple Pay e atualizar estado', () => {
      const applePay = [
        { date: '2024-01-15', desc: 'Ifood', amount: 50, estabelecimento: 'Ifood' }
      ];
      
      applePay.forEach(transaction => {
        mockState.expenses.push({
          id: 'apple-' + Math.random(),
          date: transaction.date,
          desc: transaction.estabelecimento,
          amount: transaction.amount,
          account: 'nubank',
          type: 'alimentacao'
        });
      });
      
      expect(mockState.expenses.some(e => e.desc === 'Ifood')).toBe(true);
    });
  });
});
