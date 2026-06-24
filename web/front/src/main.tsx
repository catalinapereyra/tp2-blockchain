import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext";
import { ToastProvider } from "./components/common/Toast";
import { LoaderProvider } from "./components/common/Loader";
import { ConfirmProvider } from "./components/common/Confirm";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <LoaderProvider>
          <ToastProvider>
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
          </ToastProvider>
        </LoaderProvider>
      </WalletProvider>
    </BrowserRouter>
  </StrictMode>
);
