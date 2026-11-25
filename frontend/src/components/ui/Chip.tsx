import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  selecionado?: boolean;
}

/** Chip neutro (categorias, variações, filtros). Nunca laranja. */
export function Chip({
  selecionado,
  className,
  type = "button",
  ...resto
}: Props) {
  return (
    <button
      type={type}
      className={["sc-chip", className].filter(Boolean).join(" ")}
      aria-pressed={selecionado ?? false}
      {...resto}
    />
  );
}
