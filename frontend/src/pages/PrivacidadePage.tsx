import { Link } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { telaInicial } from "../lib/telaInicial";
import estilos from "./PaginaInformativa.module.css";

/**
 * Aviso de privacidade (LGPD, art. 9º): quais dados o sistema guarda, para
 * quê, com qual base legal, por quanto tempo e como o titular exerce seus
 * direitos. Página pública: o cliente pode lê-la sem login.
 */
export function PrivacidadePage() {
  const { usuario } = useAuth();
  return (
    <main className={estilos.pagina}>
      <article className={`ui-cartao ${estilos.cartao}`}>
        <span className={estilos.marca}>Sabor &amp; Cia</span>
        <h1 className={estilos.titulo}>Aviso de privacidade</h1>
        <p className="ui-suave">
          Como a Lanchonete Sabor &amp; Cia trata os dados pessoais no sistema
          de pedidos, conforme a Lei Geral de Proteção de Dados (Lei nº
          13.709/2018).
        </p>

        <h2>Quem é responsável</h2>
        <p>
          A Lanchonete Sabor &amp; Cia é a controladora dos dados. Pedidos e
          dúvidas sobre privacidade são atendidos pela gerência, no balcão ou
          pelo telefone da loja.
        </p>

        <h2>Quais dados guardamos e para quê</h2>
        <ul>
          <li>
            <strong>Clientes:</strong> nome, telefone, e-mail (opcional) e
            endereço de entrega, para registrar, preparar e entregar os pedidos
            e contatar o cliente sobre eles.
          </li>
          <li>
            <strong>Pedidos:</strong> itens, valores, pagamentos, observações,
            endereço da entrega e avaliação, para o atendimento, o caixa e o
            registro de vendas.
          </li>
          <li>
            <strong>Funcionários:</strong> nome, contato, login, cargos e
            histórico de cargos, para o controle de acesso e o registro de quem
            atendeu e entregou cada pedido. A senha é guardada apenas como
            resumo criptográfico (hash), nunca em texto.
          </li>
          <li>
            <strong>Registros técnicos:</strong> data, rota acessada e código do
            funcionário de cada requisição, para segurança e diagnóstico. Não
            registramos senhas, corpo das requisições nem termos buscados.
          </li>
        </ul>

        <h2>Bases legais</h2>
        <p>
          Execução do contrato de compra e entrega (art. 7º, V), cumprimento de
          obrigações legais, como o registro de vendas (art. 7º, II), e legítimo
          interesse na segurança do sistema e na melhoria do atendimento, por
          meio de relatórios e avaliações (art. 7º, IX). Não usamos os dados
          para publicidade e não os vendemos nem compartilhamos com terceiros.
        </p>

        <h2>Por quanto tempo</h2>
        <p>
          O cadastro do cliente fica enquanto ele for cliente ou até pedir a
          exclusão. Os pedidos ficam pelo prazo exigido para registros fiscais e
          contábeis; quando o cliente pede a exclusão e já tem pedidos, os dados
          que o identificam são apagados e os pedidos ficam anônimos.
        </p>

        <h2>Seus direitos (art. 18)</h2>
        <p>Peça à gerência, a qualquer momento:</p>
        <ul>
          <li>confirmação de que tratamos seus dados e acesso a eles;</li>
          <li>correção de dados incompletos ou desatualizados;</li>
          <li>
            cópia dos seus dados em arquivo (portabilidade), entregue na hora;
          </li>
          <li>
            exclusão dos seus dados: o cadastro é apagado ou, se houver pedidos,
            anonimizado;
          </li>
          <li>
            informação sobre com quem os dados são compartilhados (ninguém).
          </li>
        </ul>
        <p>
          Respondemos em até 15 dias, e a exportação e a exclusão são imediatas.
        </p>

        <h2>Como protegemos</h2>
        <p>
          Acesso só com login e de acordo com o cargo; senhas com hash scrypt;
          limite de tentativas de login; respostas da API sem cache no
          navegador; registros sem dados pessoais; o sistema roda na rede
          interna da loja e fica fora dos buscadores.
        </p>

        <h2>Armazenamento no navegador</h2>
        <p>
          O sistema não usa cookies. O navegador do funcionário guarda só o
          token da sessão, a preferência de tema e o pedido em montagem, que é
          apagado ao sair.
        </p>

        <p className={estilos.acoes}>
          <Link
            to={usuario ? telaInicial(usuario) : "/login"}
            className="sc-btn sc-btn--primary"
          >
            {usuario ? "Voltar ao sistema" : "Ir para o login"}
          </Link>
        </p>
      </article>
    </main>
  );
}
