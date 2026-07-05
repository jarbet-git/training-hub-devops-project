import fastApiIcon from "@/assets/tech/fastapi.svg";
import framerMotionIcon from "@/assets/tech/framer-motion.svg";
import lucideReactIcon from "@/assets/tech/lucide-react.svg";
import postgresqlIcon from "@/assets/tech/postgresql.svg";
import reactHookFormIcon from "@/assets/tech/react-hook-form.svg";
import reactIcon from "@/assets/tech/react.svg";
import reactQueryIcon from "@/assets/tech/react-query.svg";
import shadcnUiIcon from "@/assets/tech/shadcn-ui.svg";
import sqlAlchemyIcon from "@/assets/tech/sqlalchemy.svg";
import tailwindCssIcon from "@/assets/tech/tailwind-css.svg";
import typeScriptIcon from "@/assets/tech/typescript.svg";

import { cn } from "@/lib/utils";

type TechStackIconProps = {
  label: string;
  short?: string;
  className?: string;
};

type TechIconConfig = {
  src: string;
  wrapperClassName: string;
  imageClassName?: string;
};

const TECH_ICONS: Record<string, TechIconConfig> = {
  React: {
    src: reactIcon,
    wrapperClassName: "border-[#61dafb]/30 bg-[#06131a]",
  },
  TypeScript: {
    src: typeScriptIcon,
    wrapperClassName: "border-[#3178c6]/35 bg-[#3178c6]/10",
  },
  "Tailwind CSS": {
    src: tailwindCssIcon,
    wrapperClassName: "border-[#38bdf8]/30 bg-[#06131f]",
  },
  "shadcn/ui": {
    src: shadcnUiIcon,
    wrapperClassName: "border-white/70 bg-white",
    imageClassName: "h-[62%] w-[62%]",
  },
  "Framer Motion": {
    src: framerMotionIcon,
    wrapperClassName: "border-[#8b5cf6]/25 bg-[#0b0b10]",
  },
  "Lucide React": {
    src: lucideReactIcon,
    wrapperClassName: "border-white/12 bg-[#0c1020]",
    imageClassName: "h-[46%] w-[84%]",
  },
  FastAPI: {
    src: fastApiIcon,
    wrapperClassName: "border-[#05998b]/30 bg-[#052321]",
  },
  PostgreSQL: {
    src: postgresqlIcon,
    wrapperClassName: "border-[#336791]/28 bg-white",
    imageClassName: "h-[76%] w-[76%]",
  },
  SQLAlchemy: {
    src: sqlAlchemyIcon,
    wrapperClassName: "border-[#d71f00]/28 bg-white",
    imageClassName: "h-[54%] w-[84%]",
  },
  "React Query": {
    src: reactQueryIcon,
    wrapperClassName: "border-[#ff4154]/28 bg-white",
  },
  "TanStack Query": {
    src: reactQueryIcon,
    wrapperClassName: "border-[#ff4154]/28 bg-white",
  },
  "React Hook Form": {
    src: reactHookFormIcon,
    wrapperClassName: "border-[#ec4899]/28 bg-[#240914]",
  },
};

const FALLBACK_STYLES: Record<string, string> = {
  Alembic: "border-[#7c3aed]/28 bg-[#110b1f] text-[#c4b5fd]",
};

const FALLBACK_SHORTS: Record<string, string> = {
  Alembic: "AL",
};

function FallbackLogo({ label, short }: { label: string; short?: string }) {
  return <span className="text-[0.62rem] font-bold leading-none tracking-tight">{short ?? FALLBACK_SHORTS[label] ?? "•"}</span>;
}

export function TechStackIcon({ label, short, className }: TechStackIconProps) {
  const icon = TECH_ICONS[label];

  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-[0_14px_34px_-22px_rgba(0,0,0,0.65)] backdrop-blur-sm",
        icon?.wrapperClassName ?? FALLBACK_STYLES[label] ?? "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))] text-white",
        className,
      )}
      aria-hidden="true"
      title={label}
    >
      {icon ? (
        <img
          src={icon.src}
          alt=""
          className={cn("h-[70%] w-[70%] object-contain", icon.imageClassName)}
          draggable={false}
        />
      ) : (
        <FallbackLogo label={label} short={short} />
      )}
    </div>
  );
}
