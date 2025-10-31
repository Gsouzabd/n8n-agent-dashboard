-- Script para criar usuário admin
-- Execute este script no SQL Editor do Supabase
-- OU use o painel Auth > Users > Add User

-- Opção 1: Via SQL (usando função interna do Supabase)
-- NOTA: Este método pode não funcionar dependendo das permissões

-- Verificar se usuário já existe
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'admin@magentron.com.br';

-- Se não existir, você tem 2 opções:

/*
OPÇÃO 1: VIA PAINEL DO SUPABASE (Recomendado)
=========================================
1. Acesse: Dashboard > Authentication > Users
2. Clique em "Add User"
3. Preencha:
   - Email: admin@magentron.com.br
   - Password: Ukg$#^2mag
   - Email Confirm: Sim
4. Clique em "Create User"

OPÇÃO 2: VIA API REST
=====================
Use o endpoint de administração do Supabase:

curl -X POST 'https://[PROJECT_ID].supabase.co/auth/v1/admin/users' \
  -H 'apikey: [SERVICE_ROLE_KEY]' \
  -H 'Authorization: Bearer [SERVICE_ROLE_KEY]' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@magentron.com.br",
    "password": "Ukg$#^2mag",
    "email_confirm": true
  }'

OPÇÃO 3: VIA REGISTRO NORMAL
============================
1. Acesse a página de registro do app
2. Preencha:
   - Email: admin@magentron.com.br
   - Senha: Ukg$#^2mag
3. Confirme o email (ou use SQL abaixo para confirmar)
*/

-- Para confirmar email de um usuário existente (após criar):
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW()
-- WHERE email = 'admin@magentron.com.br';

-- Verificar criação
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'admin@magentron.com.br';









