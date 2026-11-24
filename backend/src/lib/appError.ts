// Erro de regra de negócio: lançado pelos services quando a requisição é
// sintaticamente válida (passou pelo Zod) mas viola uma regra do domínio.
// O errorHandler converte em resposta HTTP com o status informado.
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
