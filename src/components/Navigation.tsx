"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, BookOpen, Plus, Search, User } from "lucide-react";

const links = [
  { href: "/", label: "My List", icon: BookOpen },
  { href: "/reading", label: "Reading", icon: BookMarked },
  { href: "/browse", label: "User Search", icon: Search },
  { href: "/add", label: "Add Book", icon: Plus },
  { href: "/profile", label: "Profile", icon: User },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 pb-5 pt-6 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold text-blue-600 transition-colors hover:text-blue-700"
        >
          <BookOpen className="h-7 w-7" />
          <span>MyBookList</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 sm:px-4 ${
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
