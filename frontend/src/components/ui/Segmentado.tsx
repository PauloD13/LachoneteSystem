interface Opcao<T extends string> {
  valor: T;
  rotulo: string;
  desabilitada?: boolean;
}

interface Props<T extends string> {
  rotulo: string;
  opcoes: Opcao<T>[];
  valor: T;
  aoMudar(valor: T): void;
  className?: string;
}

/** Controle segmentado: trilho surface-300, opção ativa em surface-200. */
export function Segmentado<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
  className,
}: Props<T>) {
  return (
    <div
      role="group"
      aria-label={rotulo}
      className={["ui-segmentado", className].filter(Boolean).join(" ")}
    >
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          className="ui-segmentado__opcao"
          aria-pressed={opcao.valor === valor}
          disabled={opcao.desabilitada}
          onClick={() => aoMudar(opcao.valor)}
        >
          {opcao.rotulo}
        </button>
      ))}
    </div>
  );
}
