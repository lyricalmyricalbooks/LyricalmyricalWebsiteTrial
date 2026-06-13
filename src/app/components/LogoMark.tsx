// ──────────────────────────────
// Brand logo (image, tinted image, or wordmark text)
//
// Reads logo styling from the theme design object:
//   - logoUrl    : uploaded logo image
//   - logoTint   : recolor the image with logoColor (best for single-color logos)
//   - logoColor  : color applied to the wordmark text, or the tinted image
//   - logoText   : wordmark text shown when no image is uploaded
//   - logoHeight : rendered height in px (clamped 20–64)
// ──────────────────────────────
export function LogoMark({ design, defaultText = "F✶M" }: { design?: any; defaultText?: string }) {
  const height = Math.max(20, Math.min(64, design?.logoHeight ?? 24));
  const logoColor = design?.logoColor;
  const text = design?.logoText ?? defaultText;

  if (design?.logoUrl) {
    // Recolor (tint) a single-color / transparent logo with the theme's logo color.
    if (design?.logoTint) {
      const maskUrl = `url("${design.logoUrl}")`;
      return (
        <span
          aria-label="Logo"
          style={{
            display: "inline-block",
            height,
            backgroundColor: logoColor || "currentColor",
            WebkitMaskImage: maskUrl,
            maskImage: maskUrl,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskPosition: "left center",
            maskPosition: "left center",
          }}
        >
          {/* Invisible image sizes the span to the logo's natural aspect ratio */}
          <img src={design.logoUrl} alt="" aria-hidden className="object-contain" style={{ height, opacity: 0 }} />
        </span>
      );
    }
    return <img src={design.logoUrl} alt="Logo" className="object-contain" style={{ height }} />;
  }

  return logoColor ? <span style={{ color: logoColor }}>{text}</span> : <>{text}</>;
}

export default LogoMark;
