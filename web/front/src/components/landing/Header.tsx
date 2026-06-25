import { Brand } from "./Brand";
import { Icon } from "./Icon";

type HeaderProps = {
  onConnect: () => void;
  loading: boolean;
};

export function Header({ onConnect, loading }: HeaderProps) {
  return (
    <header className="landing-header">
      <Brand ariaLabel="MediChain, inicio" />

      <nav className="landing-nav" aria-label="Navegación principal">
        <a className="active" href="#inicio">Inicio</a>
        <a href="#como-funciona">¿Cómo funciona?</a>
        <a href="#beneficios">Beneficios</a>
        <a href="#seguridad">Seguridad</a>
      </nav>

      <button type="button" className="header-login" onClick={onConnect} disabled={loading}>
        <Icon name="user" size={17} />
        {loading ? "Conectando..." : "Iniciar sesión"}
      </button>
    </header>
  );
}
