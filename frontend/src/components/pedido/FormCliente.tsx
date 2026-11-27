import { useState, type FormEvent } from "react";
import { Campo } from "../ui/Campo";
import { Botao } from "../ui/Botao";
import { clientes } from "../../services/cadastros";
import { useAvisos } from "../../hooks/useAvisos";
import { errosDosCampos, textoOuNulo } from "../../lib/formularios";
import type { Cliente, ClienteEntrada } from "../../types/dominio";

interface Props {
  /** Sem cliente = cadastro novo. */
  cliente?: Cliente | null;
  aoSalvar(cliente: Cliente): void;
  aoCancelar?(): void;
  /** Endereço obrigatório (pedido de entrega). */
  exigirEndereco?: boolean;
}

const CAMPOS_DE_ENDERECO = [
  ["enderecoPadraoLogradouro", "Rua / avenida", "ui-form__inteiro"],
  ["enderecoPadraoNumero", "Número", ""],
  ["enderecoPadraoBairro", "Bairro", ""],
  ["enderecoPadraoCidade", "Cidade", ""],
  ["enderecoPadraoCep", "CEP", ""],
] as const;

/** Cadastro/edição de cliente (tela Clientes e escolha no pedido). */
export function FormCliente({
  cliente,
  aoSalvar,
  aoCancelar,
  exigirEndereco,
}: Props) {
  const avisos = useAvisos();
  const [dados, setDados] = useState<Record<keyof ClienteEntrada, string>>({
    nome: cliente?.nome ?? "",
    telefone: cliente?.telefone ?? "",
    email: cliente?.email ?? "",
    enderecoPadraoLogradouro: cliente?.enderecoPadraoLogradouro ?? "",
    enderecoPadraoNumero: cliente?.enderecoPadraoNumero ?? "",
    enderecoPadraoBairro: cliente?.enderecoPadraoBairro ?? "",
    enderecoPadraoCidade: cliente?.enderecoPadraoCidade ?? "",
    enderecoPadraoCep: cliente?.enderecoPadraoCep ?? "",
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  const mudar = (campo: keyof ClienteEntrada) => (valor: string) =>
    setDados((d) => ({ ...d, [campo]: valor }));

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const novos: Record<string, string> = {};
    if (dados.nome.trim().length < 2) novos.nome = "Informe o nome do cliente.";
    if (dados.telefone.replace(/\D/g, "").length < 8)
      novos.telefone = "Informe um telefone com DDD.";
    if (exigirEndereco) {
      for (const [campo, rotulo] of CAMPOS_DE_ENDERECO) {
        if (!dados[campo].trim())
          novos[campo] = `Informe: ${rotulo.toLowerCase()}.`;
      }
    }
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    const corpo: ClienteEntrada = {
      nome: dados.nome.trim(),
      telefone: dados.telefone.trim(),
      email: textoOuNulo(dados.email),
      enderecoPadraoLogradouro: textoOuNulo(dados.enderecoPadraoLogradouro),
      enderecoPadraoNumero: textoOuNulo(dados.enderecoPadraoNumero),
      enderecoPadraoBairro: textoOuNulo(dados.enderecoPadraoBairro),
      enderecoPadraoCidade: textoOuNulo(dados.enderecoPadraoCidade),
      enderecoPadraoCep: textoOuNulo(dados.enderecoPadraoCep),
    };
    setSalvando(true);
    try {
      const salvo = cliente
        ? await clientes.atualizar(cliente.id, corpo)
        : await clientes.criar(corpo);
      avisos.sucesso(cliente ? "Cliente atualizado" : "Cliente cadastrado");
      aoSalvar(salvo);
    } catch (erro) {
      setErros(errosDosCampos(erro));
      avisos.erro(erro);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form
      className="ui-coluna"
      style={{ gap: 16 }}
      onSubmit={salvar}
      noValidate
    >
      <div className="ui-form">
        <Campo rotulo="Nome" erro={erros.nome} className="ui-form__inteiro">
          <input
            autoComplete="off"
            value={dados.nome}
            onChange={(e) => mudar("nome")(e.target.value)}
          />
        </Campo>
        <Campo rotulo="Telefone" erro={erros.telefone}>
          <input
            type="tel"
            inputMode="tel"
            placeholder="(11) 98765-4321"
            value={dados.telefone}
            onChange={(e) => mudar("telefone")(e.target.value)}
          />
        </Campo>
        <Campo rotulo="E-mail (opcional)" erro={erros.email}>
          <input
            type="email"
            value={dados.email}
            onChange={(e) => mudar("email")(e.target.value)}
          />
        </Campo>
      </div>
      <fieldset className="ui-grupo">
        <legend>
          Endereço de entrega
          {!exigirEndereco && (
            <span className="ui-texto-sm ui-suave">opcional</span>
          )}
        </legend>
        <div className="ui-form">
          {CAMPOS_DE_ENDERECO.map(([campo, rotulo, classe]) => (
            <Campo
              key={campo}
              rotulo={rotulo}
              erro={erros[campo]}
              className={classe || undefined}
            >
              <input
                value={dados[campo]}
                inputMode={
                  campo === "enderecoPadraoCep" ? "numeric" : undefined
                }
                onChange={(e) => mudar(campo)(e.target.value)}
              />
            </Campo>
          ))}
        </div>
      </fieldset>
      {/* LGPD, art. 9º: quem fornece os dados tem de saber para quê. */}
      <p className="ui-texto-sm ui-suave">
        Avise o cliente: estes dados servem para registrar e entregar os
        pedidos, e ele pode pedir uma cópia ou a exclusão a qualquer momento.{" "}
        <a
          href="/privacidade"
          target="_blank"
          rel="noopener"
          className="ui-link"
        >
          Aviso de privacidade
        </a>
      </p>
      <div className="ui-linha" style={{ justifyContent: "flex-end" }}>
        {aoCancelar && (
          <Botao variante="fantasma" onClick={aoCancelar} disabled={salvando}>
            Cancelar
          </Botao>
        )}
        <Botao
          type="submit"
          variante="primario"
          carregando={salvando}
          textoCarregando="Salvando…"
        >
          {cliente ? "Salvar cliente" : "Cadastrar cliente"}
        </Botao>
      </div>
    </form>
  );
}
