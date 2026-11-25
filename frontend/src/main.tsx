import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
// Fontes do design system servidas pelo próprio sistema (e não pelo Google
// Fonts): funcionam mesmo se a rede da sala não tiver internet. Só o
// alfabeto latino e só os pesos que o design usa.
import "@fontsource/fredoka/latin-500.css";
import "@fontsource/fredoka/latin-600.css";
import "@fontsource/nunito/latin-500.css";
import "@fontsource/nunito/latin-600.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-800.css";
import "./index.css";
import { aplicarTemaSalvo } from "./lib/tema";
import App from "./App.tsx";
import { AuthProvider } from "./contexts/AuthProvider";
import { AvisosProvider } from "./contexts/AvisosProvider";

// Antes de desenhar qualquer coisa, para a tela já nascer no tema certo.
aplicarTemaSalvo();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AvisosProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AvisosProvider>
    </BrowserRouter>
  </StrictMode>,
);
