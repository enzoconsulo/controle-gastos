# Controle de Gastos

Este projeto é uma aplicação de controle financeiro pessoal com painel principal e uma área extra dedicada a um fluxo de gerenciamento de Impressora 3D.

## Sobre

- A interface principal está em `index.html`.
- O app carrega dados e comportamentos via arquivos JavaScript como `app.js`, `state.js`, `finances.js`, `impressora.js`, `categorias.js`, `sync-pluggy-ui.js` e `sync-wallet.js`.
- A pasta `impressora3d/` contém páginas adicionais para gestão de estoque, vendas, perdas, produtos e filamentos.
- O servidor local é executado com Flask em `app.py`, que entrega a página principal e os assets necessários.

## Pré-requisitos

- Python 3 instalado
- Um ambiente virtual `venv` já existente no projeto
- `Flask` instalado no ambiente virtual
- Node.js 18+ instalado (necessário para executar os testes)

## ⚡ Quick Start com Makefile

Se você tem `make` instalado (ou `make` via Git Bash/MinGW), pode usar comandos simplificados:

```powershell
make install      # Instala dependências
make run          # Inicia o servidor
make test         # Executa todos os testes
make test-watch   # Testes em modo watch
make test-coverage # Testes com cobertura
make dev          # Modo desenvolvimento
make help         # Lista todos os comandos
```

📖 Veja a seção [Guia de Scripts Makefile](#guia-de-scripts-makefile) para detalhes completos.

> **Não tem Make instalado?** Veja [MAKEFILE_INSTALL.md](./MAKEFILE_INSTALL.md) para instruções simples.

## Como iniciar manualmente

1. Abra o terminal na pasta do projeto:
   ```powershell
   cd c:\Users\enzoc\OneDrive\Documentos\controle-gastos
   ```

2. Ative o ambiente virtual:
   ```powershell
   .\venv\Scripts\Activate.ps1

   ou 

   .\\venv\Scripts\Activate.ps1
   ```

3. Instale o Flask (se ainda não estiver instalado):
   ```powershell
   pip install flask
   ```

4. Execute o servidor local:
   ```powershell
   python app.py
   ```

5. Abra o navegador em:
   ```text
   http://127.0.0.1:5000/
   ```

## Navegação

- A página principal é `index.html`.
- As páginas da área de Impressora 3D estão em `impressora3d/` e podem ser acessadas pelos links internos do painel principal ou diretamente pelo navegador, por exemplo:
  - `http://127.0.0.1:5000/impressora3d/dashboard.html`

## 🧪 Testes Unitários

O projeto inclui uma suite de testes completa para os módulos principais.

### Instalação das Dependências de Teste

1. Instale as dependências de teste:
   ```powershell
   npm install
   ```

   Isto instalará:
   - **Jest**: Framework de testes
   - **@babel/core + babel-jest**: Suporte para ES6 modules
   - **jest-environment-jsdom**: Ambiente DOM para testes

### Executando os Testes

#### Executar todos os testes:
```powershell
npm test
```

#### Executar com relatório de cobertura:
```powershell
npm run test:coverage
```
Gera um relatório em `coverage/` com informações sobre cobertura de linhas, branches, funções e statements.

#### Executar em modo watch (reexecuta quando os arquivos mudam):
```powershell
npm run test:watch
```
Útil durante desenvolvimento para feedback contínuo.

#### Executar testes específicos por módulo:
```powershell
npm run test:state
npm run test:finances
npm run test:impressora
npm run test:sync
npm run test:categorias
npm run test:integration
```

#### Executar com saída verbose (mais detalhes):
```powershell
npm run test:verbose
```

#### Executar todos os testes com cobertura completa:
```powershell
npm run test:all
```

### Estrutura dos Testes

Os testes estão organizados na pasta `/tests/`:

- **testUtils.js** - Funções auxiliares e factories para criar dados de teste
- **state.test.js** - Formatação, datas e gerenciamento de estado
- **finances.test.js** - Contas, despesas e investimentos
- **impressora.test.js** - Sistema de impressora 3D (filamentos, produtos, vendas)
- **sync-wallet.test.js** - Sincronização e importação de dados
- **categorias.test.js** - Categorização automática de despesas
- **integration.test.js** - Fluxos completos entre módulos

### Arquivos de Configuração

- `jest.config.js` - Configuração do Jest
- `.babelrc` - Configuração do Babel para transpilação ES6
- `package.json` - Dependências e scripts de teste

## 📜 Guia de Scripts Makefile

Este projeto inclui um `Makefile` que automatiza tarefas comuns. Use `make` para executar qualquer um destes comandos:

### 📋 Ver Ajuda

```bash
make help
```

Mostra lista completa de todos os comandos disponíveis com descrições.

### 📦 Instalação

#### `make install`
Instala todas as dependências do projeto (Node.js).

```bash
make install
```

**O que faz:**
- Executa `npm install`
- Instala Jest, Babel, jsdom e outras dependências de teste

**Próximo passo:**
- Para ativar o ambiente virtual Python: `.\venv\Scripts\Activate.ps1`

### 🧪 Testes - Todos

#### `make test`
Executa todos os testes uma única vez.

```bash
make test
```

**Útil para:** Validação antes de commit, CI/CD.

#### `make test-watch`
Executa testes em modo **watch** - reexecuta automaticamente quando você modifica um arquivo.

```bash
make test-watch
```

**Útil para:** Desenvolvimento contínuo, TDD (Test-Driven Development).
**Para sair:** Pressione `q`

#### `make test-coverage`
Executa testes e gera relatório de cobertura (em `coverage/`).

```bash
make test-coverage
```

**Gera:**
- Relatório HTML em `coverage/lcov-report/index.html`
- Estatísticas de cobertura (linhas, branches, funções)

**Depois execute:**
```bash
make coverage-report
```
Para abrir o relatório no navegador automaticamente.

#### `make test-all`
Executa testes com saída verbose + relatório de cobertura completo.

```bash
make test-all
```

**Útil para:** Análise detalhada e geração de relatório final.

### 🧪 Testes - Por Módulo

Execute testes apenas de um módulo específico:

#### `make test-state`
Testa formatação, datas, localStorage e gerenciamento de estado.
```bash
make test-state          # ~150 testes
```

#### `make test-finances`
Testa contas, despesas, investimentos e relatórios financeiros.
```bash
make test-finances       # ~200 testes
```

#### `make test-impressora`
Testa sistema completo de impressora 3D (filamentos, produtos, vendas, estoque).
```bash
make test-impressora     # ~250 testes
```

#### `make test-sync`
Testa sincronização, importação CSV, categorização e APIs.
```bash
make test-sync           # ~200 testes
```

#### `make test-categorias`
Testa categorização automática de despesas (12 categorias).
```bash
make test-categorias     # ~150 testes
```

#### `make test-integration`
Testa fluxos completos entre módulos, stress tests e casos extremos.
```bash
make test-integration    # ~100 testes
```

### 🚀 Execução

#### `make run`
Inicia o servidor Flask da aplicação.

```bash
make run
```

**Resultado:**
- Servidor rodando em `http://127.0.0.1:5000/`
- Modo debug ativado (recarrega automaticamente)
- Pressione `Ctrl+C` para parar

#### `make dev`
Modo desenvolvimento - Mostra instruções para rodar Flask + testes em paralelo.

```bash
make dev
```

**Recomendado:**
- Abra 2 terminais PowerShell
- Terminal 1: `make run` (inicia Flask)
- Terminal 2: `make test-watch` (testes em watch)

### 🧹 Limpeza

#### `make clean`
Remove arquivos gerados (coverage, cache, node_modules).

```bash
make clean
```

**Remove:**
- Pasta `coverage/` (relatórios de cobertura)
- Pasta `node_modules/` (dependências)
- Cache do Jest

**Próximo passo:** Execute `make install` para reinstalar.

#### `make coverage-report`
Abre o relatório de cobertura no navegador.

```bash
make coverage-report
```

**Pré-requisito:** Execute `make test-coverage` primeiro.

---

### 💡 Exemplos de Fluxo de Trabalho

**Desenvolvimento com TDD:**
```bash
make install
make test-watch        # Terminal 1
make run              # Terminal 2
# Edite código, testes reexecutam automaticamente
```

**Antes de fazer commit:**
```bash
make test-all         # Valida tudo com cobertura
make coverage-report  # Verifica cobertura
```

**Debugging de um módulo:**
```bash
make test-impressora  # Testa só a impressora 3D
# Edite impressora.js
make test-impressora  # Reexecuta testes
```

**Produção:**
```bash
make clean            # Remove cache
make install          # Reinstala dependências
make test             # Valida tudo
make run              # Inicia servidor
```

---

## GitHub Pages e uso como app

- O projeto também pode ser hospedado como site estático no GitHub Pages, porque as páginas e scripts são carregados diretamente do navegador.
- Todo o histórico e dados de uso são salvos no `localStorage` do navegador.
- No iPhone, dá para usar a função de "Adicionar à Tela de Início" ou exportar o app pelo menu do Safari.
- No Android, também é possível abrir o site no navegador e usar a opção de adicionar à tela inicial para ter o projeto como um "app" no menu, apesar de ele ser uma aplicação web.

## Observações

- A aplicação está configurada para rodar em modo `debug` no Flask, o que permite recarregar automaticamente quando os arquivos são alterados.
- Caso surja algum erro de dependência, verifique se o ambiente virtual está ativo e se o Flask está instalado corretamente.
- O projeto usa dependências externas via CDN como o `Chart.js` e o `Pluggy Connect`.
