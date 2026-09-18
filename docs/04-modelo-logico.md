# Modelo Lógico — Sistema Lanchonete Sabor & Cia

> Script executável: `database/init/001_schema.sql`. Este documento explica
> **como** o DER (`docs/02-der.dbml`) foi traduzido para esse script e
> **por que** o resultado está em 3ª Forma Normal (3FN).

## 1. Regras de derivação DER → Modelo Lógico aplicadas

1. **Toda entidade forte vira uma tabela**, com chave primária **substituta**
   (surrogate key, `INTEGER GENERATED ALWAYS AS IDENTITY`) em vez de usar
   atributos naturais como PK. Justificativa: nenhum atributo natural
   levantado nas regras de negócio (nome de cliente, nome de produto etc.) é
   garantidamente único e estável ao longo do tempo — usar chave substituta
   evita ter que alterar PKs (e todas as FKs que apontam para elas) se um
   dado "natural" mudar.
2. **Relacionamento 1:N vira FK na tabela do lado N.** Ex.: `pedido.mesa_id`
   aponta para `mesa.id`; `ingrediente.fornecedor_id` aponta para
   `fornecedor.id`.
3. **Relacionamento N:N vira tabela associativa própria**, com FK para as
   duas entidades participantes e, quando aplicável, os atributos do
   relacionamento. Ex.: `produto_ingrediente` carrega `quantidade_utilizada`,
   que é um atributo do *relacionamento* "produto usa ingrediente", não de
   nenhuma das duas entidades isoladamente.
4. **Entidade fraca vira tabela com FK obrigatória (`NOT NULL`) e
   `ON DELETE CASCADE`** para a entidade da qual depende — reflete que ela
   não tem existência própria (ex.: `item_pedido`, `status_pedido_historico`
   somem se o `pedido` for excluído).
5. **Especialização total/disjunta (Produto/Combo) vira tabela-pai +
   tabelas-filha com PK compartilhada** (`produto.id` e `combo.id`
   referenciam `item_vendavel.id`). A integridade "todo item_vendavel tem
   exatamente um filho, do tipo certo" não é expressável em `CHECK` puro
   (SQL padrão não permite `CHECK` consultar outra tabela), então foi
   implementada com **triggers** (`fn_set_item_vendavel_tipo_produto` /
   `_combo`, ao final do script) — este é um ponto técnico interessante para
   a justificativa oral do projeto.
6. **Regras de negócio que não são "estruturais" viram `CHECK`/índice, não
   nova tabela.** Ex.: "cupom usado no máximo uma vez por cliente" virou um
   **índice único parcial** (`ux_pedido_cupom_cliente`), não uma tabela de
   controle de uso — o próprio `pedido` já registra cliente + cupom, então
   criar uma tabela separada seria redundante.

## 2. Verificação das Formas Normais

**1FN (valores atômicos, sem grupos repetitivos):** ok em todas as tabelas.
Os únicos candidatos a "atributo multivalorado" das regras de negócio
(ingredientes de um produto, adicionais de um item, formas de pagamento de
um pedido) foram corretamente resolvidos como **tabelas associativas**
(`produto_ingrediente`, `item_pedido_adicional`, `pedido_pagamento`) em vez
de colunas com múltiplos valores — é exatamente isso que a 1FN exige.

**2FN (nenhum atributo não-chave depende de só parte de uma chave
composta):** como toda tabela usa **chave primária de um único atributo**
(surrogate key), não existe chave composta da qual algo possa depender
parcialmente — 2FN é satisfeita trivialmente em todas as tabelas. Nas
tabelas associativas, a combinação natural (ex.: `produto_id +
ingrediente_id`) não é a PK física, e sim uma `UNIQUE` — os atributos do
relacionamento (`quantidade_utilizada`) dependem do par completo, não de um
dos dois lados isoladamente.

**3FN (nenhum atributo não-chave depende de outro atributo não-chave —
"a chave, toda a chave, e nada além da chave"):** verificado tabela a
tabela; os pontos que mereciam atenção especial:

- `ingrediente.fornecedor_id` guarda só a **referência**, não o nome/contato
  do fornecedor (que ficaria em `fornecedor`, evitando repetir dado do
  fornecedor em cada linha de ingrediente).
- `produto.categoria_id` segue o mesmo raciocínio — nome da categoria não é
  duplicado em `produto`.
- `pedido` guarda só FKs para `cliente`, `mesa`, `funcionario`, `cupom` — não
  duplica nome do cliente, número da mesa etc.
- **Caso especial, não é violação:** `item_pedido.preco_unitario_praticado`
  e `item_pedido_adicional.preco_praticado` parecem, à primeira vista,
  redundantes com `item_vendavel.preco` / `adicional.preco`. **Não são.**
  Representam **fatos históricos distintos**: "quanto esse produto custava
  no momento desta venda" é uma informação que **muda de significado ao
  longo do tempo** e precisa ser preservada mesmo que o preço atual do
  produto mude depois (reajuste, promoção etc.). Isso não é uma dependência
  funcional entre atributos não-chave da mesma tabela — é a modelagem
  correta de um dado **temporal/transacional**, prática padrão em qualquer
  sistema de vendas (o preço "atual" e o preço "praticado numa venda
  específica" são dois fatos diferentes, não o mesmo dado duplicado).

Conclusão: o esquema está em **3ª Forma Normal**.

## 3. Notação relacional (visão compacta)

```
cliente(id, nome, telefone, email, endereco_padrao_logradouro, endereco_padrao_numero,
        endereco_padrao_bairro, endereco_padrao_cidade, endereco_padrao_cep, criado_em)

mesa(id, numero, ativa)

categoria(id, nome)

item_vendavel(id, nome, preco, tipo)

produto(id*, categoria_id→categoria, descricao)                          -- id também é FK p/ item_vendavel
combo(id*, descricao)                                                     -- id também é FK p/ item_vendavel

combo_item(id, combo_id→combo, produto_id→produto, quantidade)

variacao(id, produto_id→produto, nome, preco_adicional)

adicional(id, nome, preco)

fornecedor(id, nome, telefone, email)

ingrediente(id, nome, quantidade_estoque, unidade_medida, fornecedor_id→fornecedor)

produto_ingrediente(id, produto_id→produto, ingrediente_id→ingrediente, quantidade_utilizada)

cargo(id, nome)

funcionario(id, nome, telefone, email)

funcionario_cargo(id, funcionario_id→funcionario, cargo_id→cargo, data_inicio, data_fim)

promocao(id, nome, data_inicio, data_fim, tipo_desconto, valor_desconto)

produto_promocao(id, produto_id→produto, promocao_id→promocao)

cupom(id, codigo, tipo_desconto, valor_desconto, data_inicio, data_fim)

forma_pagamento(id, nome)

pedido(id, data_hora, canal, cliente_id→cliente, mesa_id→mesa,
       atendente_id→funcionario, cupom_id→cupom, observacoes)

item_pedido(id, pedido_id→pedido, item_vendavel_id→item_vendavel, variacao_id→variacao,
            quantidade, preco_unitario_praticado, observacao)

item_pedido_adicional(id, item_pedido_id→item_pedido, adicional_id→adicional, preco_praticado)

status_pedido_historico(id, pedido_id→pedido, status, data_hora)

pedido_pagamento(id, pedido_id→pedido, forma_pagamento_id→forma_pagamento, valor_pago)

entrega(id, pedido_id→pedido, entregador_id→funcionario, endereco_logradouro,
        endereco_numero, endereco_bairro, endereco_cidade, endereco_cep,
        taxa_entrega, data_hora_saida, data_hora_entrega)

avaliacao_pedido(id, pedido_id→pedido, nota, comentario, data_hora)
```

`id*` = chave primária que é simultaneamente chave estrangeira (herança com
PK compartilhada).

## 4. Como executar o script

O arquivo `database/init/001_schema.sql` é autocontido e idempotente na
ordem de criação (respeita dependências de FK). Quando o container de banco
subir via Docker Compose, qualquer `.sql` em `database/init/` é executado
automaticamente pela imagem oficial do Postgres na primeira inicialização
do volume — vamos aproveitar exatamente esse mecanismo no deploy (seção
5.4 do enunciado). Não é necessário rodar nada manualmente agora; isso será
testado quando montarmos o `docker-compose.yml`.
