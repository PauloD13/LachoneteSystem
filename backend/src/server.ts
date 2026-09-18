import { environment } from './config/env.js'
import app from "./app.js";

//SECTION - Configurando porta (env ou default 3000)

const port = environment.PORT

//SECTION - Iniciando servidor HTTP
const server = app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`);
});

const shutdown = () => {
  console.log('Recebido sinal de encerramento. Desligando com segurança...');

  server.close(() => {
    console.log('Servidor HTTP fechado.');
    
    // Feche conexões de banco de dados aqui (ex: mongoose.connection.close())
    
    process.exit(0);
  });
};

// Ouvindo sinais do sistema operacional (Docker, Kubernetes, terminal)
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);