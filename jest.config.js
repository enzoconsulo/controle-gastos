module.exports = {
  // Ambiente de teste
  testEnvironment: 'jsdom',

  // Padrão de arquivos de teste
  testMatch: ['**/tests/**/*.test.js', '**/?(*.)+(spec|test).js'],

  // Cobertura de código
  collectCoverageFrom: [
    '*.js',
    '!jest.config.js',
    '!node_modules/**',
    '!tests/**'
  ],

  // Limiar mínimo de cobertura
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  // Setup de testes
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Transformadores
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Ignorar padrões
  testPathIgnorePatterns: ['/node_modules/'],

  // Verbose
  verbose: true,

  // Timeout para testes
  testTimeout: 10000,

  // Simulador de módulos
  moduleFileExtensions: ['js', 'json']
};
