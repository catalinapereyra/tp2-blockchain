import { Icon } from "./Icon";

type HeroProps = {
  onConnect: () => void;
  loading: boolean;
  connectError: string | null;
};

export function Hero({ onConnect, loading, connectError }: HeroProps) {
  return (
    <section className="hero" id="inicio">
      <div className="hero-copy">
        <p className="eyebrow">Tu salud, en tus manos</p>
        <h1>
          Tu historial médico,<br />
          seguro y bajo<br />
          <span>tu control.</span>
        </h1>
        <p className="hero-description">
          MediChain te permite administrar tus documentos médicos de forma
          segura y decidir quién puede acceder a ellos. Blockchain garantiza
          la autenticidad de cada documento.
        </p>
        <button type="button" className="primary-button" onClick={onConnect} disabled={loading}>
          {loading ? "Conectando..." : "Iniciar sesión"}
          <Icon name="arrow" size={20} />
        </button>
        {connectError && <p className="connect-error">{connectError}</p>}
      </div>

      <div className="hero-visual" aria-label="Red segura de documentos médicos">
        <div className="glow" />
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="orbit orbit-three" />
        <span className="orbit-dot dot-one" />
        <span className="orbit-dot dot-two" />
        <span className="orbit-dot dot-three" />
        <span className="orbit-dot dot-four" />

        <div className="shield">
          <Icon name="shield" size={118} />
        </div>
        <div className="satellite satellite-top"><Icon name="document" /></div>
        <div className="satellite satellite-left"><Icon name="lab" /></div>
        <div className="satellite satellite-right"><Icon name="user" /></div>
        <div className="satellite satellite-bottom"><Icon name="lock" /></div>
      </div>
    </section>
  );
}
