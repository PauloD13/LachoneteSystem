// Ícones de traço arredondado (2px), desenhados no mesmo estilo dos
// protótipos. Um só lugar para todos: <Icone nome="mais" />.

const CAMINHOS = {
  inicio: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  pedidos: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  mais: "M12 5v14M5 12h14",
  mesa: "M4 9h16M6 9v10M18 9v10M9 5h6",
  reticencias: "M5 12h.01M12 12h.01M19 12h.01",
  voltar: "M15 5l-7 7 7 7",
  avancar: "M9 5l7 7-7 7",
  fechar: "M6 6l12 12M18 6L6 18",
  menos: "M5 12h14",
  check: "M5 12l5 5 9-10",
  busca: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
  pessoa: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6",
  pessoas:
    "M9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM2 21c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 15.5c2 .6 3.3 2.4 4 5",
  local:
    "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  telefone:
    "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  moto: "M5 17a3 3 0 1 0 0-.01M19 17a3 3 0 1 0 0-.01M8 17h6l3-6h-4l-2-3H8M14 11l2 6",
  relogio: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  estrela:
    "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  cardapio:
    "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11M9 8h6",
  estoque: "M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8",
  grafico: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  ajustes:
    "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  sair: "M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3",
  lapis: "M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4",
  lixeira: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  panela:
    "M3 10h18M5 10v7a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-7M9 6c0-1 1-2 3-2s3 1 3 2M1 10h2M21 10h2",
  historico: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2",
  tema: "M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z",
  chave:
    "M15 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM10.5 13.5L3 21M6 18l2 2M8 16l2 2",
  dinheiro: "M3 6h18v12H3zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 9v.01M18 15v.01",
  cupom: "M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM9 7v10",
  alerta: "M12 3l10 18H2zM12 10v4M12 17v.01",
  olho: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  olhoFechado:
    "M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3 3.7M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.4-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2",
  // Categorias do cardápio (miniatura do produto sem foto)
  lanche:
    "M4 10a8 5 0 0 1 16 0zM3 13h18M4 16h16a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z",
  copo: "M7 4h10l-1.5 16h-7zM7 9h10M12 4l2-2",
  porcao: "M5 10h14l-2 10H7zM8 10l-1-6M12 10V3M16 10l1-6",
  doce: "M4 14h16v3a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM6 14a6 6 0 0 1 12 0M12 5v3",
  combo: "M3 11h10v8H3zM4 11a4 3 0 0 1 8 0M15 7h6l-1 12h-4zM15 11h6",
} as const;

export type NomeDoIcone = keyof typeof CAMINHOS;

interface Props {
  nome: NomeDoIcone;
  tamanho?: number;
  /** Espessura do traço (2 no padrão do design). */
  traco?: number;
  /** Texto para leitor de tela; sem ele o ícone é decorativo. */
  rotulo?: string;
  className?: string;
  preenchido?: boolean;
}

export function Icone({
  nome,
  tamanho = 20,
  traco = 2,
  rotulo,
  className,
  preenchido = false,
}: Props) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill={preenchido ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={traco}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={rotulo ? "img" : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
    >
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}
