import Image from 'next/image';

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
  const width = variant === "full" ? 176 : 40;
  const height = variant === "full" ? 40 : 40;

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`${variant === "full" ? "h-auto w-44 max-w-full" : "h-10 w-10"} shrink-0 object-contain ${className}`}
      style={{ width: variant === "full" ? "auto" : undefined, height: "auto" }}
      draggable={false}
      priority={variant === "full"}
    />
  );
}
