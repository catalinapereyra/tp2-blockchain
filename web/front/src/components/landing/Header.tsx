import { Brand } from "./Brand";

export function Header() {
  return (
    <header className="landing-header">
      <Brand ariaLabel="MediChain, inicio" />

      <nav className="landing-nav" aria-label="Navegación principal">
        <a className="active" href="#inicio">Inicio</a>
        <a href="#como-funciona">¿Cómo funciona?</a>
        <a href="#beneficios">Beneficios</a>
        <a href="#seguridad">Seguridad</a>
      </nav>
    </header>
  );
}
