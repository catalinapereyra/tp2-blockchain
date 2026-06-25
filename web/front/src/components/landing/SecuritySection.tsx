import { Icon } from "./Icon";

export function SecuritySection() {
  return (
    <section className="security-section" id="seguridad">
      <div className="security-icon"><Icon name="lock" size={34} /></div>
      <div>
        <p className="eyebrow">Información protegida</p>
        <h2>Seguridad sin perder el control</h2>
        <p>Los archivos médicos permanecen privados. En blockchain solo se registra una huella digital que permite comprobar su autenticidad.</p>
      </div>
    </section>
  );
}
