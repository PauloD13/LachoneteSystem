import { useState, type FormEvent } from "react";
import { Campo } from "../ui/Campo";
import { Botao } from "../ui/Botao";
import { auth } from "../../services/auth";
import { useAvisos } from "../../hooks/useAvisos";
import { errosDosCampos } from "../../lib/formularios";

/** Troca a própria senha (PATCH /auth/senha). */
export function TrocarSenha({ aoConcluir }: { aoConcluir?(): void }) {
  const avisos = useAvisos();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [repetida, setRepetida] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const novos: Record<string, string> = {};
    if (!atual) novos.senhaAtual = "Digite a senha atual.";
    if (nova.length < 8)
      novos.novaSenha = "A nova senha precisa de pelo menos 8 caracteres.";
    else if (nova !== repetida) novos.repetida = "As senhas não são iguais.";
    setErros(novos);
    if (Object.keys(novos).length) return;
    setSalvando(true);
    try {
      await auth.trocarSenha(atual, nova);
      avisos.sucesso("Senha trocada");
      setAtual("");
      setNova("");
      setRepetida("");
      aoConcluir?.();
    } catch (erro) {
      setErros(errosDosCampos(erro));
      avisos.erro(erro);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="ui-coluna" onSubmit={salvar} noValidate>
      <Campo rotulo="Senha atual" erro={erros.senhaAtual}>
        <input
          type="password"
          autoComplete="current-password"
          value={atual}
          onChange={(e) => setAtual(e.target.value)}
        />
      </Campo>
      <Campo
        rotulo="Nova senha"
        erro={erros.novaSenha}
        ajuda="Mínimo de 8 caracteres."
      >
        <input
          type="password"
          autoComplete="new-password"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
        />
      </Campo>
      <Campo rotulo="Repita a nova senha" erro={erros.repetida}>
        <input
          type="password"
          autoComplete="new-password"
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
        />
      </Campo>
      <Botao
        type="submit"
        variante="primario"
        carregando={salvando}
        textoCarregando="Salvando…"
        style={{ alignSelf: "flex-start" }}
      >
        Trocar senha
      </Botao>
    </form>
  );
}
