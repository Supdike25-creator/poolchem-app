type ChemDeckLogoProps = {
  variant?: "full" | "mark";
  scheme?: "light" | "dark";
  className?: string;
  alt?: string;
};

export default function ChemDeckLogo({
  variant = "full",
  scheme = "light",
  className = "",
  alt = "ChemDeck logo",
}: ChemDeckLogoProps) {
  const src = variant === "full"
    ? scheme === "dark" ? "/chemdeck-logo-full-dark.svg" : "/chemdeck-logo-full.svg"
    : scheme === "dark" ? "/chemdeck-mark-dark.svg" : "/chemdeck-mark.svg";
  const baseSize = variant === "full" ? "h-auto w-44 max-w-full" : "h-10 w-10";

  return (
    <img
      src={src}
      alt={alt}
      className={`${baseSize} shrink-0 object-contain ${className}`}
      draggable={false}
    />
  );
}
