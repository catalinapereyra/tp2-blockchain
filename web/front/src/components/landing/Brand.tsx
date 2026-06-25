type BrandProps = {
  className?: string;
  href?: string;
  ariaLabel?: string;
};

export function Brand({ className = "brand", href = "#inicio", ariaLabel }: BrandProps) {
  return (
    <a className={className} href={href} {...(ariaLabel ? { "aria-label": ariaLabel } : {})}>
      <span className="brand-mark">
        <span className="brand-cube">M</span>
      </span>
      <span>Medi<span>Chain</span></span>
    </a>
  );
}
