# Fechar alerta de escalonamento de privilégio no perfil

Verifiquei as políticas atuais da tabela de perfis. O alerta é informativo: não há vulnerabilidade.

## O que foi verificado
- "Users update own profile" só permite editar o próprio registro (`auth.uid() = id`).
- A checagem de escrita trava o campo `approved` no valor já existente, então ninguém consegue se auto-aprovar.
- Apenas administradores (via função de papel) podem atualizar qualquer perfil.
- Papéis ficam em tabela separada (`user_roles`), com trigger que impede virar admin.

## Ação proposta
1. Marcar o achado `profiles_update_own_profile_role_field` como resolvido no painel de segurança (nenhuma mudança de código ou banco necessária).
2. Registrar na memória de segurança que esse desenho é intencional, para que varreduras futuras não reabram o mesmo alerta.

Nenhum arquivo do app será alterado.
