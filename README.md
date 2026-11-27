# 🐷 Savvy

App pessoal para registar gastos mensais (fixos e pontuais), ver estatísticas e acompanhar objetivos de poupança.

- **Sem login** — os dados ficam guardados apenas no teu dispositivo (localStorage)
- **Funciona offline** — PWA com service worker
- **Instalável no telemóvel** — como uma app normal, com ícone no ecrã principal

## Funcionalidades
- **Dashboard** — saldo do mês, evolução das despesas, histórico receitas vs despesas, eficiência (taxa de poupança), movimentos recentes
- **Movimentos** — despesas, receitas e **poupanças 🐷**, pontuais ou **fixas mensais** (repetem-se automaticamente; podem ser terminadas mantendo o histórico)
- **Poupanças 🐷** — não contam como receita nem despesa; podem ser ligadas a um objetivo
- **Pago / por pagar** — cada despesa tem estado; toca no círculo para marcar como paga
- **Estatísticas** — gastos por categoria, taxa de poupança, para onde foi o dinheiro (gasto/poupado/livre), comparação com o mês anterior, 12 meses
- **Objetivos** — metas de poupança com prazo, progresso e quanto juntar por mês
- **Voltar atrás** — botão de voltar do telemóvel/browser e seta ‹ na app; “Anular” depois de cada alteração
- **Categorias personalizadas** — “＋ Nova” na grelha de categorias (emoji + nome); geridas nas Definições
- **Definições** (toca em *savvy*) — nome, moeda, categorias, fixos, marcar tudo como pago, cópia de segurança (JSON), CSV

## Publicar (GitHub Pages)
1. No repositório: **Settings → Pages**
2. *Source*: **Deploy from a branch** → branch `main`, pasta `/ (root)` → **Save**
3. Passado ~1 minuto a app fica em `https://<utilizador>.github.io/<repo>/`

## Instalar no telemóvel
- **Android (Chrome):** abre o link → menu ⋮ → **Instalar app**
- **iPhone (Safari):** abre o link → botão Partilhar → **Adicionar ao ecrã principal**

Depois de instalada, abre uma vez com internet; a partir daí funciona offline.

> ⚠️ Os dados vivem só no dispositivo. Exporta uma cópia de segurança de vez em quando (Definições → Exportar).

## Estrutura
```
index.html            # shell da app
styles.css            # visual (glassmorphism lilás)
app.js                # lógica, gráficos SVG, armazenamento
sw.js                 # service worker (offline)
manifest.webmanifest  # metadados PWA
icons/                # ícones da app
```
Sem dependências nem build — HTML, CSS e JavaScript puros.
