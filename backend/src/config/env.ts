import { randomBytes } from "node:crypto";
import * as dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Variável definida mas vazia (ex.: `ADMIN_LOGIN=` no .env, ou
// `${ADMIN_LOGIN:-}` no docker-compose) vale como "não definida".
const semVazias = Object.fromEntries(
  Object.entries(process.env).filter(([, valor]) => valor !== ""),
);

const inteiro = (padrao: number, minimo = 0) =>
  z.coerce.number().int().min(minimo).default(padrao);

const enviromentSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    CORS_ORIGIN: z
      .string("CORS_ORIGIN é obrigatório")
      .min(1, "CORS_ORIGIN não pode estar vazio")
      .transform((val) => {
        // Se for apenas o caractere coringa '*', retorna como string única
        if (val === "*") return val;

        // Caso contrário, divide por vírgula e remove espaços extras
        return val.split(",").map((url) => url.trim());
      }),
    // Fuso do negócio: define o que é "hoje" para validade de promoções e
    // cupons e para os períodos dos relatórios (o container roda em UTC).
    APP_TIMEZONE: z
      .string()
      .default("America/Sao_Paulo")
      .refine(
        (fuso) => {
          try {
            new Intl.DateTimeFormat("en-US", { timeZone: fuso });
            return true;
          } catch {
            return false;
          }
        },
        { message: "APP_TIMEZONE não é um fuso horário IANA válido" },
      ),

    // --- Banco de dados -----------------------------------------------------
    // Duas formas de configurar (basta uma):
    //  a) DATABASE_URL pronta — prática no desenvolvimento local;
    //  b) DB_HOST/DB_USER/DB_PASSWORD/DB_NAME separados — usada no
    //     docker-compose. A URL é montada aqui embaixo com
    //     encodeURIComponent, então a senha pode ter @ : / # ? sem quebrar.
    DATABASE_URL: z.url({ message: "DATABASE_URL inválida" }).optional(),
    DB_HOST: z.string().optional(),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
    DB_USER: z.string().optional(),
    DB_PASSWORD: z.string().optional(),
    DB_NAME: z.string().optional(),

    // --- Autenticação -------------------------------------------------------
    // Chave que assina os tokens de sessão (JWT). Quem a conhece consegue
    // forjar um token de gerente: por isso é obrigatória em produção e
    // precisa ser longa e aleatória.
    JWT_SECRET: z
      .string()
      .min(32, "JWT_SECRET precisa ter pelo menos 32 caracteres")
      .optional(),
    // Validade do token: o padrão cobre um turno de trabalho.
    JWT_EXPIRA_EM_HORAS: inteiro(8, 1),
    // Primeiro usuário (gerente), criado na subida se ainda não existir
    // nenhum funcionário com login. Depois disso podem ser removidas.
    ADMIN_LOGIN: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9._-]{3,50}$/, "ADMIN_LOGIN: 3 a 50 letras, números, . _ -")
      .optional(),
    ADMIN_SENHA: z
      .string()
      .min(8, "ADMIN_SENHA precisa ter pelo menos 8 caracteres")
      .max(128)
      .optional(),

    // --- Limite de requisições (0 desliga) ----------------------------------
    // Por IP, para toda a API.
    LIMITE_REQUISICOES_POR_MINUTO: inteiro(600),
    // Tentativas de login ERRADAS por IP + login, a cada 15 minutos.
    LIMITE_TENTATIVAS_LOGIN: inteiro(10),
  })
  .superRefine((env, ctx) => {
    const temPartes = env.DB_HOST && env.DB_USER && env.DB_PASSWORD && env.DB_NAME;
    if (!env.DATABASE_URL && !temPartes) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message:
          "Informe DATABASE_URL ou o conjunto DB_HOST, DB_USER, DB_PASSWORD e DB_NAME",
      });
    }
    if (env.NODE_ENV === "production" && !env.JWT_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["JWT_SECRET"],
        message: "JWT_SECRET é obrigatório em produção",
      });
    }
    if (Boolean(env.ADMIN_LOGIN) !== Boolean(env.ADMIN_SENHA)) {
      ctx.addIssue({
        code: "custom",
        path: ["ADMIN_LOGIN"],
        message: "ADMIN_LOGIN e ADMIN_SENHA devem ser informados juntos",
      });
    }
  });

const parsedEnv = enviromentSchema.safeParse(semVazias);

// 4. Verifica se a validação falhou e reporta o erro imediatamente
if (!parsedEnv.success) {
  console.error("Erro de validação nas variáveis de ambiente:");
  console.error(JSON.stringify(z.flattenError(parsedEnv.error).fieldErrors, null, 2));

  // Encerra a aplicação imediatamente se faltar algo obrigatório
  process.exit(1);
}

const env = parsedEnv.data;

function montarDatabaseUrl(): string {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  const usuario = encodeURIComponent(env.DB_USER ?? "");
  const senha = encodeURIComponent(env.DB_PASSWORD ?? "");
  const banco = encodeURIComponent(env.DB_NAME ?? "");
  return `postgresql://${usuario}:${senha}@${env.DB_HOST}:${env.DB_PORT}/${banco}?schema=public`;
}

// Fora de produção, sem JWT_SECRET, gera-se uma chave que vale só enquanto o
// processo estiver de pé (a cada reinício os tokens antigos deixam de valer).
// Evita ter uma chave "de exemplo" versionada que alguém esqueça em produção.
function resolverJwtSecret(): string {
  if (env.JWT_SECRET) return env.JWT_SECRET;
  console.warn(
    "[config] JWT_SECRET não definido: usando chave temporária (os logins caem a cada reinício).",
  );
  return randomBytes(48).toString("hex");
}

// 5. Exporta as variáveis validadas (com tipos automáticos do TypeScript)
export const environment = {
  ...env,
  DATABASE_URL: montarDatabaseUrl(),
  JWT_SECRET: resolverJwtSecret(),
};
