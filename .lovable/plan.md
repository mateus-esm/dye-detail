## Problema

A fonte está parecendo apagada porque:
1. `Neue Montreal Light` (peso 300) foi aplicada como fonte padrão do **corpo inteiro** — peso 300 em telas claras dá sensação de "lavado".
2. O arquivo enviado contém apenas o peso Light; pedidos de `font-weight: 400/500/600` caem em fallback ou continuam finos.
3. `--muted-foreground` e `--foreground` ficaram com contraste baixo demais no tema light.

## Plano de ajuste

### 1. Tipografia (`src/index.css`)
- Manter `Neue Montreal Light` registrada, mas usá-la **apenas em uma classe utilitária `.font-display`** para títulos grandes / logo (onde Light fica elegante).
- Voltar o **body** para `Inter` com `font-weight: 400` (em vez de 300) — leitura nítida em mobile.
- **Headings** (`h1–h6`): `Inter` com `font-weight: 600` e tracking levemente apertado, mantendo a estética sóbria.
- Aplicar `-webkit-font-smoothing: antialiased` e `text-rendering: optimizeLegibility` no body para reforçar nitidez.

### 2. Contraste de cores (light + dark)
Light theme:
- `--foreground`: de `20 10% 12%` → `20 14% 10%` (mais escuro, leitura firme).
- `--muted-foreground`: de `20 5% 42%` → `20 6% 32%` (subtítulos legíveis).
- `--border`: leve aumento de contraste para `30 6% 84%`.

Dark theme:
- `--foreground`: subir para `30 8% 96%`.
- `--muted-foreground`: para `30 5% 68%`.

### 3. Logo / display
- `BrandLogo`: aplicar `.font-display` (Neue Montreal Light) só no nome "Duda Hair" em tamanho grande, mantendo o resto em Inter para consistência.

### 4. Polimento geral
- Headers internos das páginas: peso 600 + ligeiro `tracking-tight`.
- Pequenos labels uppercase: peso 500 (em vez de regular) para destacar sem aumentar saturação.
- Cards: aumentar levemente `shadow-elevated` no light mode para dar separação.

## Arquivos afetados
- `src/index.css` — `@font-face`, tokens, regras base, utilitário `.font-display`.
- `src/components/BrandLogo.tsx` — aplicar `font-display` no nome.

Sem mudanças de funcionalidade, apenas ajuste visual.