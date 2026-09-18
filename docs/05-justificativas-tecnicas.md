# Justificativas Técnicas de Modelagem — Sistema Lanchonete Sabor & Cia

> Atende ao item 6 do enunciado: "Redigir uma justificativa técnica curta
> para pelo menos três decisões de modelagem tomadas." Consolida o
> raciocínio já registrado em `docs/01-mer-conceitual.md` e
> `docs/04-modelo-logico.md`, em formato objetivo para leitura/avaliação.

## 1. Cargo virou entidade, não atributo de Funcionário

**Regra de negócio (4.5):** "Uma mesma pessoa pode, eventualmente, acumular
mais de uma função, mas a lanchonete quer manter o registro de qual cargo
cada funcionário exerceu em cada período de trabalho."

**Decisão:** `Cargo` é uma entidade própria, associada a `Funcionario` por
uma entidade associativa histórica `FuncionarioCargo(funcionario_id,
cargo_id, data_inicio, data_fim)`.

**Por quê:** se `cargo` fosse um atributo simples de `Funcionario` (ex.:
coluna `cargo VARCHAR`), o modelo só conseguiria guardar **um cargo por
funcionário, no presente** — perderíamos tanto a possibilidade de acúmulo
de funções quanto o histórico de quando cada cargo foi exercido, que é
requisito explícito. Transformar o relacionamento em entidade associativa
com atributos próprios (`data_inicio`/`data_fim`) é o padrão correto para
modelar um vínculo N:N que **varia no tempo** — a alternativa (repetir
linhas de funcionário para cada cargo, ou usar colunas `cargo1`, `cargo2`)
violaria a 1FN.

## 2. Produto e Combo como especialização de um supertipo (item_vendavel)

**Regra de negócio (4.2):** "Alguns produtos podem ser vendidos isoladamente
ou fazer parte de um combo... [item do pedido references produto ou combo]"

**Decisão:** criada uma entidade supertipo `ItemVendavel` (especialização
**total e disjunta**: todo registro é ou Produto ou Combo, nunca os dois,
nunca nenhum), da qual `Produto` e `Combo` são subtipos. `ItemPedido`
referencia sempre `ItemVendavel`.

**Por quê:** a alternativa mais simples seria dar a `ItemPedido` duas
chaves estrangeiras nuláveis (`produto_id`, `combo_id`), mas isso exige uma
regra de integridade "exatamente uma das duas preenchida" que o SQL padrão
não expressa declarativamente (precisaria de `CHECK` complexo ou trigger
equivalente ao que já usamos, sem ganhar nada em troca). A especialização
reconhece explicitamente que Produto e Combo compartilham um conceito real
do domínio — "coisa que pode ser vendida, com nome e preço próprios" — e
resolve a referência de `ItemPedido` com uma única FK não-nula. O custo é
implementar a especialização via chave primária compartilhada entre tabelas
(`produto.id` e `combo.id` referenciam `item_vendavel.id`) mais dois
triggers que mantêm `item_vendavel.tipo` consistente — uma técnica padrão
de modelagem relacional para representar herança.

## 3. Status do pedido virou entidade fraca de histórico, não atributo

**Regra de negócio (4.3):** "Todo pedido possui um status que muda ao longo
do tempo... A proprietária quer conseguir consultar, depois, em que horário
cada mudança de status ocorreu, e não apenas o status atual."

**Decisão:** `StatusPedidoHistorico` é uma entidade fraca, dependente de
`Pedido`, que registra **cada** mudança de status com seu horário. `Pedido`
não tem coluna de status — o status atual é sempre derivado (último
registro do histórico, ordenado por `data_hora`).

**Por quê:** um atributo simples `status` em `Pedido` só guardaria o valor
mais recente, descartando o histórico que é requisito explícito da regra de
negócio. A entidade é classificada como **fraca** (não associativa) porque
não resolve um relacionamento N:N entre duas entidades fortes — ela existe
para registrar **eventos que só fazem sentido em função de um pedido
específico**, sua chave primária depende logicamente da existência do
pedido, e ela desaparece se o pedido for removido (`ON DELETE CASCADE`).
Manter também uma coluna `status` redundante em `Pedido` foi descartado
deliberadamente: duplicar o dado (uma vez no histórico, outra vez "solto"
em Pedido) criaria duas fontes de verdade que poderiam divergir se alguma
rotina esquecesse de atualizar uma das duas — o que violaria a lógica da
3FN de eliminar redundância que gera risco de inconsistência.

## 4. Ficha técnica (Produto x Ingrediente) como N:N com atributo próprio

**Regra de negócio (4.6):** "Cada produto do cardápio é preparado a partir
de um ou mais ingredientes... um mesmo ingrediente pode ser usado em vários
produtos diferentes. Para cada produto, é necessário saber a quantidade de
cada ingrediente utilizada em seu preparo."

**Decisão:** `ProdutoIngrediente(produto_id, ingrediente_id,
quantidade_utilizada)` é uma entidade associativa N:N.

**Por quê:** o relacionamento é claramente N:N (a própria regra descreve
os dois lados: um produto usa vários ingredientes, um ingrediente é usado
em vários produtos), o que já exigiria uma tabela associativa em qualquer
SGBD relacional (não é possível representar N:N com FK direta em nenhuma
das duas tabelas). Além disso, o relacionamento **carrega um atributo
próprio** (`quantidade_utilizada`) que não pertence nem a Produto nem a
Ingrediente isoladamente — pertence à combinação dos dois. Esse atributo é
justamente o dado que sustenta o requisito funcional mínimo do sistema
(seção 5.2) de estimar consumo de estoque a partir das vendas.

## 5. Preço "congelado" em ItemPedido em vez de referência ao preço atual

**Regra de negócio (4.2/4.3):** produtos têm preço-base que pode mudar
(reajustes) e podem entrar em promoções temporárias; o pedido precisa
refletir corretamente quanto foi cobrado por item.

**Decisão:** `ItemPedido.preco_unitario_praticado` (e o equivalente em
`ItemPedidoAdicional`) armazena o valor efetivamente cobrado no momento da
venda, em vez de apenas referenciar `item_vendavel.preco` e calculá-lo em
tempo de consulta.

**Por quê:** se o preço de venda de um item fosse sempre calculado a partir
do preço atual do produto, qualquer reajuste de cardápio alteraria
retroativamente o valor de pedidos já fechados — o que é factualmente
incorreto (o cliente pagou o preço vigente na data da compra, não o de
hoje). Isso não é uma violação de normalização: preço-atual-do-produto e
preço-praticado-numa-venda-específica são **dois fatos diferentes**, cada
um pertencente à sua própria linha do tempo, e por isso merecem colunas
separadas em tabelas separadas — prática padrão em qualquer sistema
transacional de vendas.
