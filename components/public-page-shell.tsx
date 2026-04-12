import Image from "next/image";

export function PublicPageShell({
  children,
  logoWidth = 220
}: {
  children: React.ReactNode;
  logoWidth?: number;
}) {
  return (
    <div className="page-shell">
      <div className="public-logo-wrap">
        <Image
          src="/ane-logo.png"
          alt="Art Niche Expo"
          width={logoWidth}
          height={Math.round(logoWidth * 0.84)}
          className="public-logo"
          priority
        />
      </div>
      {children}
    </div>
  );
}
