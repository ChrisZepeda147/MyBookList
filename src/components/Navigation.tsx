"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, Plus, User } from "lucide-react";

const links = [
  { href: "/", label: "My List", useLogo: true as const },
  { href: "/reading", label: "Reading", icon: BookMarked },
  { href: "/add", label: "Add Book", icon: Plus },
  { href: "/profile", label: "Profile", icon: User },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="app-navigation sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 pb-7 pt-8 sm:px-6">
        <Link
          href="/"
          className="nav-brand font-display flex items-center gap-3 font-extrabold tracking-tight text-blue-600 transition-colors hover:text-blue-700"
        >
          <Image
            src="/mybooklist-logo.png?v=3"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 object-contain"
            unoptimized
            priority
          />
          <span>MyBookList</span>
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-2">
          {links.map((link) => {
            const active = pathname === link.href;
            const Icon = "icon" in link ? link.icon : null;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link group flex items-center gap-1.5 rounded-lg px-4 py-3 font-medium transition-all duration-200 ${
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                }`}
              >
                {link.useLogo ? (
                  <Image
                    src="/mybooklist-logo.png?v=3"
                    alt=""
                    width={24}
                    height={24}
                    className={`h-6 w-6 shrink-0 object-contain contrast-[1.08] ${
                      active ? "grayscale invert" : "grayscale"
                    }`}
                    unoptimized
                  />
                ) : (
                  Icon && <Icon className="h-6 w-6" />
                )}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
