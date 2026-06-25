export type IconName =
  | "user"
  | "doctor"
  | "lab"
  | "document"
  | "cube"
  | "clipboard"
  | "lock"
  | "shield"
  | "arrow";

type IconProps = {
  name: IconName;
  size?: number;
};

export function Icon({ name, size = 28 }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const paths: Record<IconName, React.ReactNode> = {
    user: <><circle cx="12" cy="7" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    doctor: <><path d="M8 3v4a4 4 0 0 0 8 0V3" /><path d="M6 3h4M14 3h4" /><path d="M12 11v2a6 6 0 0 0 6 6h1" /><circle cx="20" cy="19" r="2" /></>,
    lab: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" /><path d="M7.5 16h9" /></>,
    document: <><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v5h5M9 12h6M9 16h6" /></>,
    cube: <><path d="m12 2 8 4.5v9L12 20l-8-4.5v-9z" /><path d="m4 6.5 8 4.5 8-4.5M12 11v9" /><path d="m8 8.7 8-4.5" /></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V2h6v2M9 12h6M12 9v6" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    shield: <><path d="M12 2 20 6v6c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6z" /><path d="M8 12h8M12 8v8" /></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
  };

  return <svg {...common}>{paths[name]}</svg>;
}
