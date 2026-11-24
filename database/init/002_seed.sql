-- =============================================================================
-- Sistema Lanchonete Sabor & Cia — Dados iniciais (seed)
--
-- Roda logo depois de 001_schema.sql (a imagem do Postgres executa os arquivos
-- de docker-entrypoint-initdb.d em ordem alfabética), também só quando o
-- volume do banco está vazio.
--
-- Contém apenas os DOMÍNIOS que o enunciado fixa e sem os quais o sistema não
-- opera: sem cargo "atendente" ninguém registra pedido, sem forma de pagamento
-- ninguém paga. Cardápio, clientes e funcionários são cadastrados pela API.
--
-- O primeiro usuário (gerente) NÃO é criado aqui: a senha precisa passar pelo
-- hash da aplicação, então é o backend que o cria na primeira subida, a partir
-- das variáveis ADMIN_LOGIN / ADMIN_SENHA.
-- =============================================================================

-- Regra de negócio 4.5. Os nomes abaixo são usados pela aplicação para decidir
-- permissões (ver backend/src/lib/cargos.ts) — por isso a API não deixa
-- renomear nem remover estes quatro.
INSERT INTO cargo (nome) VALUES
    ('atendente'),
    ('cozinheiro'),
    ('entregador'),
    ('gerente')
ON CONFLICT (nome) DO NOTHING;

-- Regra de negócio 4.3.
INSERT INTO forma_pagamento (nome) VALUES
    ('dinheiro'),
    ('cartao_debito'),
    ('cartao_credito'),
    ('pix'),
    ('vale_refeicao')
ON CONFLICT (nome) DO NOTHING;

-- Regra de negócio 4.2 (categorias citadas no enunciado).
INSERT INTO categoria (nome) VALUES
    ('Lanches'),
    ('Bebidas'),
    ('Porções'),
    ('Sobremesas')
ON CONFLICT (nome) DO NOTHING;
