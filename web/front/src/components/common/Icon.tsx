import {
  FlaskConical,
  ScanLine,
  Microscope,
  HeartPulse,
  Dna,
  Stethoscope,
  Eye,
  Smile,
  Hand,
  Syringe,
  Pill,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { colors } from "../../styles";

// Registro de íconos (lucide-react). Para agregar uno nuevo: importalo arriba
// y sumalo acá con su nombre.
const REGISTRY: Record<string, LucideIcon> = {
  analisis: FlaskConical,
  imagen: ScanLine,
  patologia: Microscope,
  cardiologia: HeartPulse,
  genetica: Dna,
  endoscopia: Stethoscope,
  oftalmologia: Eye,
  odontologia: Smile,
  dermatologia: Hand,
  vacuna: Syringe,
  receta: Pill,
  otro: FileText,
  // roles / entidades
  doctor: Stethoscope,
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Ícono reutilizable basado en lucide-react.
 * Ej: <Icon name="analisis" /> · si el nombre no existe, usa un ícono genérico.
 */
export default function Icon({ name, size = 18, color = colors.primary, strokeWidth = 2 }: IconProps) {
  const Cmp = REGISTRY[name] ?? FileText;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}
