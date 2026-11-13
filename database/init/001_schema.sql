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
--
-- Convenções:
--   * Instantes (data + hora) usam TIMESTAMPTZ: o Postgres guarda o instante
--     em UTC e converte na leitura, então o valor não depende do fuso do
--     servidor nem do fuso da sessão que gravou. Datas "de calendário"
--     (validade de promoção/cupom, período de um cargo) continuam DATE.
--   * Toda chave estrangeira tem índice (o Postgres cria índice sozinho só
--     para PRIMARY KEY e UNIQUE, não para FK).
--   * Regras que um CHECK não consegue expressar (porque dependem de outra
--     tabela) ficam nos triggers do final do arquivo.
--
-- Este script roda sozinho apenas quando o volume do banco está vazio
-- (docker-entrypoint-initdb.d). Para aplicar uma versão nova em um ambiente
-- que já subiu antes: `docker compose down -v` e `docker compose up --build`.
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
    criado_em                   TIMESTAMPTZ NOT NULL DEFAULT now()
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
-- Os triggers no final do arquivo garantem que todo item_vendavel exista em
-- exatamente uma das duas tabelas-filha e que item_vendavel.tipo diga qual.
-- -----------------------------------------------------------------------------
CREATE TABLE item_vendavel (
    id     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome   VARCHAR(150) NOT NULL,
    preco  DECIMAL(10,2) NOT NULL CHECK (preco >= 0),
    tipo   VARCHAR(10) NOT NULL CHECK (tipo IN ('PRODUTO', 'COMBO')),
    -- Item que já foi vendido não pode ser apagado (item_pedido aponta para
    -- ele). Para tirá-lo do cardápio sem perder o histórico, desativa-se.
    ativo  BOOLEAN NOT NULL DEFAULT TRUE
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

CREATE INDEX ix_produto_categoria ON produto (categoria_id);

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

CREATE INDEX ix_combo_item_produto ON combo_item (produto_id);

-- -----------------------------------------------------------------------------
-- Variacao
-- -----------------------------------------------------------------------------
CREATE TABLE variacao (
    id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    produto_id        INTEGER NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
    nome              VARCHAR(50) NOT NULL,
    preco_adicional   DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (preco_adicional >= 0)
);

CREATE INDEX ix_variacao_produto ON variacao (produto_id);

-- -----------------------------------------------------------------------------
-- Adicional
-- -----------------------------------------------------------------------------
CREATE TABLE adicional (
    id     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome   VARCHAR(50) NOT NULL,
    preco  DECIMAL(10,2) NOT NULL CHECK (preco >= 0),
    ativo  BOOLEAN NOT NULL DEFAULT TRUE
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

CREATE INDEX ix_ingrediente_fornecedor ON ingrediente (fornecedor_id);
CREATE INDEX ix_produto_ingrediente_ingrediente ON produto_ingrediente (ingrediente_id);

-- -----------------------------------------------------------------------------
-- Cargo / Funcionario / funcionario_cargo
-- -----------------------------------------------------------------------------
CREATE TABLE cargo (
    id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome  VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE funcionario (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome        VARCHAR(150) NOT NULL,
    telefone    VARCHAR(20),
    email       VARCHAR(150),
    -- Funcionário desligado é desativado, não apagado: os pedidos que ele
    -- atendeu/entregou e o histórico de cargos continuam apontando para ele.
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    -- Acesso ao sistema (opcional: nem todo funcionário usa o sistema).
    -- senha_hash guarda o resultado do scrypt, nunca a senha.
    login       VARCHAR(50) UNIQUE,
    senha_hash  VARCHAR(255),
    CONSTRAINT ck_funcionario_credenciais
        CHECK ((login IS NULL) = (senha_hash IS NULL))
);

CREATE TABLE funcionario_cargo (
    id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- RESTRICT (e não CASCADE): apagar um funcionário não pode levar junto o
    -- histórico de cargos, que é exatamente o que esta tabela existe para guardar.
    funcionario_id   INTEGER NOT NULL REFERENCES funcionario(id) ON DELETE RESTRICT,
    cargo_id         INTEGER NOT NULL REFERENCES cargo(id) ON DELETE RESTRICT,
    data_inicio      DATE NOT NULL,
    data_fim         DATE,
    CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

-- Um funcionário não pode ter o MESMO cargo aberto duas vezes ao mesmo tempo
-- (cargos diferentes simultâneos são permitidos).
CREATE UNIQUE INDEX ux_funcionario_cargo_aberto
    ON funcionario_cargo (funcionario_id, cargo_id)
    WHERE data_fim IS NULL;

CREATE INDEX ix_funcionario_cargo_funcionario ON funcionario_cargo (funcionario_id);
CREATE INDEX ix_funcionario_cargo_cargo ON funcionario_cargo (cargo_id);

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
    CHECK (data_fim >= data_inicio),
    CONSTRAINT ck_promocao_percentual
        CHECK (tipo_desconto <> 'PERCENTUAL' OR valor_desconto <= 100)
);

CREATE TABLE produto_promocao (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    produto_id    INTEGER NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
    promocao_id   INTEGER NOT NULL REFERENCES promocao(id) ON DELETE CASCADE,
    UNIQUE (produto_id, promocao_id)
);

CREATE INDEX ix_produto_promocao_promocao ON produto_promocao (promocao_id);

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
    CHECK (data_fim >= data_inicio),
    CONSTRAINT ck_cupom_percentual
        CHECK (tipo_desconto <> 'PERCENTUAL' OR valor_desconto <= 100)
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
    data_hora      TIMESTAMPTZ NOT NULL DEFAULT now(),
    canal          VARCHAR(10) NOT NULL CHECK (canal IN ('BALCAO', 'TELEFONE', 'APP')),
    cliente_id     INTEGER REFERENCES cliente(id) ON DELETE RESTRICT,
    mesa_id        INTEGER REFERENCES mesa(id) ON DELETE RESTRICT,
    atendente_id   INTEGER NOT NULL REFERENCES funcionario(id) ON DELETE RESTRICT,
    cupom_id       INTEGER REFERENCES cupom(id) ON DELETE RESTRICT,
    observacoes    TEXT,
    -- Atributo DERIVADO: cópia do status mais recente de
    -- status_pedido_historico, que continua sendo a fonte da verdade. A
    -- aplicação nunca escreve aqui — quem mantém é o trigger
    -- trg_status_historico_atualiza_pedido (final do arquivo). Existe para que
    -- "pedidos EM_PREPARO" (a tela da cozinha) seja uma busca por índice, e
    -- não uma subconsulta no histórico para cada pedido.
    status_atual   VARCHAR(20) NOT NULL DEFAULT 'RECEBIDO' CHECK (status_atual IN (
                       'RECEBIDO', 'EM_PREPARO', 'PRONTO',
                       'SAIU_PARA_ENTREGA', 'ENTREGUE_RETIRADO', 'CANCELADO'
                   ))
);

-- Regra de negócio: um cupom só pode ser usado uma vez por cliente.
-- Índice único parcial (ignora pedidos sem cupom ou sem cliente identificado).
CREATE UNIQUE INDEX ux_pedido_cupom_cliente
    ON pedido (cupom_id, cliente_id)
    WHERE cupom_id IS NOT NULL AND cliente_id IS NOT NULL;

CREATE INDEX ix_pedido_cliente ON pedido (cliente_id);
CREATE INDEX ix_pedido_data_hora ON pedido (data_hora);
CREATE INDEX ix_pedido_status_data_hora ON pedido (status_atual, data_hora);
CREATE INDEX ix_pedido_atendente ON pedido (atendente_id);
CREATE INDEX ix_pedido_mesa ON pedido (mesa_id);
CREATE INDEX ix_pedido_cupom ON pedido (cupom_id);

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
CREATE INDEX ix_item_pedido_item_vendavel ON item_pedido (item_vendavel_id);
CREATE INDEX ix_item_pedido_variacao ON item_pedido (variacao_id);

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

CREATE INDEX ix_item_pedido_adicional_adicional ON item_pedido_adicional (adicional_id);

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
    data_hora   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_status_pedido_historico_pedido ON status_pedido_historico (pedido_id, data_hora);

-- -----------------------------------------------------------------------------
-- pedido_pagamento (associativa N:N)
-- -----------------------------------------------------------------------------
CREATE TABLE pedido_pagamento (
    id                    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id             INTEGER NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
    forma_pagamento_id    INTEGER NOT NULL REFERENCES forma_pagamento(id) ON DELETE RESTRICT,
    valor_pago            DECIMAL(10,2) NOT NULL CHECK (valor_pago > 0),
    -- Preenchido quando o pedido é cancelado depois de pago: o pagamento não
    -- é apagado (o dinheiro entrou e saiu do caixa — os dois fatos ficam
    -- registrados), apenas deixa de contar como valor pago.
    estornado_em          TIMESTAMPTZ
);

CREATE INDEX ix_pedido_pagamento_pedido ON pedido_pagamento (pedido_id);
CREATE INDEX ix_pedido_pagamento_forma ON pedido_pagamento (forma_pagamento_id);

-- -----------------------------------------------------------------------------
-- Entrega (entidade fraca, 1:1 opcional com pedido)
-- -----------------------------------------------------------------------------
CREATE TABLE entrega (
    id                    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id             INTEGER NOT NULL UNIQUE REFERENCES pedido(id) ON DELETE CASCADE,
    -- Opcional na criação: quando o pedido é registrado ainda não se sabe
    -- qual entregador estará livre. A aplicação exige que esteja preenchido
    -- para o pedido passar a SAIU_PARA_ENTREGA.
    entregador_id         INTEGER REFERENCES funcionario(id) ON DELETE RESTRICT,
    endereco_logradouro   VARCHAR(150) NOT NULL,
    endereco_numero       VARCHAR(10) NOT NULL,
    endereco_bairro       VARCHAR(100) NOT NULL,
    endereco_cidade       VARCHAR(100) NOT NULL,
    endereco_cep          VARCHAR(9) NOT NULL,
    taxa_entrega          DECIMAL(10,2) NOT NULL CHECK (taxa_entrega >= 0),
    data_hora_saida       TIMESTAMPTZ,
    data_hora_entrega     TIMESTAMPTZ
);

CREATE INDEX ix_entrega_entregador ON entrega (entregador_id);

-- -----------------------------------------------------------------------------
-- avaliacao_pedido (entidade fraca, 1:1 opcional com pedido)
-- -----------------------------------------------------------------------------
CREATE TABLE avaliacao_pedido (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id    INTEGER NOT NULL UNIQUE REFERENCES pedido(id) ON DELETE CASCADE,
    nota         INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
    comentario   TEXT,
    data_hora    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- TRIGGERS
--
-- CHECK constraint só enxerga a própria linha. As regras abaixo dependem de
-- OUTRA tabela, por isso são garantidas por trigger.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Especialização item_vendavel -> produto | combo
--
-- (a) item_vendavel.tipo acompanha a tabela-filha em que o registro foi criado.
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- (b) Especialização TOTAL e DISJUNTA: todo item_vendavel existe em exatamente
--     uma das tabelas produto/combo, e `tipo` diz qual.
--
-- É um CONSTRAINT TRIGGER "DEFERRABLE INITIALLY DEFERRED": a verificação roda
-- no COMMIT, e não a cada comando. Precisa ser assim porque o cadastro é
-- sempre em dois passos dentro da mesma transação (primeiro item_vendavel,
-- depois produto ou combo): entre um passo e outro o item ainda está "sem
-- filho", e isso só é erro se continuar assim quando a transação terminar.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_verificar_especializacao()
RETURNS TRIGGER AS $$
DECLARE
    v_ids         INTEGER[];
    v_id          INTEGER;
    v_tipo        TEXT;
    v_em_produto  BOOLEAN;
    v_em_combo    BOOLEAN;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_ids := ARRAY[NEW.id];
    ELSIF TG_OP = 'DELETE' THEN
        v_ids := ARRAY[OLD.id];
    ELSE
        v_ids := ARRAY[OLD.id, NEW.id];
    END IF;

    FOREACH v_id IN ARRAY v_ids LOOP
        SELECT tipo INTO v_tipo FROM item_vendavel WHERE id = v_id;
        -- O supertipo foi apagado na mesma transação: nada a verificar.
        CONTINUE WHEN NOT FOUND;

        v_em_produto := EXISTS (SELECT 1 FROM produto WHERE id = v_id);
        v_em_combo   := EXISTS (SELECT 1 FROM combo   WHERE id = v_id);

        IF v_em_produto = v_em_combo THEN
            RAISE EXCEPTION
                'item_vendavel % deve existir em exatamente uma das tabelas produto/combo', v_id
                USING ERRCODE = 'integrity_constraint_violation';
        END IF;

        IF v_tipo <> (CASE WHEN v_em_produto THEN 'PRODUTO' ELSE 'COMBO' END) THEN
            RAISE EXCEPTION
                'item_vendavel %: tipo "%" não corresponde à tabela-filha', v_id, v_tipo
                USING ERRCODE = 'integrity_constraint_violation';
        END IF;
    END LOOP;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_item_vendavel_especializacao
    AFTER INSERT OR UPDATE OF tipo ON item_vendavel
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fn_verificar_especializacao();

CREATE CONSTRAINT TRIGGER trg_produto_especializacao
    AFTER INSERT OR DELETE OR UPDATE OF id ON produto
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fn_verificar_especializacao();

CREATE CONSTRAINT TRIGGER trg_combo_especializacao
    AFTER INSERT OR DELETE OR UPDATE OF id ON combo
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fn_verificar_especializacao();

-- -----------------------------------------------------------------------------
-- 2) Status do pedido
--
-- O histórico (status_pedido_historico) é a fonte da verdade; pedido.status_atual
-- é uma cópia mantida aqui. Os quatro triggers abaixo fecham o ciclo:
--   (a) todo pedido nasce com a linha RECEBIDO no histórico;
--   (b) cada nova linha do histórico atualiza pedido.status_atual;
--   (c) ninguém altera pedido.status_atual por fora do histórico;
--   (d) o histórico é somente-inserção (não se corrige nem se apaga o passado).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_pedido_status_inicial()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO status_pedido_historico (pedido_id, status, data_hora)
    VALUES (NEW.id, 'RECEBIDO', NEW.data_hora);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pedido_status_inicial
    AFTER INSERT ON pedido
    FOR EACH ROW EXECUTE FUNCTION fn_pedido_status_inicial();

CREATE OR REPLACE FUNCTION fn_status_historico_atualiza_pedido()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE pedido SET status_atual = NEW.status WHERE id = NEW.pedido_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_status_historico_atualiza_pedido
    AFTER INSERT ON status_pedido_historico
    FOR EACH ROW EXECUTE FUNCTION fn_status_historico_atualiza_pedido();

-- pg_trigger_depth() diz quantos triggers estão "empilhados" neste momento.
-- Um UPDATE vindo direto do cliente dispara este trigger com profundidade 1;
-- o UPDATE feito pelo trigger (b) chega aqui com profundidade 2. É assim que
-- distinguimos a atualização legítima de uma escrita por fora.
CREATE OR REPLACE FUNCTION fn_pedido_protege_status_atual()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status_atual IS DISTINCT FROM OLD.status_atual AND pg_trigger_depth() < 2 THEN
        RAISE EXCEPTION
            'pedido.status_atual é derivado: insira uma linha em status_pedido_historico'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pedido_protege_status_atual
    BEFORE UPDATE OF status_atual ON pedido
    FOR EACH ROW EXECUTE FUNCTION fn_pedido_protege_status_atual();

CREATE OR REPLACE FUNCTION fn_status_historico_somente_insercao()
RETURNS TRIGGER AS $$
BEGIN
    -- Única exceção: o pedido inteiro está sendo apagado (ON DELETE CASCADE).
    -- Nesse caso a linha de pedido já não existe quando o histórico é limpo.
    IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM pedido WHERE id = OLD.pedido_id) THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION
        'status_pedido_historico é somente-inserção: registre um novo status em vez de alterar o histórico'
        USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_status_historico_somente_insercao
    BEFORE UPDATE OR DELETE ON status_pedido_historico
    FOR EACH ROW EXECUTE FUNCTION fn_status_historico_somente_insercao();
