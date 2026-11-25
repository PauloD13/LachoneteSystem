import { useId, type KeyboardEvent } from "react";

interface Props<T extends string> {
  rotulo: string;
  abas: { valor: T; rotulo: string }[];
  valor: T;
  aoMudar(valor: T): void;
}

/** Abas (role="tablist") com setas do teclado. */
export function Abas<T extends string>({
  rotulo,
  abas,
  valor,
  aoMudar,
}: Props<T>) {
  const id = useId();
  function teclado(evento: KeyboardEvent<HTMLDivElement>) {
    const i = abas.findIndex((a) => a.valor === valor);
    const passo =
      evento.key === "ArrowRight" ? 1 : evento.key === "ArrowLeft" ? -1 : 0;
    if (!passo) return;
    evento.preventDefault();
    const proxima = abas[(i + passo + abas.length) % abas.length];
    aoMudar(proxima.valor);
    document.getElementById(`${id}-${proxima.valor}`)?.focus();
  }
  return (
    <div
      role="tablist"
      aria-label={rotulo}
      className="ui-abas"
      onKeyDown={teclado}
    >
      {abas.map((a) => (
        <button
          key={a.valor}
          id={`${id}-${a.valor}`}
          type="button"
          role="tab"
          aria-selected={a.valor === valor}
          tabIndex={a.valor === valor ? 0 : -1}
          onClick={() => aoMudar(a.valor)}
        >
          {a.rotulo}
        </button>
      ))}
    </div>
  );
}
