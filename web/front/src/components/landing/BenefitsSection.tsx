import { Icon, type IconName } from "./Icon";

const BENEFITS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "user",
    title: "Vos tenés el control",
    text: "Decidís qué médico ve cada estudio y podés revocar el acceso cuando quieras.",
  },
  {
    icon: "shield",
    title: "Autenticidad garantizada",
    text: "El hash de cada documento queda en blockchain: podés probar que no fue modificado.",
  },
  {
    icon: "lock",
    title: "Privacidad real",
    text: "El contenido de tus documentos y tus datos sensibles quedan off-chain, privados.",
  },
  {
    icon: "document",
    title: "Todo en un solo lugar",
    text: "Estudios, recetas y diagnósticos organizados y accesibles cuando los necesites.",
  },
  {
    icon: "clipboard",
    title: "Recetas y diagnósticos digitales",
    text: "Pedís recetas a tu médico y recibís diagnósticos sin papeles ni traslados.",
  },
  {
    icon: "cube",
    title: "Sin intermediarios",
    text: "El registro vive en la blockchain; no dependés de una sola institución.",
  },
];

export function BenefitsSection() {
  return (
    <section className="benefits-section" id="beneficios">
      <h2>Beneficios de MediChain</h2>
      <div className="benefits-grid">
        {BENEFITS.map((b) => (
          <article className="benefit-card" key={b.title}>
            <span className="benefit-icon"><Icon name={b.icon} size={26} /></span>
            <h3>{b.title}</h3>
            <p>{b.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
