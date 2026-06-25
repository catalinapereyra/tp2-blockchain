import type { IconName } from "./Icon";

export const USERS = [
  {
    title: "Paciente",
    icon: "user" as IconName,
    color: "turquoise",
    items: ["Guarda estudios", "Consulta su historial", "Solicita recetas", "Controla accesos"],
  },
  {
    title: "Médico",
    icon: "doctor" as IconName,
    color: "blue",
    items: ["Consulta estudios autorizados", "Agrega diagnósticos", "Responde solicitudes de recetas"],
  },
  {
    title: "Laboratorio",
    icon: "lab" as IconName,
    color: "turquoise",
    items: ["Carga resultados de estudios", "Verifica la información", "Asocia al paciente"],
  },
];

export const STEPS = [
  { number: "1.", title: "Paciente", text: "Sube o solicita documentos", icon: "user" as IconName },
  { number: "2.", title: "Laboratorio", text: "Carga resultados verificados", icon: "lab" as IconName },
  { number: "3.", title: "Documento", text: "Se genera el documento médico", icon: "document" as IconName },
  { number: "4.", title: "Blockchain", text: "Se guarda la huella (hash) del documento", icon: "cube" as IconName },
  { number: "5.", title: "Médico autorizado", text: "Consulta y utiliza la información", icon: "doctor" as IconName },
  { number: "6.", title: "Diagnóstico / Receta", text: "El médico emite diagnósticos o recetas", icon: "clipboard" as IconName },
];
