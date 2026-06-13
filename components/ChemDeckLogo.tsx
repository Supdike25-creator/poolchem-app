type ChemDeckLogoProps = {
  variant?: "full" | "mark";
  scheme?: "auto" | "light" | "dark";
  className?: string;
  alt?: string;
};

export default function ChemDeckLogo({
  variant = "full",
  scheme = "auto",
  className = "",
  alt = "ChemDeck logo",
}: ChemDeckLogoProps) {
  const lightSrc = variant === "full" ? "/chemdeck-logo-full.svg" : "/chemdeck-mark.svg";
  const darkSrc = variant === "full" ? "/chemdeck-logo-full-dark.svg" : "/chemdeck-mark-dark.svg";
  const baseSize = variant === "full" ? "h-auto w-44 max-w-full" : "h-10 w-10";
  const imageClass = `${baseSize} shrink-0 object-contain ${className}`;

  if (scheme !== "auto") {
    return (
      <img
        src={scheme === "dark" ? darkSrc : lightSrc}
        alt={alt}
        className={imageClass}
        draggable={false}
      />
    );
  }

  return (
    <span className={`chemdeck-logo-auto inline-flex shrink-0 ${className}`}>
      <img
        src={lightSrc}
        alt={alt}
        className={`${baseSize} chemdeck-logo-light shrink-0 object-contain`}
        draggable={false}
      />
      <img
        src={darkSrc}
        alt=""
        aria-hidden="true"
        className={`${baseSize} chemdeck-logo-dark shrink-0 object-contain`}
        draggable={false}
      />
    </span>
  );
}
