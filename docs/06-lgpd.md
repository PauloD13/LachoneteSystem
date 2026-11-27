# LGPD — Proteção de dados pessoais

Como o sistema da Lanchonete Sabor & Cia atende a Lei Geral de Proteção de
Dados (Lei nº 13.709/2018). O texto para o público (clientes e funcionários)
fica na tela **`/privacidade`**, aberta sem login e ligada no login, no
perfil, no cadastro do cliente e na ficha do cliente.

## Papéis

| Papel (LGPD)            | Quem                                                        |
| ----------------------- | ----------------------------------------------------------- |
| Controlador (art. 5º, VI) | Lanchonete Sabor & Cia                                     |
| Encarregado (art. 41)   | A gerência da loja (atende pedidos dos titulares)           |
| Operadores              | Nenhum: o sistema roda num servidor da própria loja         |
| Titulares               | Clientes e funcionários                                     |

## Dados pessoais tratados

| Onde (tabela)                    | Dados                                                         | Finalidade                                           | Base legal (art. 7º)                   |
| -------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------- |
| `cliente`                        | nome, telefone, e-mail (opcional), endereço padrão            | registrar, preparar e entregar pedidos; contato      | V — execução de contrato               |
| `entrega`                        | endereço da entrega (copiado no pedido)                       | entregar o pedido; histórico da entrega              | V — execução de contrato               |
| `pedido`, `item_pedido`          | itens, valores, observações, canal, datas                     | atendimento, caixa, registro de vendas               | V e II — obrigação legal (fiscal)      |
| `avaliacao_pedido`               | nota e comentário                                             | melhoria do atendimento (relatórios)                 | IX — legítimo interesse                |
| `funcionario`, `funcionario_cargo` | nome, telefone, e-mail, login, hash da senha, cargos        | controle de acesso; quem atendeu e entregou o pedido | V — contrato de trabalho; IX           |
| logs do backend                  | data, rota, status, duração, id do funcionário                | segurança, diagnóstico e registro das operações      | IX — legítimo interesse                |

Não há dados sensíveis (art. 5º, II), dados de crianças, decisões
automatizadas, marketing nem compartilhamento com terceiros.

## Princípios (art. 6º) na prática

- **Finalidade e necessidade**: o cadastro pede só o que a entrega precisa;
  e-mail e endereço são opcionais. Pedido de balcão pode ser anônimo.
- **Transparência**: aviso em `/privacidade`; o formulário de cliente lembra
  o atendente de informar para que servem os dados.
- **Segurança e prevenção** (art. 46): ver a seção "Segurança e operação" do
  README — senhas com hash scrypt, acesso por cargo, CSP, limites de
  tentativas, `Cache-Control: no-store` na API, container só leitura, banco
  sem porta exposta.
- **Minimização nos registros**: os logs não guardam query string, corpo da
  requisição, senha nem token. Buscas por nome ou telefone não vão para o
  log.
- **Responsabilização** (art. 37): cada exportação ou exclusão fica no log
  com o id do gerente que a fez.

## Direitos do titular (art. 18) e como atender

Quem atende é o **gerente**, na ficha do cliente (Gerência → Clientes →
"Dados pessoais (LGPD)"). Prazo legal de resposta: 15 dias (art. 19, II) —
no sistema, exportação e exclusão são imediatas.

| Direito                                   | Como o sistema atende                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------------------- |
| Confirmação e acesso (I, II)              | "Exportar dados": `GET /api/clientes/:id/dados` gera um JSON com cadastro e pedidos |
| Correção (III)                            | "Editar" na ficha do cliente (`PATCH /api/clientes/:id`)                           |
| Anonimização ou eliminação (IV, VI)       | "Excluir dados pessoais" — ver abaixo                                              |
| Portabilidade (V)                         | O mesmo JSON da exportação, em formato aberto                                      |
| Informação sobre compartilhamento (VII)   | Aviso de privacidade: não há compartilhamento                                      |

### Exclusão e anonimização

- **Cliente sem pedidos**: o cadastro é apagado (`DELETE /api/clientes/:id`).
- **Cliente com pedidos**: os pedidos precisam ficar (registro de vendas e de
  caixa, art. 16, I), então os dados que identificam a pessoa são apagados
  (`POST /api/clientes/:id/anonimizacao`):
  - cadastro: nome vira "Cliente anonimizado"; telefone, e-mail e endereço
    são apagados; `anonimizado_em` registra quando;
  - entregas dos pedidos dele: rua, número e CEP apagados (bairro e cidade
    ficam — sozinhos não identificam ninguém e servem às estatísticas);
  - observações dos pedidos e comentários das avaliações: apagados (texto
    livre pode conter nome, apartamento etc.);
  - ficam itens, valores, pagamentos, datas, status e a nota da avaliação.
- Com pedido **em andamento** a anonimização é recusada: a entrega ainda
  precisa do endereço. Conclua ou cancele o pedido antes.
- Cliente anonimizado some da busca, não pode ser editado nem receber pedido
  novo (se voltar a comprar, é um cadastro novo).
- Não há como desfazer: a tela pede confirmação.

## Retenção

| Dado                       | Quanto tempo                                                                  |
| -------------------------- | ----------------------------------------------------------------------------- |
| Cadastro do cliente        | enquanto for cliente ou até pedir a exclusão                                  |
| Pedidos e pagamentos       | pelo prazo fiscal/contábil (5 anos é a referência usual); depois, anonimizar |
| Funcionários               | enquanto houver vínculo e pelo prazo da legislação trabalhista; desligado é desativado, não apagado |
| Logs do container          | conforme a rotação do Docker no servidor (configurar `max-size` no daemon)    |

A anonimização em lote de pedidos antigos não é automática: fica como
processo da gerência (ou incremento futuro, ver README).

## Armazenamento no navegador

Sem cookies. O `localStorage` guarda o token da sessão e a preferência de
tema; o `sessionStorage`, o pedido em montagem (apagado ao sair). Por isso
não há banner de cookies.

## Limitações conhecidas

- O deploy da sala usa HTTP. Em rede não confiável, colocar HTTPS na frente
  (proxy reverso) e ligar o HSTS em `backend/src/middlewares/seguranca.ts`.
- Backups do banco levam os dados pessoais: guardá-los com o mesmo cuidado
  e, depois de uma anonimização, os backups antigos ainda têm o dado original
  até expirarem.
