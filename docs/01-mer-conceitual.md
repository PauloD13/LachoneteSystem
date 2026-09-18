# MER Conceitual — Sistema Lanchonete Sabor & Cia (RASCUNHO)

> Status: rascunho de trabalho para discussão. Ainda não é a versão final do
> entregável 7.1. Cada decisão aqui precisa ser confirmada/ajustada antes de
> avançarmos para o DER (dbdiagram.io) e o Dicionário de Dados.

## 1. Entidades fortes

| Entidade | Por quê é forte (tem PK própria, existe sem depender de outra) |
| --- | --- |
| Cliente | Existe independentemente; identificado só quando há cadastro (app/delivery) |
| Mesa | Existe independentemente do pedido |
| Categoria | Agrupa produtos (lanches, bebidas, porções, sobremesas) |
| Produto | Item do cardápio, tem preço-base próprio |
| Combo | Conjunto de produtos vendido com preço promocional próprio |
| Variacao | Ex.: tamanho do lanche, ponto da carne — altera preço final |
| Adicional | Ex.: bacon extra, queijo extra — opcional, tem preço próprio |
| Ingrediente | Insumo de estoque, existe independente de qualquer produto |
| Fornecedor | Fornece ingredientes, existe independentemente |
| Funcionario | Pessoa da equipe |
| Cargo | Atendente, cozinheiro, entregador, gerente |
| FormaPagamento | Dinheiro, cartão débito/crédito, pix etc. |
| Cupom | Código de desconto com regras próprias |
| Promocao | Campanha sazonal com período de vigência |
| Pedido | Registro de venda — ver observações de participação abaixo |

## 2. Entidades fracas / associativas

Entidades fracas **não têm sentido de existir sem a entidade da qual dependem**
(sua PK inclui, direta ou indiretamente, a FK da entidade forte). Entidades
associativas resolvem relacionamentos N:N que carregam atributos próprios.

| Entidade | Tipo | Depende de | Por que existe (não virou atributo) |
| --- | --- | --- | --- |
| ItemPedido | Fraca | Pedido | Um pedido tem vários itens; cada item tem sua própria quantidade e preço praticado no momento da venda (preço "congelado", que pode diferir do preço atual do produto) |
| ItemPedidoAdicional | Associativa | ItemPedido + Adicional | Cada item pode ter vários adicionais, e cada adicional tem preço próprio cobrado naquele item específico |
| StatusPedidoHistorico | Fraca | Pedido | A regra exige saber **quando** cada mudança de status ocorreu, não só o status atual — não pode ser um único atributo em Pedido |
| PedidoPagamento | Associativa | Pedido + FormaPagamento | Um pedido pode ser pago com mais de uma forma simultaneamente, cada uma com seu valor |
| Entrega | Fraca (1:1 opcional) | Pedido | Só existe quando o pedido é delivery; carrega endereço, taxa, entregador e horários próprios da entrega |
| AvaliacaoPedido | Fraca (1:1 opcional) | Pedido | Avaliação é opcional e só faz sentido atrelada a um pedido específico |
| FuncionarioCargo | Associativa (histórica) | Funcionario + Cargo | Um funcionário pode acumular cargos ao longo do tempo; a lanchonete quer saber qual cargo foi exercido em cada período (data_inicio/data_fim) |
| ProdutoIngrediente | Associativa | Produto + Ingrediente | "Ficha técnica": quantidade de cada ingrediente usada por produto — é o dado que permite estimar consumo de estoque |
| ComboItem | Associativa | Combo + Produto | Um combo reúne 2+ produtos; a associação define quais e em que quantidade |
| ProdutoPromocao | Associativa | Produto + Promocao | Um produto pode participar de várias promoções ao longo do tempo; precisa manter histórico mesmo após encerradas |

## 3. Relacionamentos e cardinalidades (visão preliminar)

| Relacionamento | Cardinalidade | Participação | Observação |
| --- | --- | --- | --- |
| Cliente — Pedido | 1:N | Parcial do lado Cliente (opcional em pedidos de balcão) | Cliente obrigatório apenas para app/delivery |
| Mesa — Pedido | 1:N | Parcial (só quando é consumo local) | Pedido pertence a no máximo 1 mesa |
| Funcionario(atendente) — Pedido | 1:N | Total do lado Pedido | Todo pedido registra um atendente, usado para comissão |
| Pedido — ItemPedido | 1:N | Total | Pedido "vazio" não existe |
| Produto — ItemPedido | 1:N | Parcial | Um item pode se referir a produto OU combo (ver decisão 1 abaixo) |
| Combo — ItemPedido | 1:N | Parcial | Idem acima |
| Combo — Produto | N:N (via ComboItem) | Total do lado Combo | Combo sem produto não existe |
| Produto — Ingrediente | N:N (via ProdutoIngrediente) | Total do lado Produto | Todo produto do cardápio tem ficha técnica |
| Ingrediente — Fornecedor | N:1 | Total do lado Ingrediente | Cada ingrediente tem um fornecedor responsável (ver decisão 2) |
| Pedido — FormaPagamento | N:N (via PedidoPagamento) | Total | Todo pedido precisa de ao menos uma forma de pagamento registrada |
| Pedido — Cupom | N:1 | Parcial | Cupom é opcional |
| Pedido — StatusPedidoHistorico | 1:N | Total | Todo pedido tem ao menos o status inicial "recebido" |
| Pedido — Entrega | 1:1 | Parcial (só delivery) | — |
| Entrega — Funcionario(entregador) | N:1 | Total do lado Entrega | Toda entrega tem 1 entregador responsável |
| Funcionario — Cargo | N:N (via FuncionarioCargo) | Total do lado Funcionario | Todo funcionário tem ao menos um cargo registrado |
| Produto — Promocao | N:N (via ProdutoPromocao) | Parcial | Nem todo produto está em promoção |
| ItemPedido — Adicional | N:N (via ItemPedidoAdicional) | Parcial | Adicional é opcional |
| Produto — Variacao | 1:N | Parcial | Nem todo produto tem variação |

## 4. Decisões de modelagem (CONFIRMADAS)

Estas são candidatas às **3 justificativas técnicas obrigatórias** do item 6
do enunciado — o raciocínio abaixo já pode servir de base para a redação
final dessas justificativas.

1. **Produto x Combo dentro de ItemPedido — CONFIRMADO: opção (b).**
   Criamos uma entidade supertipo `ItemVendavel` (id, nome, preco, tipo:
   PRODUTO/COMBO), da qual `Produto` e `Combo` são subtipos (especialização
   **total e disjunta**: todo ItemVendavel é ou Produto ou Combo, nunca
   ambos, nunca nenhum). `ItemPedido` referencia sempre `ItemVendavel`,
   nunca Produto/Combo diretamente. Isso evita FKs nulináveis em
   ItemPedido, evita regra de "exatamente uma preenchida" em nível de
   aplicação, e reflete o fato de que "o que se vende" é um conceito comum
   às duas entidades. No modelo lógico (relacional), essa especialização
   será implementada como tabela-pai + tabelas-filhas com PK compartilhada
   (FK de `produto.id` e `combo.id` para `item_vendavel.id`).

2. **Fornecedor — Ingrediente — CONFIRMADO: 1:N.**
   Um fornecedor fornece vários ingredientes; cada ingrediente tem um único
   fornecedor responsável pelo abastecimento, seguindo literalmente a regra
   de negócio. Não modelamos N:N por ausência de evidência textual dessa
   necessidade (evitar over-engineering).

3. **Cargo como entidade — CONFIRMADO.**
   Cargo é entidade separada (não `ENUM` fixo no banco), pois permite
   adicionar cargos sem alterar schema e fornece uma PK estável para
   `FuncionarioCargo` referenciar no histórico.

4. **Preço "congelado" em ItemPedido/ItemPedidoAdicional — CONFIRMADO.**
   O preço do produto/combo/adicional pode mudar com o tempo (promoções,
   reajustes). ItemPedido e ItemPedidoAdicional guardam o preço praticado
   no momento da venda, não uma referência ao preço atual — assim pedidos
   antigos não mudam de valor retroativamente.

5. **StatusPedido — CONFIRMADO: apenas histórico, sem duplicar em Pedido.**
   Não existe atributo `status` em `Pedido`. O status atual é sempre
   derivado via query do último registro em `StatusPedidoHistorico`,
   evitando duas fontes de verdade divergentes.

6. **Endereço de entrega: em Cliente ou em Entrega? — CONFIRMADO: nos dois,
   com propósitos diferentes.**
   `Cliente` guarda um endereço "padrão" **opcional** (atributo composto:
   logradouro, número, bairro, cidade, CEP), útil para pré-preencher um
   novo pedido. `Entrega` guarda seu **próprio** endereço (mesma estrutura
   composta), que é o endereço efetivamente usado naquela entrega
   específica — "congelado" no momento do pedido, pela mesma razão do
   preço: se o cliente se mudar depois, o histórico de entregas antigas não
   pode ser alterado retroativamente. Também cobre o caso de um cliente
   pedir entrega em um endereço diferente do cadastrado.

## 5. Próximos passos

1. ~~Você revisa este rascunho e me diz o que ajustar/discordar~~ ✅ feito;
2. ~~Fechamos as decisões da seção 4~~ ✅ feito;
3. **Próximo:** transformar isso no DER em DBML (dbdiagram.io) com notação
   Crow's Foot, já com tipos de atributo (simples, composto, multivalorado,
   derivado, chave) documentados;
4. Escrever o Dicionário de Dados a partir do DER fechado;
5. Derivar o Modelo Lógico (DDL) verificando 3FN.
