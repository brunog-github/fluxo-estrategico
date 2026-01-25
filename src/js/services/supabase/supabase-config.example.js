// ARQUIVO DE CONFIGURAÇÃO DO SUPABASE
// ⚠️ NÃO COMMIT CREDENCIAIS REAIS - USE .ENV EM PRODUÇÃO

// Exemplo de credenciais (substitua pelas suas):
export const SUPABASE_CONFIG = {
  // URL do seu projeto Supabase
  // Encontre em: Supabase Console → Settings → API → Project URL
  url: "https://seu-projeto.supabase.co",

  // Chave pública (anon key)
  // Encontre em: Supabase Console → Settings → API → Project API Key (anon public)
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
};

// ========================================
// COMO OBTER SUAS CREDENCIAIS
// ========================================

/*
1. Acesse: https://supabase.com
2. Faça login na sua conta
3. Selecione seu projeto
4. Clique em "Settings" (engrenagem no canto inferior esquerdo)
5. Clique em "API"
6. Você verá:
   - Project URL: Copie este valor para 'url'
   - Project API Key (anon public): Copie este valor para 'key'
   - (Não use service role key em produção frontend)
*/

// ========================================
// OPÇÃO MAIS SEGURA: VARIÁVEIS DE AMBIENTE
// ========================================

/*
Em um projeto real, você deveria:

1. Criar um arquivo .env na raiz do projeto:
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_KEY=sua-chave-publica

2. Usar no código:
   const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
   const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

3. Adicionar .env ao .gitignore para evitar commit de credenciais
*/
