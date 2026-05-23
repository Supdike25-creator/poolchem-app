type ChemDeckLogoProps = {
  variant?: "full" | "mark";
  className?: string;
  alt?: string;
};

export default function ChemDeckLogo({
  variant = "full",
  className = "",
  alt = "ChemDeck logo",
}: ChemDeckLogoProps) {
  const src = variant === "full" ? "/chemdeck-logo-full.svg" : "/chemdeck-mark.svg";
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
