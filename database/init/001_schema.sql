-- =============================================================================
-- Sistema Lanchonete Sabor & Cia — Modelo Lógico (DDL)
-- PostgreSQL 15+
--
-- Derivado do DER em docs/02-der.dbml. Nomenclatura em snake_case (idiomático
-- do Postgres); o mapeamento para camelCase no backend é feito via @map/@@map
-- no schema.prisma (não altera este script).
--
-- Ordem de criação respeita as dependências de FK (tabelas independentes
-- primeiro, tabelas dependentes depois).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Cliente
-- -----------------------------------------------------------------------------
CREATE TABLE cliente (
    id                          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome                        VARCHAR(150) NOT NULL,
    telefone                    VARCHAR(20)  NOT NULL,
    email                       VARCHAR(150),
    endereco_padrao_logradouro  VARCHAR(150),
    endereco_padrao_numero      VARCHAR(10),
    endereco_padrao_bairro      VARCHAR(100),
    endereco_padrao_cidade      VARCHAR(100),
    endereco_padrao_cep         VARCHAR(9),
    criado_em                   TIMESTAMP NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Mesa
-- -----------------------------------------------------------------------------
CREATE TABLE mesa (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    numero  INTEGER NOT NULL UNIQUE,
    ativa   BOOLEAN NOT NULL DEFAULT TRUE
);

-- -----------------------------------------------------------------------------
-- Categoria
-- -----------------------------------------------------------------------------
CREATE TABLE categoria (
    id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome  VARCHAR(50) NOT NULL UNIQUE
);

-- -----------------------------------------------------------------------------
-- item_vendavel / produto / combo
-- Especialização total e disjunta (Produto XOR Combo), implementada com
-- PK compartilhada: produto.id e combo.id referenciam item_vendavel.id.
-- Os triggers no final do arquivo garantem que item_vendavel.tipo sempre
-- reflita em qual das duas tabelas-filha o registro realmente existe.
-- -----------------------------------------------------------------------------
CREATE TABLE item_vendavel (
    id     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome   VARCHAR(150) NOT NULL,
    preco  DECIMAL(10,2) NOT NULL CHECK (preco >= 0),
    tipo   VARCHAR(10) NOT NULL CHECK (tipo IN ('PRODUTO', 'COMBO'))
);

CREATE TABLE produto (
    id            INTEGER PRIMARY KEY REFERENCES item_vendavel(id) ON DELETE CASCADE,
    categoria_id  INTEGER NOT NULL REFERENCES categoria(id) ON DELETE RESTRICT,
    descricao     TEXT
);

CREATE TABLE combo (
    id         INTEGER PRIMARY KEY REFERENCES item_vendavel(id) ON DELETE CASCADE,
    descricao  TEXT
);

-- -----------------------------------------------------------------------------
-- combo_item (associativa N:N — Combo x Produto)
-- -----------------------------------------------------------------------------
CREATE TABLE combo_item (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    combo_id    INTEGER NOT NULL REFERENCES combo(id) ON DELETE CASCADE,
    produto_id  INTEGER NOT NULL REFERENCES produto(id) ON DELETE RESTRICT,
    quantidade  INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    UNIQUE (combo_id, produto_id)
);

-- -----------------------------------------------------------------------------
-- Variacao
-- -----------------------------------------------------------------------------
CREATE TABLE variacao (
    id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    produto_id        INTEGER NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
    nome              VARCHAR(50) NOT NULL,
    preco_adicional   DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (preco_adicional >= 0)
);

-- -----------------------------------------------------------------------------
-- Adicional
-- -----------------------------------------------------------------------------
CREATE TABLE adicional (
    id     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome   VARCHAR(50) NOT NULL,
    preco  DECIMAL(10,2) NOT NULL CHECK (preco >= 0)
);

-- -----------------------------------------------------------------------------
-- Fornecedor / Ingrediente / produto_ingrediente
-- -----------------------------------------------------------------------------
CREATE TABLE fornecedor (
    id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome      VARCHAR(150) NOT NULL,
    telefone  VARCHAR(20),
    email     VARCHAR(150)
);

CREATE TABLE ingrediente (
    id                   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome                 VARCHAR(100) NOT NULL,
    quantidade_estoque   DECIMAL(10,3) NOT NULL DEFAULT 0 CHECK (quantidade_estoque >= 0),
    unidade_medida       VARCHAR(10) NOT NULL CHECK (unidade_medida IN ('kg', 'litro', 'unidade')),
    fornecedor_id        INTEGER NOT NULL REFERENCES fornecedor(id) ON DELETE RESTRICT
);

CREATE TABLE produto_ingrediente (
    id                    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    produto_id            INTEGER NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
    ingrediente_id        INTEGER NOT NULL REFERENCES ingrediente(id) ON DELETE RESTRICT,
    quantidade_utilizada  DECIMAL(10,3) NOT NULL CHECK (quantidade_utilizada > 0),
    UNIQUE (produto_id, ingrediente_id)
);

-- -----------------------------------------------------------------------------
-- Cargo / Funcionario / funcionario_cargo
-- -----------------------------------------------------------------------------
CREATE TABLE cargo (
    id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome  VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE funcionario (
    id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome      VARCHAR(150) NOT NULL,
    telefone  VARCHAR(20),
    email     VARCHAR(150)
);

CREATE TABLE funcionario_cargo (
    id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    funcionario_id   INTEGER NOT NULL REFERENCES funcionario(id) ON DELETE CASCADE,
    cargo_id         INTEGER NOT NULL REFERENCES cargo(id) ON DELETE RESTRICT,
    data_inicio      DATE NOT NULL,
    data_fim         DATE,
    CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

-- -----------------------------------------------------------------------------
-- Promocao / produto_promocao
-- -----------------------------------------------------------------------------
CREATE TABLE promocao (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome            VARCHAR(100) NOT NULL,
    data_inicio     DATE NOT NULL,
    data_fim        DATE NOT NULL,
    tipo_desconto   VARCHAR(10) NOT NULL CHECK (tipo_desconto IN ('VALOR', 'PERCENTUAL')),
    valor_desconto  DECIMAL(10,2) NOT NULL CHECK (valor_desconto > 0),
    CHECK (data_fim >= data_inicio)
);

CREATE TABLE produto_promocao (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    produto_id    INTEGER NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
    promocao_id   INTEGER NOT NULL REFERENCES promocao(id) ON DELETE CASCADE,
    UNIQUE (produto_id, promocao_id)
);

-- -----------------------------------------------------------------------------
-- Cupom
-- -----------------------------------------------------------------------------
CREATE TABLE cupom (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo          VARCHAR(30) NOT NULL UNIQUE,
    tipo_desconto   VARCHAR(10) NOT NULL CHECK (tipo_desconto IN ('VALOR', 'PERCENTUAL')),
    valor_desconto  DECIMAL(10,2) NOT NULL CHECK (valor_desconto > 0),
    data_inicio     DATE NOT NULL,
    data_fim        DATE NOT NULL,
    CHECK (data_fim >= data_inicio)
);

-- -----------------------------------------------------------------------------
-- Forma de pagamento
-- -----------------------------------------------------------------------------
CREATE TABLE forma_pagamento (
    id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome  VARCHAR(30) NOT NULL UNIQUE
);

-- -----------------------------------------------------------------------------
-- Pedido (núcleo transacional)
-- -----------------------------------------------------------------------------
CREATE TABLE pedido (
    id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_hora      TIMESTAMP NOT NULL DEFAULT now(),
    canal          VARCHAR(10) NOT NULL CHECK (canal IN ('BALCAO', 'TELEFONE', 'APP')),
    cliente_id     INTEGER REFERENCES cliente(id) ON DELETE RESTRICT,
    mesa_id        INTEGER REFERENCES mesa(id) ON DELETE RESTRICT,
    atendente_id   INTEGER NOT NULL REFERENCES funcionario(id) ON DELETE RESTRICT,
    cupom_id       INTEGER REFERENCES cupom(id) ON DELETE RESTRICT,
    observacoes    TEXT
);

-- Regra de negócio: um cupom só pode ser usado uma vez por cliente.
-- Índice único parcial (ignora pedidos sem cupom ou sem cliente identificado).
CREATE UNIQUE INDEX ux_pedido_cupom_cliente
    ON pedido (cupom_id, cliente_id)
    WHERE cupom_id IS NOT NULL AND cliente_id IS NOT NULL;

CREATE INDEX ix_pedido_cliente ON pedido (cliente_id);
CREATE INDEX ix_pedido_data_hora ON pedido (data_hora);

-- -----------------------------------------------------------------------------
-- item_pedido (entidade fraca)
-- -----------------------------------------------------------------------------
CREATE TABLE item_pedido (
    id                         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id                  INTEGER NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
    item_vendavel_id           INTEGER NOT NULL REFERENCES item_vendavel(id) ON DELETE RESTRICT,
    variacao_id                INTEGER REFERENCES variacao(id) ON DELETE RESTRICT,
    quantidade                 INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario_praticado   DECIMAL(10,2) NOT NULL CHECK (preco_unitario_praticado >= 0),
    observacao                 VARCHAR(200)
);

CREATE INDEX ix_item_pedido_pedido ON item_pedido (pedido_id);

-- -----------------------------------------------------------------------------
-- item_pedido_adicional (associativa N:N)
-- -----------------------------------------------------------------------------
CREATE TABLE item_pedido_adicional (
    id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    item_pedido_id   INTEGER NOT NULL REFERENCES item_pedido(id) ON DELETE CASCADE,
    adicional_id     INTEGER NOT NULL REFERENCES adicional(id) ON DELETE RESTRICT,
    preco_praticado  DECIMAL(10,2) NOT NULL CHECK (preco_praticado >= 0),
    UNIQUE (item_pedido_id, adicional_id)
);

-- -----------------------------------------------------------------------------
-- status_pedido_historico (entidade fraca — log de status)
-- -----------------------------------------------------------------------------
CREATE TABLE status_pedido_historico (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id   INTEGER NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL CHECK (status IN (
                    'RECEBIDO', 'EM_PREPARO', 'PRONTO',
                    'SAIU_PARA_ENTREGA', 'ENTREGUE_RETIRADO', 'CANCELADO'
                )),
    data_hora   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX ix_status_pedido_historico_pedido ON status_pedido_historico (pedido_id, data_hora);

-- -----------------------------------------------------------------------------
-- pedido_pagamento (associativa N:N)
-- -----------------------------------------------------------------------------
CREATE TABLE pedido_pagamento (
    id                    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id             INTEGER NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
    forma_pagamento_id    INTEGER NOT NULL REFERENCES forma_pagamento(id) ON DELETE RESTRICT,
    valor_pago            DECIMAL(10,2) NOT NULL CHECK (valor_pago > 0)
);

-- -----------------------------------------------------------------------------
-- Entrega (entidade fraca, 1:1 opcional com pedido)
-- -----------------------------------------------------------------------------
CREATE TABLE entrega (
    id                    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id             INTEGER NOT NULL UNIQUE REFERENCES pedido(id) ON DELETE CASCADE,
    entregador_id         INTEGER NOT NULL REFERENCES funcionario(id) ON DELETE RESTRICT,
    endereco_logradouro   VARCHAR(150) NOT NULL,
    endereco_numero       VARCHAR(10) NOT NULL,
    endereco_bairro       VARCHAR(100) NOT NULL,
    endereco_cidade       VARCHAR(100) NOT NULL,
    endereco_cep          VARCHAR(9) NOT NULL,
    taxa_entrega          DECIMAL(10,2) NOT NULL CHECK (taxa_entrega >= 0),
    data_hora_saida       TIMESTAMP,
    data_hora_entrega     TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- avaliacao_pedido (entidade fraca, 1:1 opcional com pedido)
-- -----------------------------------------------------------------------------
CREATE TABLE avaliacao_pedido (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id    INTEGER NOT NULL UNIQUE REFERENCES pedido(id) ON DELETE CASCADE,
    nota         INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
    comentario   TEXT,
    data_hora    TIMESTAMP NOT NULL DEFAULT now()
);

-- =============================================================================
-- Triggers de integridade da especialização item_vendavel -> produto | combo
--
-- SQL padrão não permite CHECK constraints que consultem outras tabelas, então
-- a integridade "todo item_vendavel.tipo bate com a tabela-filha onde ele
-- realmente existe" é garantida aqui via trigger, não via CHECK.
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_set_item_vendavel_tipo_produto()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE item_vendavel SET tipo = 'PRODUTO' WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_produto_set_tipo
    AFTER INSERT ON produto
    FOR EACH ROW EXECUTE FUNCTION fn_set_item_vendavel_tipo_produto();

CREATE OR REPLACE FUNCTION fn_set_item_vendavel_tipo_combo()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE item_vendavel SET tipo = 'COMBO' WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_combo_set_tipo
    AFTER INSERT ON combo
    FOR EACH ROW EXECUTE FUNCTION fn_set_item_vendavel_tipo_combo();
