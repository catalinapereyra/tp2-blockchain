import { useNavigate } from "react-router-dom";
import { Footer } from "../components/landing/Footer";
import { Header } from "../components/landing/Header";
import { Hero } from "../components/landing/Hero";
import { SecuritySection } from "../components/landing/SecuritySection";
import { StepsSection } from "../components/landing/StepsSection";
import { UsersSection } from "../components/landing/UsersSection";
import { BenefitsSection } from "../components/landing/BenefitsSection";
import "../components/landing/Landing.css";

export default function Landing() {
  const navigate = useNavigate();

  function handleLogin() {
    navigate("/home");
  }

  return (
    <main className="landing">
      <Header />
      <Hero onConnect={handleLogin} loading={false} connectError={null} />
      <UsersSection />
      <StepsSection />
      <SecuritySection />
      <BenefitsSection />
      <Footer />
    </main>
  );
}
