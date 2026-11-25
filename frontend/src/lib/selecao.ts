/**
 * Qual item o editor ao lado de uma lista deve mostrar.
 *
 * Sem escolha: o primeiro da lista. Com escolha: o item escolhido. Logo
 * depois de salvar, o registro salvo — mesmo que a lista ainda não o tenha
 * (está recarregando) ou tenha a versão antiga dele.
 */
export function itemAtual<T extends { id: number }>(
  lista: T[] | undefined,
  id: number | null,
  salvo: T | null,
  carregando: boolean,
): T | null {
  const doSalvo = salvo !== null && salvo.id === id ? salvo : null;
  const naLista =
    id === null ? undefined : lista?.find((item) => item.id === id);
  return (carregando && doSalvo) || naLista || doSalvo || lista?.[0] || null;
}
