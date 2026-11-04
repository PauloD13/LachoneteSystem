import { z } from 'zod';

export const funcionarioSchema = z.object({
  id: z.string().uuid('ID inválido'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('Email inválido'),
  cargo: z.string().min(1, 'Cargo é obrigatório'),
  entregas: z.array(z.string().uuid('ID de entrega inválido')).optional(),
  pedidos: z.array(z.string().uuid('ID de pedido inválido')).optional(),
});

export type Funcionario = z.infer<typeof funcionarioSchema>;