# 🐷 Savvy

App pessoal para registar gastos mensais (fixos e pontuais), ver estatísticas e acompanhar objetivos de poupança.

- **Sem login** — os dados ficam guardados apenas no teu dispositivo (localStorage)
- **Funciona offline** — PWA com service worker
- **Instalável no telemóvel** — como uma app normal, com ícone no ecrã principal

## Funcionalidades
- **Dashboard** — saldo do mês, evolução das despesas, histórico receitas vs despesas, eficiência (taxa de poupança), movimentos recentes
- **Movimentos** — despesas/receitas pontuais e **fixos mensais** que se repetem automaticamente (podem ser terminados mantendo o histórico)
- **Estatísticas** — gastos por categoria, comparação com o mês anterior, média diária e mensal, fixos vs pontuais, 12 meses
- **Objetivos** — metas de poupança com prazo, progresso e quanto juntar por mês
- **Definições** — moeda, cópia de segurança (exportar/importar JSON), exportar CSV

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
