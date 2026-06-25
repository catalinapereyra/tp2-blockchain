import { USERS } from "./landingData";
import { Icon } from "./Icon";

export function UsersSection() {
  return (
    <section className="users-section" id="beneficios">
      <h2>¿Quiénes usan MediChain?</h2>
      <div className="user-grid">
        {USERS.map((user) => (
          <article className={`user-card ${user.color}`} key={user.title}>
            <div className="user-card-heading">
              <span className="user-icon"><Icon name={user.icon} size={31} /></span>
              <h3>{user.title}</h3>
            </div>
            <ul>
              {user.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
