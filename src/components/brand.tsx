import Image from "next/image";

import { APP_SHORT_TITLE } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Logo et nom de l'application. */
export function Brand({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5 overflow-hidden", className)}>
      <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-soft">
        <Image
          src="/kinlouaziss_logo.png"
          alt={`${APP_SHORT_TITLE} — logo`}
          width={32}
          height={32}
          className="size-8 object-cover"
          priority
        />
      </span>
      {!collapsed ? (
        <span className="truncate text-base font-semibold tracking-tight">
          {APP_SHORT_TITLE}
        </span>
      ) : null}
    </div>
  );
}
