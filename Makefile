# ============================================================================
# MAKEFILE - Controle de Gastos
# Automatiza testes, execução e gerenciamento do projeto
# ============================================================================

.PHONY: help install test test-watch test-coverage test-state test-finances \
        test-impressora test-sync test-categorias test-integration test-all \
        run dev clean coverage-report

# Cores para output
BLUE=\033[0;34m
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
NC=\033[0m # No Color

# ============================================================================
# TESTES - Execução de testes com Jest
# ============================================================================

## help: Mostra todos os comandos disponíveis
help:
	@echo "$(BLUE)╔════════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║ CONTROLE DE GASTOS - Makefile                                 ║$(NC)"
	@echo "$(BLUE)╚════════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)INSTALAÇÃO:$(NC)"
	@echo "  $(YELLOW)make install$(NC)              Instala todas as dependências"
	@echo ""
	@echo "$(GREEN)TESTES - Execução:$(NC)"
	@echo "  $(YELLOW)make test$(NC)                 Executa todos os testes"
	@echo "  $(YELLOW)make test-watch$(NC)           Executa testes em modo watch"
	@echo "  $(YELLOW)make test-coverage$(NC)        Executa testes com cobertura"
	@echo "  $(YELLOW)make test-all$(NC)             Testes com verbose + cobertura"
	@echo ""
	@echo "$(GREEN)TESTES - Por Módulo:$(NC)"
	@echo "  $(YELLOW)make test-state$(NC)           Testa state.js (formatação, datas)"
	@echo "  $(YELLOW)make test-finances$(NC)        Testa finances.js (contas, despesas)"
	@echo "  $(YELLOW)make test-impressora$(NC)      Testa impressora.js (3D printer)"
	@echo "  $(YELLOW)make test-sync$(NC)            Testa sync-wallet.js (sincronização)"
	@echo "  $(YELLOW)make test-categorias$(NC)      Testa categorias.js (categorização)"
	@echo "  $(YELLOW)make test-integration$(NC)     Testa integração entre módulos"
	@echo ""
	@echo "$(GREEN)EXECUÇÃO:$(NC)"
	@echo "  $(YELLOW)make run$(NC)                  Inicia o servidor Flask (app Python)"
	@echo "  $(YELLOW)make dev$(NC)                  Modo desenvolvimento (Flask + watch tests)"
	@echo ""
	@echo "$(GREEN)LIMPEZA:$(NC)"
	@echo "  $(YELLOW)make clean$(NC)                Remove arquivos gerados (coverage, cache)"
	@echo "  $(YELLOW)make coverage-report$(NC)      Abre relatório de cobertura no navegador"
	@echo ""

## install: Instala dependências Node.js e Python
install:
	@echo "$(GREEN)▶ Instalando dependências Node.js...$(NC)"
	npm install
	@echo "$(GREEN)✓ Node.js pronto$(NC)"
	@echo ""
	@echo "$(BLUE)Note: Para ativar o ambiente virtual Python, execute:$(NC)"
	@echo "  .\venv\Scripts\Activate.ps1"
	@echo ""

# ============================================================================
# TESTES
# ============================================================================

## test: Executa todos os testes
test:
	@echo "$(GREEN)▶ Executando testes...$(NC)"
	npm test
	@echo "$(GREEN)✓ Testes concluídos$(NC)"

## test-watch: Executa testes em modo watch (reexecuta quando arquivos mudam)
test-watch:
	@echo "$(GREEN)▶ Iniciando testes em modo watch...$(NC)"
	@echo "$(YELLOW)Pressione 'q' para sair$(NC)"
	npm run test:watch

## test-coverage: Executa testes com relatório de cobertura
test-coverage:
	@echo "$(GREEN)▶ Executando testes com cobertura...$(NC)"
	npm run test:coverage
	@echo "$(GREEN)✓ Cobertura gerada em coverage/$(NC)"
	@echo ""
	@echo "$(BLUE)Dica: Execute 'make coverage-report' para ver o relatório no navegador$(NC)"

## test-all: Executa todos os testes com verbose + cobertura
test-all:
	@echo "$(GREEN)▶ Executando todos os testes com cobertura completa...$(NC)"
	npm run test:all
	@echo "$(GREEN)✓ Testes e cobertura concluídos$(NC)"

# Testes por módulo
## test-state: Testa formatação, datas e gerenciamento de estado (state.js)
test-state:
	@echo "$(GREEN)▶ Testando state.js...$(NC)"
	npm run test:state

## test-finances: Testa contas, despesas e investimentos (finances.js)
test-finances:
	@echo "$(GREEN)▶ Testando finances.js...$(NC)"
	npm run test:finances

## test-impressora: Testa sistema de impressora 3D (impressora.js)
test-impressora:
	@echo "$(GREEN)▶ Testando impressora.js...$(NC)"
	npm run test:impressora

## test-sync: Testa sincronização e importação (sync-wallet.js)
test-sync:
	@echo "$(GREEN)▶ Testando sync-wallet.js...$(NC)"
	npm run test:sync

## test-categorias: Testa categorização automática (categorias.js)
test-categorias:
	@echo "$(GREEN)▶ Testando categorias.js...$(NC)"
	npm run test:categorias

## test-integration: Testa fluxos completos e integração
test-integration:
	@echo "$(GREEN)▶ Testando integration.js...$(NC)"
	npm run test:integration

# ============================================================================
# EXECUÇÃO
# ============================================================================

## run: Inicia o servidor Flask (aplicação principal)
run:
	@echo "$(GREEN)▶ Iniciando servidor Flask...$(NC)"
	@echo "$(BLUE)Acesse em: http://127.0.0.1:5000/$(NC)"
	@echo "$(YELLOW)Pressione Ctrl+C para parar$(NC)"
	@echo ""
	python app.py

## dev: Modo desenvolvimento - Flask + Node.js watch (em paralelo, PowerShell recomendado)
dev:
	@echo "$(GREEN)╔════════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(GREEN)║ MODO DESENVOLVIMENTO - Iniciando...                           ║$(NC)"
	@echo "$(GREEN)╚════════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(BLUE)Este comando inicia dois serviços:$(NC)"
	@echo "  1. Servidor Flask (Python) - http://127.0.0.1:5000/"
	@echo "  2. Testes em watch mode (Node.js) - Reexecuta quando arquivos mudam"
	@echo ""
	@echo "$(YELLOW)Para Windows PowerShell, use dois terminais:$(NC)"
	@echo "  Terminal 1: make run"
	@echo "  Terminal 2: make test-watch"
	@echo ""
	@echo "$(YELLOW)Ou use o comando abaixo em PowerShell 7+:$(NC)"
	@echo "  start powershell { python app.py }; npm run test:watch"
	@echo ""

# ============================================================================
# LIMPEZA
# ============================================================================

## clean: Remove arquivos gerados (coverage, cache, node_modules)
clean:
	@echo "$(GREEN)▶ Limpando arquivos gerados...$(NC)"
	@if exist coverage rmdir /s /q coverage
	@if exist node_modules rmdir /s /q node_modules
	@if exist .jest-cache rmdir /s /q .jest-cache
	@del /f /q *.pyc 2>nul || true
	@del /f /q __pycache__ 2>nul || true
	@echo "$(GREEN)✓ Arquivos limpos$(NC)"

## coverage-report: Abre o relatório de cobertura no navegador
coverage-report:
	@echo "$(GREEN)▶ Abrindo relatório de cobertura...$(NC)"
	@if exist coverage\lcov-report\index.html (
		start coverage\lcov-report\index.html
	) else (
		@echo "$(RED)✗ Relatório não encontrado. Execute primeiro: make test-coverage$(NC)"
	)

# ============================================================================
# DEFAULT
# ============================================================================

# Se nenhum target for especificado, mostra ajuda
.DEFAULT_GOAL := help
