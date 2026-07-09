import type { HTMLAttributes } from "react";
import Image, { type ImageProps } from "next/image";

export const MYBOOKLIST_LOGO_SRC = "/mybooklist-logo.png?v=3";

type MyBookListLogoProps = Omit<ImageProps, "src" | "alt" | "width" | "height"> & {
  size?: number;
  alt?: string;
  /** Solid fill color via CSS mask (e.g. `bg-blue-600`). */
  tintClass?: string;
};

export function MyBookListLogo({
  size = 24,
  className = "",
  alt = "",
  priority = false,
  tintClass,
  ...props
}: MyBookListLogoProps) {
  if (tintClass) {
    return (
      <span
        className={`inline-block shrink-0 ${tintClass} ${className}`}
        style={{
          width: size,
          height: size,
          mask: `url(${MYBOOKLIST_LOGO_SRC}) center / contain no-repeat`,
          WebkitMask: `url(${MYBOOKLIST_LOGO_SRC}) center / contain no-repeat`,
        }}
        aria-hidden={alt ? undefined : true}
        {...(props as HTMLAttributes<HTMLSpanElement>)}
      />
    );
  }

  return (
    <Image
      src={MYBOOKLIST_LOGO_SRC}
      alt={alt}
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      unoptimized
      priority={priority}
      {...props}
    />
  );
}
