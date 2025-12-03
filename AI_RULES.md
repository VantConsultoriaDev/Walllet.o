# Regras de Desenvolvimento e Stack Técnica (AI_RULES)

Este documento descreve a stack técnica utilizada no projeto Wallet.o e estabelece regras claras para a utilização de bibliotecas e padrões de código.

## 1. Stack Técnica Principal

O projeto é construído sobre as seguintes tecnologias:

*   **Linguagem:** TypeScript (obrigatório para tipagem e segurança).
*   **Framework:** React (com Hooks e Componentes Funcionais).
*   **Roteamento:** React Router (v6+).
*   **Estilização:** Tailwind CSS (exclusivo para todos os estilos).
*   **Componentes UI:** shadcn/ui (construído sobre Radix UI).
*   **Ícones:** `lucide-react`.
*   **Animações:** `framer-motion`.
*   **Visualização de Dados:** `recharts`.
*   **Formulários:** `react-hook-form` e `zod` (para validação).
*   **Data/Tempo:** `date-fns`.

## 2. Diretrizes de Código e Arquitetura

### 2.1 Estrutura de Arquivos

*   **Código Fonte:** Todo o código deve residir em `src/`.
*   **Páginas:** Devem ser colocadas em `src/pages/`.
*   **Componentes:** Devem ser colocados em `src/components/`.
*   **Componentes Novos:** Crie um novo arquivo para cada novo componente ou hook, mantendo os arquivos pequenos e focados (idealmente < 100 linhas).

### 2.2 Regras de Estilização e UI

*   **Responsividade:** Todos os designs devem ser responsivos por padrão, utilizando as classes utilitárias do Tailwind CSS.
*   **Componentes:** Priorize o uso dos componentes pré-existentes do shadcn/ui. Se for necessária uma variação, crie um novo componente que utilize os primitivos do shadcn/ui, mas **nunca edite** os arquivos originais do shadcn/ui.
*   **Ícones:** Utilize apenas ícones do pacote `lucide-react`.

### 2.3 Regras de Roteamento e Navegação

*   **Rotas:** Mantenha a definição central de rotas no arquivo `src/App.tsx`.
*   **Navegação:** Utilize os hooks e componentes do `react-router-dom` (ex: `useNavigate`, `Link`).

### 2.4 Regras de Dados e Feedback

*   **Autenticação/Backend:** Utilize o mock de `supabase` fornecido em `src/lib/supabase.ts` para simular interações de autenticação.
*   **Notificações:** Utilize o sistema de `toast` (baseado em shadcn/ui/radix) para fornecer feedback ao usuário sobre ações importantes (sucesso, erro, carregamento).
*   **Erros:** Não utilize blocos `try/catch` a menos que seja estritamente necessário para a lógica de UI (ex: tratamento de erro de formulário). Deixe os erros de API/lógica subirem para facilitar a depuração.