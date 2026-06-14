/**
 * Utilitários para testes unitários
 * Funções auxiliares para simplificar testes
 */

/**
 * Extrai e mock funções de um arquivo JS para testes
 * @param {Object} functions - Objeto com pares chave/valor {funcName: jest.fn()}
 * @returns {Object} Objeto com funções mockadas
 */
export const createMockFunctions = (functions) => {
  const mocks = {};
  for (const [name, fn] of Object.entries(functions)) {
    mocks[name] = jest.fn(fn);
  }
  return mocks;
};

/**
 * Cria um estado padrão para testes
 * @returns {Object} Estado inicial mockado
 */
export const createDefaultState = () => ({
  accounts: [
    { id: 'nubank', name: 'Nubank', saldo: 1000, guardado: 500, credit_total: 0 },
    { id: 'sicoob', name: 'Sicoob', saldo: 2000, guardado: 1000, credit_total: 0 },
    { id: 'itau', name: 'Itau', saldo: 1500, guardado: 750, credit_total: 0 },
    { id: 'caju', name: 'Caju', saldo: 300, guardado: 100, credit_total: 0 },
    { id: 'mercado_pago', name: 'Mercado Pago', saldo: 800, guardado: 400, credit_total: 0 },
    { id: 'imp3d', name: 'imp3d', saldo: 5000, guardado: 2000, credit_total: 0 },
    { id: 'shopee', name: 'Shopee', saldo: 0, guardado: 0, credit_total: 0 }
  ],
  totals: { credito_total: 0, vr_total: 0, entrada: 0 },
  expenses: [
    { id: '1', date: '2024-01-15', desc: 'Almoço', amount: 50, account: 'nubank', type: 'alimentacao' },
    { id: '2', date: '2024-01-16', desc: 'Gasolina', amount: 100, account: 'nubank', type: 'gasolina' }
  ],
  investments: [
    { id: '1', date: '2024-01-01', desc: 'Investimento 1', amount: 1000, account: 'nubank', taxa: 0 }
  ],
  startEntries: [],
  investBoxes: [],
  filaments: [
    { id: '1', color: 'Preto', type: 'PLA', weight: 1000, initialWeight: 1000, price: 45.00 },
    { id: '2', color: 'Branco', type: 'PETG', weight: 500, initialWeight: 500, price: 65.00 }
  ],
  productBoxes: [
    { id: 'box-default', name: 'Geral', emoji: '📦' },
    { id: 'box-1', name: 'Miniaturas', emoji: '🗿' }
  ],
  products: [
    { id: '1', name: 'Miniatura A', hours: 2, fil_g: 20, price: 50, desc: 'Miniatura test', box: 'box-default' },
    { id: '2', name: 'Miniatura B', hours: 3, fil_g: 30, price: 75, desc: 'Miniatura test 2', box: 'box-1' }
  ],
  impSales: [
    { id: '1', date: '2024-01-15', productId: '1', filamentId: '1', accountId: 'imp3d', qty: 5, amountGross: 250, feeTotal: 0, netReceived: 250, materialCost: 25, profit: 225 }
  ],
  impLosses: [
    { id: '1', date: '2024-01-10', filamentId: '1', grams: 50, cost: 2.25, reason: 'Falha de impressão' }
  ],
  impExternalSales: [],
  impStock: [
    { id: '1', date: '2024-01-15', productId: '1', filamentId: '1', qty: 10, materialCost: 50, hourlyCost: 0, packagingCost: 0 }
  ],
  meta: { baseMonth: '2024-01', activeOffset: 0, lastCreditClosed: null }
});

/**
 * Cria uma data ISO formatada
 * @param {number} daysFromNow - Dias a partir de hoje (negativo = passado)
 * @returns {string} Data no formato YYYY-MM-DD
 */
export const createISODate = (daysFromNow = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
};

/**
 * Simula localStorage com dados
 * @param {Object} data - Dados para armazenar
 */
export const setupLocalStorage = (data) => {
  localStorage.clear();
  Object.entries(data).forEach(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value));
  });
};

/**
 * Cria um mock de evento DOM
 * @param {string} type - Tipo de evento
 * @param {Object} properties - Propriedades do evento
 * @returns {Event} Evento mockado
 */
export const createMockEvent = (type, properties = {}) => {
  const event = new Event(type);
  Object.assign(event, properties);
  return event;
};

/**
 * Valida se um objeto é uma despesa válida
 * @param {Object} expense - Objeto de despesa
 * @returns {boolean} True se válido
 */
export const isValidExpense = (expense) => {
  return Boolean(
    expense &&
    expense.id &&
    expense.date &&
    expense.desc &&
    typeof expense.amount === 'number' &&
    expense.amount > 0 &&
    expense.account &&
    expense.type
  );
};

/**
 * Valida se uma data está no formato ISO correto
 * @param {string} dateString - Data a validar
 * @returns {boolean} True se válida
 */
export const isValidISODate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * Cria um filamento mockado para testes
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Filamento mockado
 */
export const createMockFilament = (overrides = {}) => ({
  id: 'fil-' + Math.random().toString(36).substr(2, 9),
  color: 'Preto',
  type: 'PLA',
  weight: 1000,
  initialWeight: 1000,
  price: 45.00,
  ...overrides
});

/**
 * Cria um produto mockado para testes
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Produto mockado
 */
export const createMockProduct = (overrides = {}) => ({
  id: 'prod-' + Math.random().toString(36).substr(2, 9),
  name: 'Miniatura Teste',
  hours: 2.5,
  fil_g: 25,
  price: 60,
  desc: 'Produto de teste',
  box: 'box-default',
  ...overrides
});

/**
 * Cria uma venda mockada para testes
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Venda mockada
 */
export const createMockSale = (overrides = {}) => ({
  id: 'sale-' + Math.random().toString(36).substr(2, 9),
  date: createISODate(),
  productId: 'prod-1',
  filamentId: 'fil-1',
  accountId: 'imp3d',
  qty: 1,
  amountGross: 60,
  feeTotal: 0,
  netReceived: 60,
  materialCost: 5,
  profit: 55,
  ...overrides
});

/**
 * Verifica se um valor está em um intervalo
 * @param {number} value - Valor a verificar
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {boolean} True se está no intervalo
 */
export const isInRange = (value, min, max) => value >= min && value <= max;

/**
 * Compara dois arrays sem considerar ordem
 * @param {Array} arr1 - Primeiro array
 * @param {Array} arr2 - Segundo array
 * @returns {boolean} True se contêm os mesmos elementos
 */
export const arrayEqualsIgnoreOrder = (arr1, arr2) => {
  if (arr1.length !== arr2.length) return false;
  return arr1.every(item => arr2.includes(item));
};

export default {
  createMockFunctions,
  createDefaultState,
  createISODate,
  setupLocalStorage,
  createMockEvent,
  isValidExpense,
  isValidISODate,
  createMockFilament,
  createMockProduct,
  createMockSale,
  isInRange,
  arrayEqualsIgnoreOrder
};
