import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";

interface PropsDoControle {
  id?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
  className?: string;
}

interface Props {
  rotulo: ReactNode;
  /** Texto de ajuda abaixo do campo. */
  ajuda?: ReactNode;
  /** Mensagem de erro: borda vermelha, tremida e leitura pelo leitor de tela. */
  erro?: string;
  className?: string;
  /** O <input>, <select> ou <textarea> (recebe id e aria-* automaticamente). */
  children: ReactElement<PropsDoControle>;
}

/**
 * Campo do design system: rótulo sempre visível, ajuda e erro ligados ao
 * controle por aria-describedby. Ao aparecer um erro novo, o campo treme
 * uma vez (sc-shake).
 */
export function Campo({ rotulo, ajuda, erro, className, children }: Props) {
  const id = useId();
  const idAjuda = `${id}-ajuda`;
  const idErro = `${id}-erro`;
  const caixa = useRef<HTMLDivElement>(null);

  // Animação direto no DOM: reinicia a tremida a cada erro novo.
  useEffect(() => {
    const el = caixa.current;
    if (!erro || !el) return;
    el.classList.remove("sc-shake");
    void el.offsetWidth; // força o navegador a reiniciar a animação
    el.classList.add("sc-shake");
    const t = setTimeout(() => el.classList.remove("sc-shake"), 400);
    return () => clearTimeout(t);
  }, [erro]);

  const descritores =
    [ajuda && idAjuda, erro && idErro].filter(Boolean).join(" ") || undefined;

  const controle = isValidElement(children)
    ? cloneElement(children, {
        id: children.props.id ?? id,
        "aria-invalid": erro ? true : undefined,
        "aria-describedby": descritores,
        className: children.props.className ?? "sc-input",
      })
    : children;

  return (
    <div
      ref={caixa}
      className={["sc-field", className].filter(Boolean).join(" ")}
    >
      <label className="sc-field__label" htmlFor={children.props.id ?? id}>
        {rotulo}
      </label>
      {controle}
      {ajuda && (
        <span id={idAjuda} className="sc-field__help">
          {ajuda}
        </span>
      )}
      {erro && (
        <span id={idErro} className="sc-field__error" role="alert">
          {erro}
        </span>
      )}
    </div>
  );
}
