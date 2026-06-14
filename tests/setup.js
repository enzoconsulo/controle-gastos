/**
 * Setup de testes unitários
 * Inicializa mocks e configurações globais para todos os testes
 */

// Mock do localStorage
global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

// Mock do window
global.window = {
  state: null,
  localStorage: global.localStorage,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  location: {
    hash: '',
    reload: jest.fn()
  }
};

// Mock do document
global.document = {
  querySelectorAll: jest.fn(() => []),
  querySelector: jest.fn(),
  getElementById: jest.fn(),
  createElement: jest.fn(),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  },
  addEventListener: jest.fn()
};

// Mock de URL
global.URL = {
  createObjectURL: jest.fn(() => 'blob:mock'),
  revokeObjectURL: jest.fn()
};

// Mock de Blob
global.Blob = function(parts, options) {
  this.parts = parts;
  this.options = options;
};

// Mock de FileReader
global.FileReader = function() {
  this.readAsText = jest.fn();
  this.onload = jest.fn();
};

// Mock de fetch (para testes de sincronização)
global.fetch = jest.fn();

// Limpar localStorage antes de cada teste
beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

// Suprimir logs de console durante testes (opcional)
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
