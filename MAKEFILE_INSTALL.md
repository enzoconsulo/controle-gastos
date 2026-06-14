# 🛠️ Instalando Make no Windows

O `make` não vem instalado por padrão no Windows, mas existem várias formas de adicionar.

## Opção 1: Git Bash (Mais Fácil - Recomendado ✅)

Se você tem **Git for Windows** instalado, `make` já está disponível!

1. Abra **Git Bash** (clique direito em qualquer pasta → "Git Bash Here")
2. Use os comandos normalmente:
   ```bash
   make help
   make install
   make test
   ```

**Pronto!** ✓

---

## Opção 2: Chocolatey (Se você tem admin)

Se você tem [Chocolatey](https://chocolatey.org/) instalado:

```powershell
choco install make
```

Depois feche e reabra o PowerShell, e use:
```powershell
make help
```

---

## Opção 3: MinGW (Manual)

1. Baixe [MinGW](http://www.mingw.org/)
2. Instale e selecione `mingw32-make`
3. Adicione ao PATH do Windows
4. Renomeie `mingw32-make.exe` para `make.exe` (opcional)

---

## Opção 4: Windows Subsystem for Linux (WSL)

Se você tem WSL instalado:

```bash
# No terminal WSL
wsl
apt-get install make
```

---

## ❌ Sem Make? Use PowerShell Diretamente

Se não conseguir instalar `make`, use os comandos npm/python diretamente:

```powershell
# Em vez de: make test
npm test

# Em vez de: make test-coverage
npm run test:coverage

# Em vez de: make run
python app.py

# Em vez de: make test-watch
npm run test:watch
```

Todos os comandos do Makefile têm equivalentes diretos listados no [README.md](./README.md).

---

## ✅ Verificar se Make está Instalado

```powershell
make --version
```

Se você vir a versão, está tudo pronto! Se não, siga uma das opções acima.

---

## 💡 Recomendação

Para melhor experiência no Windows:
1. **Git Bash** (Opção 1) - Mais simples, já tem tudo
2. **PowerShell 7+** - Suporta melhor Unix tools
3. **WSL** - Se você quer ambiente Linux completo

Escolha uma e aproveite os scripts! 🚀
