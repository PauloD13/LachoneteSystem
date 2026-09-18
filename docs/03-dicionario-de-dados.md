# Dicionário de Dados — Sistema Lanchonete Sabor & Cia

> Derivado diretamente de `docs/02-der.dbml`. Convenções de tipo/tamanho já
> antecipam o Modelo Lógico (PostgreSQL), mas este documento descreve o
> **significado de negócio** de cada dado — é ele que precisa ser
> compreensível para alguém que não conhece o projeto.

Legenda da coluna **Chave**: PK = primária · FK = estrangeira · CD = candidata
(unique, não PK) · — = não é chave.

## cliente

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único do cliente |
| nome | VARCHAR | 150 | — | Sim | Nome do cliente |
| telefone | VARCHAR | 20 | — | Sim | Contato principal do cliente |
| email | VARCHAR | 150 | — | Não | E-mail de contato, quando informado |
| endereco_padrao_logradouro | VARCHAR | 150 | — | Não | Rua/avenida do endereço padrão sugerido para entregas futuras |
| endereco_padrao_numero | VARCHAR | 10 | — | Não | Número do endereço padrão |
| endereco_padrao_bairro | VARCHAR | 100 | — | Não | Bairro do endereço padrão |
| endereco_padrao_cidade | VARCHAR | 100 | — | Não | Cidade do endereço padrão |
| endereco_padrao_cep | VARCHAR | 9 | — | Não | CEP do endereço padrão |
| criado_em | TIMESTAMP | — | — | Sim | Data/hora do cadastro do cliente |

Regra de negócio aplicada na camada de aplicação (não em constraint de
schema): cadastro completo (nome, contato, endereço) só é exigido quando o
pedido é feito via app ou é delivery; pedidos de balcão não exigem cliente.

## mesa

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único da mesa |
| numero | INTEGER | — | CD | Sim | Número visível da mesa no salão |
| ativa | BOOLEAN | — | — | Sim | Indica se a mesa está em uso/disponível |

## categoria

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único da categoria |
| nome | VARCHAR | 50 | CD | Sim | Nome da categoria (lanches, bebidas, porções, sobremesas) |

## item_vendavel

Supertipo da especialização total/disjunta Produto/Combo. Não é exposto
diretamente ao usuário final — existe para permitir que `item_pedido`
referencie produto ou combo de forma unificada.

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único do item vendável |
| nome | VARCHAR | 150 | — | Sim | Nome comercial exibido no cardápio |
| preco | DECIMAL | 10,2 | — | Sim | Preço-base (produto) ou preço promocional do conjunto (combo) |
| tipo | VARCHAR | 10 | — | Sim | Discriminador: `PRODUTO` ou `COMBO` |

## produto

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK, FK → item_vendavel.id | Sim | Mesma PK do item_vendavel correspondente (herança 1:1) |
| categoria_id | INTEGER | — | FK → categoria.id | Sim | Categoria à qual o produto pertence |
| descricao | TEXT | — | — | Não | Descrição detalhada do produto (ingredientes, modo de preparo resumido) |

## combo

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK, FK → item_vendavel.id | Sim | Mesma PK do item_vendavel correspondente (herança 1:1) |
| descricao | TEXT | — | — | Não | Descrição do combo |

## combo_item

Entidade associativa N:N entre Combo e Produto.

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único da associação |
| combo_id | INTEGER | — | FK → combo.id | Sim | Combo ao qual o item pertence |
| produto_id | INTEGER | — | FK → produto.id | Sim | Produto que compõe o combo |
| quantidade | INTEGER | — | — | Sim | Quantas unidades desse produto entram no combo |

Restrição: par (combo_id, produto_id) único — um produto não se repete no
mesmo combo.

## variacao

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único da variação |
| produto_id | INTEGER | — | FK → produto.id | Sim | Produto ao qual a variação se aplica |
| nome | VARCHAR | 50 | — | Sim | Nome da variação (ex.: "Grande", "Ao ponto") |
| preco_adicional | DECIMAL | 10,2 | — | Sim | Valor somado (ou zero) ao preço-base do produto quando essa variação é escolhida |

## adicional

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único do adicional |
| nome | VARCHAR | 50 | — | Sim | Nome do adicional (ex.: "bacon extra") |
| preco | DECIMAL | 10,2 | — | Sim | Preço do adicional |

## fornecedor

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único do fornecedor |
| nome | VARCHAR | 150 | — | Sim | Razão social/nome do fornecedor |
| telefone | VARCHAR | 20 | — | Não | Contato telefônico |
| email | VARCHAR | 150 | — | Não | Contato por e-mail |

## ingrediente

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único do ingrediente |
| nome | VARCHAR | 100 | — | Sim | Nome do ingrediente/insumo |
| quantidade_estoque | DECIMAL | 10,3 | — | Sim | Quantidade atualmente disponível em estoque, na unidade_medida definida |
| unidade_medida | VARCHAR | 10 | — | Sim | Unidade de medida do estoque: `kg`, `litro` ou `unidade` |
| fornecedor_id | INTEGER | — | FK → fornecedor.id | Sim | Fornecedor responsável pelo abastecimento deste ingrediente |

## produto_ingrediente

Entidade associativa N:N — "ficha técnica" de cada produto.

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único da associação |
| produto_id | INTEGER | — | FK → produto.id | Sim | Produto que consome o ingrediente |
| ingrediente_id | INTEGER | — | FK → ingrediente.id | Sim | Ingrediente consumido |
| quantidade_utilizada | DECIMAL | 10,3 | — | Sim | Quantidade do ingrediente usada em uma unidade do produto, na unidade_medida do ingrediente |

Base para o requisito 4.6 (estimar consumo de estoque a partir da venda) e
para a consulta obrigatória de "consumo estimado de ingredientes" (seção
5.2): `SUM(quantidade_utilizada * quantidade_vendida)` por ingrediente.

## cargo

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único do cargo |
| nome | VARCHAR | 30 | CD | Sim | Nome do cargo: atendente, cozinheiro, entregador ou gerente |

## funcionario

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único do funcionário |
| nome | VARCHAR | 150 | — | Sim | Nome do funcionário |
| telefone | VARCHAR | 20 | — | Não | Contato telefônico |
| email | VARCHAR | 150 | — | Não | Contato por e-mail |

## funcionario_cargo

Entidade associativa histórica N:N entre Funcionário e Cargo.

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único do registro de vínculo |
| funcionario_id | INTEGER | — | FK → funcionario.id | Sim | Funcionário vinculado |
| cargo_id | INTEGER | — | FK → cargo.id | Sim | Cargo exercido |
| data_inicio | DATE | — | — | Sim | Data em que o funcionário passou a exercer esse cargo |
| data_fim | DATE | — | — | Não | Data em que deixou de exercer esse cargo (NULL = cargo atualmente ativo) |

## promocao

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único da promoção |
| nome | VARCHAR | 100 | — | Sim | Nome/descrição curta da promoção |
| data_inicio | DATE | — | — | Sim | Data de início da vigência |
| data_fim | DATE | — | — | Sim | Data de término da vigência |
| tipo_desconto | VARCHAR | 10 | — | Sim | `VALOR` (desconto fixo em R$) ou `PERCENTUAL` |
| valor_desconto | DECIMAL | 10,2 | — | Sim | Valor ou percentual de desconto, conforme tipo_desconto |

## produto_promocao

Entidade associativa N:N — histórico de participação de produtos em
promoções.

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único da associação |
| produto_id | INTEGER | — | FK → produto.id | Sim | Produto participante |
| promocao_id | INTEGER | — | FK → promocao.id | Sim | Promoção da qual o produto participa |

## cupom

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único do cupom |
| codigo | VARCHAR | 30 | CD | Sim | Código informado pelo cliente para aplicar o desconto |
| tipo_desconto | VARCHAR | 10 | — | Sim | `VALOR` ou `PERCENTUAL` |
| valor_desconto | DECIMAL | 10,2 | — | Sim | Valor ou percentual de desconto, conforme tipo_desconto |
| data_inicio | DATE | — | — | Sim | Início da validade do cupom |
| data_fim | DATE | — | — | Sim | Fim da validade do cupom |

## forma_pagamento

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único da forma de pagamento |
| nome | VARCHAR | 30 | CD | Sim | dinheiro, cartao_debito, cartao_credito, pix, vale_refeicao |

## pedido

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único do pedido |
| data_hora | TIMESTAMP | — | — | Sim | Data/hora de criação do pedido |
| canal | VARCHAR | 10 | — | Sim | Canal de origem: `BALCAO`, `TELEFONE` ou `APP` |
| cliente_id | INTEGER | — | FK → cliente.id | Não | Cliente do pedido; obrigatório apenas para pedidos via app/delivery (regra de negócio) |
| mesa_id | INTEGER | — | FK → mesa.id | Não | Mesa associada; preenchido apenas em consumo local |
| atendente_id | INTEGER | — | FK → funcionario.id | Sim | Funcionário (atendente) que registrou o pedido — usado para cálculo de comissão |
| cupom_id | INTEGER | — | FK → cupom.id | Não | Cupom de desconto aplicado, se houver |
| observacoes | TEXT | — | — | Não | Observações gerais do pedido |

**Atributo derivado (não persistido):** status atual = registro mais
recente do pedido em `status_pedido_historico`, ordenado por `data_hora`.

## item_pedido

Entidade fraca — depende de `pedido`.

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único do item |
| pedido_id | INTEGER | — | FK → pedido.id | Sim | Pedido ao qual o item pertence |
| item_vendavel_id | INTEGER | — | FK → item_vendavel.id | Sim | Produto ou combo vendido (via supertipo) |
| variacao_id | INTEGER | — | FK → variacao.id | Não | Variação escolhida, quando item_vendavel é um produto que aceita variação |
| quantidade | INTEGER | — | — | Sim | Quantidade vendida deste item |
| preco_unitario_praticado | DECIMAL | 10,2 | — | Sim | Preço unitário efetivamente cobrado no momento da venda (congelado) |
| observacao | VARCHAR | 200 | — | Não | Observação de preparo (ex.: "sem cebola") |

## item_pedido_adicional

Entidade associativa N:N entre item_pedido e adicional.

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único da associação |
| item_pedido_id | INTEGER | — | FK → item_pedido.id | Sim | Item do pedido ao qual o adicional foi incluído |
| adicional_id | INTEGER | — | FK → adicional.id | Sim | Adicional escolhido |
| preco_praticado | DECIMAL | 10,2 | — | Sim | Preço do adicional cobrado no momento da venda (congelado) |

## status_pedido_historico

Entidade fraca — log completo de mudanças de status do pedido.

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único do registro |
| pedido_id | INTEGER | — | FK → pedido.id | Sim | Pedido ao qual o status se refere |
| status | VARCHAR | 20 | — | Sim | `RECEBIDO`, `EM_PREPARO`, `PRONTO`, `SAIU_PARA_ENTREGA`, `ENTREGUE_RETIRADO` ou `CANCELADO` |
| data_hora | TIMESTAMP | — | — | Sim | Momento exato em que o pedido passou a ter esse status |

## pedido_pagamento

Entidade associativa N:N entre pedido e forma_pagamento.

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único do registro de pagamento |
| pedido_id | INTEGER | — | FK → pedido.id | Sim | Pedido pago |
| forma_pagamento_id | INTEGER | — | FK → forma_pagamento.id | Sim | Forma de pagamento usada |
| valor_pago | DECIMAL | 10,2 | — | Sim | Valor pago nessa forma específica |

## entrega

Entidade fraca, relacionamento 1:1 opcional com pedido.

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único da entrega |
| pedido_id | INTEGER | — | FK → pedido.id, CD | Sim | Pedido de delivery correspondente (único — cada pedido tem no máx. 1 entrega) |
| entregador_id | INTEGER | — | FK → funcionario.id | Sim | Funcionário (entregador) responsável pelo trajeto |
| endereco_logradouro | VARCHAR | 150 | — | Sim | Rua/avenida de destino da entrega |
| endereco_numero | VARCHAR | 10 | — | Sim | Número do endereço de destino |
| endereco_bairro | VARCHAR | 100 | — | Sim | Bairro de destino |
| endereco_cidade | VARCHAR | 100 | — | Sim | Cidade de destino |
| endereco_cep | VARCHAR | 9 | — | Sim | CEP de destino |
| taxa_entrega | DECIMAL | 10,2 | — | Sim | Valor cobrado pela entrega, conforme distância |
| data_hora_saida | TIMESTAMP | — | — | Não | Momento em que o entregador saiu para o trajeto |
| data_hora_entrega | TIMESTAMP | — | — | Não | Momento em que a entrega foi concluída |

## avaliacao_pedido

Entidade fraca, relacionamento 1:1 opcional com pedido.

| Atributo | Tipo | Tam./Prec. | Chave | Obrigatório | Descrição |
| --- | --- | --- | --- | --- | --- |
| id | INTEGER | — | PK | Sim | Identificador único da avaliação |
| pedido_id | INTEGER | — | FK → pedido.id, CD | Sim | Pedido avaliado (único — no máx. 1 avaliação por pedido) |
| nota | INTEGER | — | — | Sim | Nota de 1 a 5 atribuída pelo cliente |
| comentario | TEXT | — | — | Não | Comentário livre sobre o atendimento/pedido |
| data_hora | TIMESTAMP | — | — | Sim | Momento em que a avaliação foi registrada |
