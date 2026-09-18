import * as dotenv from "dotenv";
import { z } from 'zod';

dotenv.config();

const enviromentSchema = z.object({
  PORT: z.string().transform((val) => parseInt(val, 10)).default(3000),
  DATABASE_URL: z.string().url({ message: "DATABASE_URL inválida ou ausente" }),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z
    .string("CORS_ORIGIN é obrigatório" )
    .min(1, "CORS_ORIGIN não pode estar vazio")
    .transform((val) => {
      // Se for apenas o caractere coringa '*', retorna como string única
      if (val === '*') return val;
      
      // Caso contrário, divide por vírgula e remove espaços extras
      return val.split(',').map((url) => url.trim());
    }),
});

const parsedEnv = enviromentSchema.safeParse(process.env);

// 4. Verifica se a validação falhou e reporta o erro imediatamente
if (!parsedEnv.success) {
  console.error("Erro de validação nas variáveis de ambiente:");
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  
  // Encerra a aplicação imediatamente se faltar algo obrigatório
  process.exit(1); 
}

// 5. Exporta as variáveis validadas (com tipos automáticos do TypeScript)
export const environment = parsedEnv.data;