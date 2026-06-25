import { STEPS } from "./landingData";
import { Icon } from "./Icon";

export function StepsSection() {
  return (
    <section className="steps-section" id="como-funciona">
      <h2>¿Cómo funciona?</h2>
      <div className="steps">
        <div className="steps-wave" />
        {STEPS.map((step, index) => (
          <article className="step" key={step.title}>
            <span className={`step-icon step-${index + 1}`}>
              <Icon name={step.icon} size={30} />
            </span>
            <h3><span>{step.number}</span> {step.title}</h3>
            <p>{step.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
