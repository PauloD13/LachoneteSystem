## SITUAGCAO DE APRENDIZAGEM

## Modelagem e Desenvolvimento de Banco de Dados aplicada a um Sistema de Lanchonete

Componente Curricular: Banco de Dados — Carga Hordria Total: 110h

- 1. Identificacéo da Atividade

| Campo | Componente curricular Banco de Dados (40h) 2. Modelo Entidade-Relacionamento (2.1 a 2.6 do Plano de Ensino) e médulo Eixo de contetido pratico de desenvolvimento de sistemas (implementagdo) |
| --- | --- |
| mobilizadas | Aulas de referéncia Aplicar os procedimentos do modelo de entidade-rel; aplicar os procedimentos de normalizagdo e padronizagdo de dados; reconhecer Capacidades técnicas as demandas do cliente; implementar um sistema web fullstack integrado a um banco de dados relacional; aplicar conceitos de e implantagao (deploy) de aplicagdes. |
|   | Valorizar novos fatos, ideias e opinides diferentes na resolugdo de problemas; Capacidades |
| mobilizadas | fundamentar escolhas e decisdes a partir do exame de fatos, contextos e socioemocionais aticas de trabalhar de forma colaborativa na p integragao entre modelagem de dados e desenvolvimento de software. Organizagao da turma Individual ou em duplas, a critério do professor Exercicios de criagdo de Diagramas E-R (Formativa); Aplicacdo das Formas Instrumentos de avaliagdo Normais (Formativa); Entrega de Modelo E-R para um estudo de caso previstos no plano (Somativa Parcial); Entrega do sistema web fullstack implantado via Docker Compose (Somativa Parcial). |

- 2. Contexto

A Lanchonete Sabor & Cia iniciou suas atividades ha trés anos em um bairro de grande movimento e, desde entao, cresceu de forma constante. O que comegou como um pequeno balcio de atendimento local hoje ja recebe pedidos presenciais, por telefone e também por um aplicativo préprio de delivery. Esse crescimento trouxe uma série de dificuldades: as comandas de pedidos ainda sao anotadas em blocos de papel, o controle de estoque de ingredientes ¢é feito “de cabega” pelo

e combos mudam com frequéncia e ninguém sabe ao certo quais produtos venderam

responsavel da cozinha, as mais em cada periodo.

A proprietaria da lanchonete contratou a sua equipe, uma consultoria de tecnologia, para projetar o banco de dados e desenvolver um sistema de gestdo de pedidos, estoque e entregas. Antes de qualquer linha de codigo ser escrita, ela pediu que a equipe se reunisse com o pessoal do saldo, da cozinha e da entrega para levantar como o negdcio funciona hoje e como ele deve funcionar depois de informatizado.

a) como resp

1 pela etapa de

de dados e, na sequéncia, pela implementagdo de um

Vocé foi d

sistema web funcional dé suporte a essas regras. A proprietdria ndo sabe o que é uma entidade, um atributo ou uma que tabela — ela s6 sabe descrever como o seu negdcio funciona. Cabe a vocé interpretar essa descricdo, identificar as informagdes que precisam ser armazenadas, como elas se relacionam entre si, propor uma estrutura de banco de dados capaz sustentar as regras descritas a seguir e, por fim, construir um sistema web que efetivamente utilize essa base de de dados.

## 3. Comando

A partir do relato de funcionamento da lanchonete e das regras de negdcio apresentadas na segao 4, vocé devera:

- \+ 1. Interpretar o cendrio e identificar as entidades, os relacionamentos e as regras de cardinalidade e participacio envolvidos no funcionamento da lanchonete;

- \+ 2. Elaborar 0 Modelo Entidade-Relacionamento (MER) conceitual, representando entidades fortes, fracas e associativas, conforme aplicavel;


- 3. Construir 0 Diagrama Entidade-Relaci (DER) cor di ilizando a notagdo (Chen ou Pé-de-Galinha/Crow's Foot, conforme definido pelo professor), evidenciando cardinalidades, participagdo e tipos de atributos (simples, compostos, multivalorados, derivados, chaves); da em sala

- 4. Elaborar o Diciondrio de Dados completo do modelo proposto;

- verificando a 5. Derivar o Modelo Légico (esquema relacional) a partir do DER, aplicando as regras de até, no minimo, a 3* Forma Normal (3FN); estudadas e

- 6. Redigir uma justificativa técnica curta para pelo menos trés decisdes de modelagem tomadas (por exemplo: por que uma determinada informagdo virou entidade e ndo atributo, por que um relacionamento é N:N, por que uma entidade foi considerada fraca, etc.);

- backend e frontend (HTML, CSS e JavaScript), conforme detalhado no Médulo de Desenvolvimento (segdo 7); 7. Implementar um sistema web fullstack a partir do Modelo Légico proposto, com banco de dados relacional,

- 8. Realizar o deploy do sistema no servidor local disponivel em sala, utilizando Docker Compose, com um container dedicado o backend e outro para o banco de dados. para

Este documento néo indica quais entidades, atributos, tabelas ou tecnologias especificas devem ser criadas ou utilizadas. A leitura, interpretagdo e traducdo das regras de negécio em um modelo de dados e em um sistema funcional sao parte do que esta sendo avaliado.

## 4. Regras de Negocio

As informagdes a seguir foram levantadas junto a proprietdria, ao atendente do balco, ao cozinheiro responsavel pelo estoque e aos entregadores. Leia com atengdo: cada regra carrega implicagdes para o modelo de dados e, posteriormente,

para o sistema a ser desenvolvido.

## 4.1 Clientes e atendimento

- Um cliente pode fazer pedidos presencialmente no por telefone ou pelo aplicativo. O cadastro do cliente (nome, contato e, quando houver entrega, enderego) ¢é obrigatério apenas para pedidos via aplicativo ou delivery; pedidos de balcdo podem ser feitos sem identificar o cliente.

- Um mesmo cliente pode, ao longo do tempo, fazer vérios pedidos, e a lanchonete quer conseguir consultar o histérico de pedidos de cada cliente cadastrado.

- Quando o pedido é feito para consumo no local, ele deve ser associado a uma mesa do saldo; uma mesa pode receber varios pedidos ao longo do dia, mas cada pedido pertence a apenas uma mesa (ou a nenhuma, se for retirada ou delivery).

## 4.2 Cardapio, combos e variagdes

- O cardépio é dividido em categorias (lanches, bebidas, porgoes e sobremesas). Cada produto do possui um prego-base.

- Alguns produtos podem ser vendidos isoladamente ou fazer parte de um combo. Um combo retine dois ou mais produtos do vendidos em conjunto por um prego promocional, diferente da soma dos pregos individuais.

- Determinados produtos aceitam variagdes que alteram o prego final (por exemplo, tamanho do lanche ou tipo de ponto da carne) e adicionais opcionais escolhidos pelo cliente (por exemplo, bacon extra, queijo extra), que também tém proprio. prego

- A lanchonete poder identificar, para cada item vendido dentro de um pedido, quais adicionais e observagdes quer (“sem cebola”, “sem gelo™) foram escolhidos, pois isso impacta o preparo e o custo.

## 4.3 Pedidos e pagamento

- Um pedido é composto por um ou mais itens; cada item se refere a um produto (ou combo) do em determinada quantidade.

- Um pedido pode ser pago com mais de uma forma de pagamento simultaneamente (por exemplo, parte em dinheiro e parte no cartdo), sendo necessario registrar o valor pago em cada forma utilizada.

- Todo pedido possui um status que muda ao longo do tempo (recebido, em preparo, pronto, saiu para entrega, entregue/retirado, cancelado). A proprietdria quer conseguir consultar, depois, em que hordrio cada mudanca de status ocorreu, e ndo apenas o status atual.

- Pedidos podem utilizar um cupom de desconto, que tem um valor ou percentual de desconto, um periodo de validade e pode ser usado apenas uma vez por cliente.

- Ao final do atendi o cliente pode, opcional avaliar o pedido com uma nota e um


## 4.4 Entrega

- Pedidos feitos pelo aplicativo podem ser para retirada no balcdo ou para entrega em um enderego informado pelo cliente.

- varios pedidos ao longo de um turno, mas cada pedido de delivery tem apenas um entregador responsavel. Quando ha entrega, um entregador da equipe é responsavel pelo trajeto. Um entregador pode ficar responsavel por

- A lanchonete cobra uma taxa de entrega que pode variar conforme a distancia do enderego.

## 4.5 Equipe

- A equipe da lanchonete é composta por pessoas com diferentes cargos: atendente, cozinheiro, entregador e gerente. Uma mesma pessoa pode, eventualmente, acumular mais de uma fungdo, mas a lanchonete quer manter o registro de qual cargo cada funcionario exerceu em cada periodo de trabalho.

- Cada pedido deve registrar qual atendente o recebeu, pois isso é usado para calcular comissdes no fim do més.

## 4.6 Estoque e ingredientes

- \+ Cada produto do cardapio é preparado a partir de um ou mais ingredientes (insumos) do estoque, e um mesmo ingrediente pode ser usado em varios produtos diferentes. Para cada produto, € necessério saber a quantidade de cada ingrediente utilizada em seu preparo.

- Cada ingrediente tem uma quantidade em estoque, uma unidade de medida (quilo, litro, unidade) e um fornecedor responsavel pelo abastecimento. Um fornecedor pode fornecer varios ingredientes diferentes.

- \+ Ao registrar a venda de um item de pedido, a lanchonete quer futuramente ser capaz de estimar quanto de cada ingrediente foi consumido do estoque, com base na do produto vendido.

## 4.7 Promocdes

- \+ Além dos combos, a lanchonete cria promogdes sazonais, que tém data de inicio e de término e podem se aplicar a um ou mais produtos do cardapio, alterando temporariamente o prego de venda.

- Um produto pode participar de mais de uma promogao ao longo do tempo, mas a lanchonete precisa saber quais promogdes estiveram ativas em cada periodo, mesmo depois de encerradas.

## 5. Médulo de Desenvolvimento: Sistema Web Fullstack

Concluida a modelagem de dados, a proprietdria pediu a consultoria que entregasse também uma primeira versdo funcional do sistema, para validar com a equipe do saldo, da cozinha e da entrega se 0 modelo proposto realmente sustenta a operagdo do dia a dia. Esta etapa complementa — e deve ser coerente com — 0 Modelo Légico produzido na se¢io

(ou de forma muito préxima) o esquema relacional derivado do

do deve utilizar

anterior: 0 sistema impl DER.

## 5.1 geral da arquitetura

O sistema deve ser implementado como uma aplicagdo web fullstack, composta por trés camadas claramente separadas:

- \+ Frontend: interface web construida com HTML, CSS e JavaScript (puro ou com bibliotecas/frameworks leves, a critério do e conforme orientagdo do professor), responsavel por exibir os dados e permitir a interagdo do grupo usudrio (cadastrar, consultar, atualizar e excluir informagdes relevantes do negécio);

- Backend: API/servidor de aplicagao pelo frontend e se comunicar com o banco de dados. A linguagem/framework do backend é de livre escolha do grupo (por exemplo, Node.js/Express, PHP, Python/Flask ou Django, Java/Spring, entre outros), desde que aprovado pelo professor; por implementar as regras de negécio, expor endpoints consumidos

- Banco de Dados: SGBD relacional (por exemplo, MySQL, PostgreSQL ou MariaDB) que implementa fisicamente o Modelo Légico entregue na segdo anterior, incluindo chaves primdrias, chaves estrangeiras e demais definidas.

As trés camadas devem se comunicar em containers separados, orquestrados via Docker Compose, conforme detalhado em 5.4.

## 5.2 Funcionalidades minimas exigidas

O sistema nao precisa cobrir 100% das regras de negécio da segdo 4, mas deve demonstrar, de forma funcional, que o

modelo de dados proposto sustenta a operagao. No minimo, o sistema deve permitir:


- Cadastro, consulta, edicdo e exclusdo (CRUD) dos principais cadastros do negdcio (por exemplo: clientes, produtos do cardapio, ingredientes, fornecedores e equipe);

- Registro de um pedido completo, associando cliente (quando aplicavel), itens do pedido, produtos/combos, i e forma(s) de

- Atualizagdo do status do pedido ao longo do tempo, preservando o histérico de mudancas de status (data‘hora de cada transigao);

- Alguma forma de co um cliente, produtos mais vendidos em um periodo, ou consumo estimado de ingredientes). 6rio que utilize os relaci do modelo (por exemplo: histérico de pedidos de

O grupo pode, a critério do professor, negociar um subconj diferente de fi

desde que justificado

tecnicamente e desde que o subconjunto escolhido evidencie o uso de pelo menos um relacionamento 1:N e um

relacionamento N:N do modelo proposto.

## 5.3 Requisitos técnicos do frontend

- HTML semantico a estrutura das paginas/telas; para

- CSS proprio para a estilizagao (frameworks de CSS sdo permitidos como apoio, mas o grupo deve demonstrar dominio da estilizagdo, ndo apenas o uso de um template pronto);

- JavaScript para interatividade e para o consumo da API do backend (requisi¢des HTTP, por exemplo via fetch), incluindo tratamento basico de erros e feedback visual ao usudrio (mensagens de sucesso/erro, carregamento, validagdo simples de formuldrios).

## 5.4 Deploy com Docker Compose no servidor local

A entrega final deve incluir a implantagdo (deploy) do sistema no servidor local disponivel na sala de aula, utilizando

Docker Compose, com a seguinte organizagdo minima de containers:

- Container do backend: responsavel por executar a aplicagao/API do servidor e servir (ou disponibilizar, conforme a arquitetura escolhida) o frontend;

- Container do banco de dados: responsavel por executar 0 SGBD escolhido, com um volume nomeado para persisténcia dos dados entre reinicializagdes do container;

- nome do servigo (e ndo por localhost/IP fixo); Rede interna do Docker Compose conectando os containers, de modo que o backend acesse o banco de dados pelo

- Varidveis de ambiente (arquivo .env ou equivalente) para configuragdo de credenciais e pardmetros de conexdo do banco de dados, evitando dados sensiveis “fixos” (hardcoded) no codigo;

- forma o sistema fique acessivel a partir de outras maquinas da rede da sala. que Mapeamento de portas do container do backend para uma porta do servidor local definida pelo professor/turma, de

O grupo deve entregar um arquivo docker-compose.yml funcional na raiz do projeto, além de um Dockerfile para o backend (a imagem do banco de dados pode utilizar uma imagem oficial ja existente, configurada via variaveis de ambiente

e script de inicializagdo, quando necessario para criar o schema/dados iniciais).

## Critério de aceite do deploy: ao executar “docker compose up” (ou “docker-compose up”) no servidor local da sala a partir da raiz do projeto entregue, o sistema deve subir sem erros e ficar acessivel via navegador, com o frontend se comunicando corretamente com o backend e o backend se comunicando corretamente com o banco de dados em seu

respectivo container.

## 5.5 Entregaveis do de desenvolvimento

- Cédigo-fonte completo do frontend, do backend e dos scripts de inicializagdo do banco de dados (incluindo o script DDL de das tabelas, coerente com o Modelo Légico da segio 6.4);

- Dockerfile(s) e arquivo docker-compose.yml;

- Arquivo o sistema fica disponivel, usudrio/senha de teste (se houver autenticagio) e uma breve descricdo das funcionalidades implementadas; com: instrugdes de como executar o projeto localmente (comando(s) de deploy), porta em que

- Prints de tela (ou video curto) do sistema em funcionamento, demonstrando ao menos um cadastro, um pedido completo sendo registrado e uma consulta que evidencie um relacionamento do modelo.


## 6. Alinhamento com a Taxonomia de Bloom

Esta atividade foi estruturada

mobilizar progressi

para

Bloom (revisada). O quadro a seguir relaciona cada nivel as agGes esperadas do estudante nesta situagdo de aprendizagem.

niveis cognitivos, conforme a Taxonomia de

| Ni Aplicar | Compreender | que o estudante deve o relato de desenvolvimento web e | fazer ne a ade » da lanchonete e as regras de negocio, reconhecendo fatos, processos e necessidades de implicitas no texto. Aplicar os conceitos de entidade, atributo, relaci em sala para traduzir o cendrio em um MER e em um DER, e aplicar conceitos de para implementar e implantar o sistema. |
| --- | --- | --- | --- |
| Analisar |   | relaci | Analisar as regras de negdcio para decidir o que é entidade, o que é atributo, quais existem, suas cardinalidades e participacdes, e quais dependéncias |
|   |   |   | funcionais existem entre os dados, aplicando a normalizagdo; analisar como 0 modelo |
| Avaliar |   | 16gico se traduz em um sistema funcional. | Justificar tecnicamente as decisdes de modelagem e de implementagdo tomadas, avaliando alternativas possiveis (por exemplo, transformar um relacionamento em entidade associativa, ou escolher determinada tecnologia de backend) e argumentando por que a escolha feita atende melhor as regras de negdcio. Elaborar, de forma original, 0 conjunto completo de artefatos do projeto: MER, DER, |
| Criar |   |   | Dicionario de Dados, Modelo Légico normalizado e um sistema web fullstack funcional, implantado via Docker Compose, coerentes entre si. |

## 7. O que deve ser entregue

A entrega final deve conter, obrigatoriamente, os cinco blocos de artefatos abaixo, coerentes entre si (ou seja, 0 DER deve refletir o MER descrito, o dicionario de dados deve descrever exatamente os elementos do DER, 0 modelo légico deve ser

derivado do mesmo DER, e o sistema implementado deve utilizar esse mesmo modelo 16gico).

## 7.1 Modelo Conceitual (MER)

- \+ Descricdo textual e/ou esquemética das entidades identificadas, classificando-as como fortes, fracas ou associativas, quando for o caso;

- Identificagdo dos relaci (total ou parcial), com justificativa baseada nas regras de negdcio; entre as enti com suas (1:1, 1:N, N:N) e tipo de

- Identificagdo dos atributos relevantes de cada entidade, indicando quais chave, compostos, multivalorados ou derivados, quando existirem.

## 7.2 Diagrama Entidade-Relacionamento (DER)

- Representacdo grafica do MER utilizando a notagdo definida em sala de aula;

- Deve conter todas as entidades, atributos, relaci para atender as de regras descritas; )S, Ci i e chaves primari iras necessarias

- Recomenda-se 0 uso de uma ferramenta de modelagem (por exemplo, brModelo, MySQL Workbench, dbdiagram.io, draw.io/diagrams.net ou similar).

## 7.3 Dicionério de Dados

- \+ Para cada entidade do modelo, uma tabela contendo, no minimo: nome do atributo, tipo de dado, tamanho/precisao quando aplicavel, se é chave (primaria, estrangeira, candidata), se é obrigatdrio, e uma breve do dado; do significado

- O dicionario deve ser suficiente para que outra pessoa, sem conhecer o projeto, entenda o significado de cada dado armazenado.


## 7.4 Modelo Légico

- Conversdo do DER em esquema relacional, com a definigdo das tabelas, colunas, tipos de dados, chaves primarias e estrangeiras e demais restrigdes (obrigatoriedade, unicidade, valores permitidos);

- Verificagao e, se necessario, ajuste do esquema para eliminar dependéncias parciais e transitivas, garantindo no minimo a 3* Forma Normal (3FN);

- Pode ser apresentado como diagrama relacional, como script de criagdo (DDL) ou como conjunto de tabelas descritas em notagdo relacional (Nome_Tabela(colunal, coluna2, ...)), conforme orientagdo do professor.

## 7.5 Sistema Web Fullstack (M6dulo de Desenvolvimento)

- \+ Cddigo-fonte do frontend (HTML, CSS, JavaScript), do backend e dos scripts de banco de dados;

- Dockerfile(s) e docker-compose.yml funcionais, com deploy validado no servidor local da sala;

- README.md com instrugdes de execugdo e credenciais de teste;

- Evidéncias (prints ou video curto) do sistema em funcionamento, conforme especificado em 5.5.

## 8. Uso de Inteligéncia Artificial nesta Atividade

O uso de ferramentas de IA como apoio ao estudo é permitido e incentivado para tirar conceituais, revisar sua l6gica e discutir alternativas de modelagem ou de implementagdo. No entanto, o c6digo-fonte, 0 MER, o DER, o diciondrio de dados e 0 modelo 16gico entregues devem ser produgdo do(a) proprio(a) estudante (ou da dupla). Trabalhos identificados como gerados integralmente por IA, sem dominio das decisdes tomadas pelo(a) estudante, poderdo ser desconsiderados fins de avaliagdo, a critério do professor. para

## 9. Requisitos de Entrega

|   | Formato dos arquivos | e |   | em diagrama, script SQL ou documento; MER do médulo de desenvolvimento. | ‘Um tinico arquivo compactado (.zip) contendo: DER em imagem ou PDF; documento de texto (PDF ou .docx); e uma pasta “sistema/” com o fonte completo do frontend, backend, Dockerfile(s), docker-compose.yml | de dados em planilha, tabela de documento ou PDF; modelo | e justificativas em |
| --- | --- | --- | --- | --- | --- | --- | --- |
|   | Organizagdo da entrega |   |   | Individual ou em dupla, conforme |   | do professor em sala. |   |
|   | Ferramentas sugeridas (modelagem) Ferramentas/tecnologias sugeridas (desenvolvimento) |   |   | brModelo, MySQL Workbench, Frontend: HTMLS5, CSS3, JavaScript. Backend: | it Lucidchart ou outra ferramenta de modelagem aprovada pelo professor. Python (Flask/Django) ou outra stack aprovada pelo professor. Banco de dados: MySQL, PostgreSQL ou MariaDB. Conteinerizagao: Docker e | io, draw.io/di | net, PHP, |
|   |   |   |   | Docker Compose. |   |   |   |
| Deploy |   |   |   |   | Obrigatério no servidor local disponivel na sala de aula, via “docker |   |   |
|   |   |   | dedicado | compose up”, com container dedicado para o backend e container | para o banco de dados, acessivel pela rede local da sala. |   |   |
| Prazo |   |   |   | A ser definido pelo professor no cronograma da turma. |   |   |   |
|   | Forma de entrega Natureza da avaliagdo |   |   | i associada), ac previstas no plano de ensino. | Upload no ambiente pedagégico indicado pelo professor (Situagdo de funcionamento no servidor local em data combinada com o professor. Somativa parcial (Entrega 30 do sistema do Modelo implantado), E-R para precedida o estudo de pelas caso e formativas de exercicios de DER e aplicacdo das Formas Normais | da | 0 do sistema em |
