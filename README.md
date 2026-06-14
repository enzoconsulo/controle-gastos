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

## Como iniciar

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

## GitHub Pages e uso como app

- O projeto também pode ser hospedado como site estático no GitHub Pages, porque as páginas e scripts são carregados diretamente do navegador.
- Todo o histórico e dados de uso são salvos no `localStorage` do navegador.
- No iPhone, dá para usar a função de "Adicionar à Tela de Início" ou exportar o app pelo menu do Safari.
- No Android, também é possível abrir o site no navegador e usar a opção de adicionar à tela inicial para ter o projeto como um "app" no menu, apesar de ele ser uma aplicação web.

## Observações

- A aplicação está configurada para rodar em modo `debug` no Flask, o que permite recarregar automaticamente quando os arquivos são alterados.
- Caso surja algum erro de dependência, verifique se o ambiente virtual está ativo e se o Flask está instalado corretamente.
- O projeto usa dependências externas via CDN como o `Chart.js` e o `Pluggy Connect`.
