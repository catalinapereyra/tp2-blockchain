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

export default function Icon({ name, size = 18, color = colors.primary, strokeWidth = 2 }: IconProps) {
  const Cmp = REGISTRY[name] ?? FileText;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}
