# 📋 Makefile Cheatsheet - Referência Rápida

Referência rápida dos comandos mais usados do Makefile.

---

## ⚡ Comandos Mais Usados

### Começar do zero
```bash
make install          # 1️⃣  Instala dependências
make run              # 2️⃣  Inicia o servidor
```

### Desenvolvimento (TDD)
```bash
make test-watch       # Testes reexecutam quando você salva
# Em outro terminal:
make run              # Servidor rodando
```

### Validação antes de commit
```bash
make test-all         # Testes + cobertura + verbose
```

### Debugging
```bash
make test-impressora  # Testa só impressora 3D
# ou outro módulo...
```

---

## 📊 Todos os Comandos

| Comando | O que faz | Tempo |
|---------|-----------|-------|
| `make help` | Mostra lista de comandos | - |
| `make install` | Instala dependências Node.js | ~30s |
| **TESTES** | | |
| `make test` | Todos os testes (1x) | ~5-10s |
| `make test-watch` | Testes em watch mode | ∞ (até q) |
| `make test-coverage` | Testes + cobertura | ~10-15s |
| `make test-all` | Verbose + cobertura | ~15s |
| `make test-state` | Só state.js | ~1-2s |
| `make test-finances` | Só finances.js | ~2s |
| `make test-impressora` | Só impressora.js | ~2-3s |
| `make test-sync` | Só sync-wallet.js | ~2s |
| `make test-categorias` | Só categorias.js | ~2s |
| `make test-integration` | Só integration.js | ~1-2s |
| **EXECUÇÃO** | | |
| `make run` | Inicia Flask | ∞ (Ctrl+C) |
| `make dev` | Mostra instruções dev | - |
| **LIMPEZA** | | |
| `make clean` | Remove cache/coverage | ~2s |
| `make coverage-report` | Abre relatório | - |

---

## 🎯 Cenários

### 1️⃣ Primeira Vez
```bash
make install          # Instala tudo
make test             # Verifica que funciona
make run              # Inicia a app
```

### 2️⃣ Desenvolvimento Diário
```bash
# Terminal 1
make run              # Servidor rodando

# Terminal 2
make test-watch       # Testes em watch
# edite código...
# testes reexecutam automaticamente
```

### 3️⃣ Antes de Push/Commit
```bash
make clean            # Limpa cache
make test-all         # Valida tudo
make coverage-report  # Verifica cobertura
git add .
git commit -m "..."
git push
```

### 4️⃣ Debugging de Módulo
```bash
make test-impressora  # Executa só impressora
# edita impressora.js
make test-impressora  # reexecuta automaticamente
```

### 5️⃣ Preparando Produção
```bash
make clean            # Remove cache
make install          # Reinstala clean
make test             # Valida antes de deploy
make run              # Inicia servidor
```

---

## 🔗 Equivalentes Sem Make

Se você **não tem make** instalado, use npm/python diretamente:

| Make | Sem Make |
|------|----------|
| `make install` | `npm install` |
| `make test` | `npm test` |
| `make test-watch` | `npm run test:watch` |
| `make test-coverage` | `npm run test:coverage` |
| `make test-state` | `npm run test:state` |
| `make test-finances` | `npm run test:finances` |
| `make test-impressora` | `npm run test:impressora` |
| `make test-sync` | `npm run test:sync` |
| `make test-categorias` | `npm run test:categorias` |
| `make test-integration` | `npm run test:integration` |
| `make run` | `python app.py` |
| `make clean` | Remove pastas manualmente |

---

## 💡 Dicas

✅ **Fazer:**
- Use `make help` para ver todos os comandos
- Use `make test-watch` durante desenvolvimento
- Execute `make test-all` antes de fazer commit
- Abra 2 terminais para desenvolvimento (um `make run`, outro `make test-watch`)

❌ **Evitar:**
- Não execute `make clean` se está trabalhando (remove node_modules)
- Não esqueça `make test-coverage` antes de deploys importantes

---

## 📚 Mais Informações

- Guia completo: [README.md](./README.md#guia-de-scripts-makefile)
- Instalando Make: [MAKEFILE_INSTALL.md](./MAKEFILE_INSTALL.md)
- Testes detalhado: [TESTS_README.md](./TESTS_README.md)
- Arquivo Makefile: [Makefile](./Makefile)

---

## 🚀 Comece Agora

```bash
# Windows (Git Bash) / Mac / Linux
make help             # Ver todos os comandos
make install          # Instalar dependências
make test             # Rodar testes
make run              # Iniciar app
```

Pronto! 🎉
