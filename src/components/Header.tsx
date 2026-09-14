"use client";

import { User, Menu as MenuIcon, X } from "lucide-react";
import { IoSettingsOutline } from "react-icons/io5";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const linkClasses = (href: string) =>
    pathname === href
      ? "text-primary font-semibold transition-colors border-b-2 border-primary"
      : "text-foreground hover:text-primary transition-colors";

  return (
    <>
      <header className="backdrop-blur-md bg-background/90 border-b border-border shadow-xl sticky top-0 z-50 text-foreground">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/home" className="flex items-center space-x-2 sm:space-x-3">
            <Image
              className="h-10 sm:h-12 rounded-md"
              src="/Logo.png"
              alt="Babuji Chaay"
              width={48}
              height={48}
            />
            <span className="text-lg sm:text-xl font-semibold tracking-wide text-primary">
              Brewing Happiness
            </span>
          </Link>

          <nav className="hidden md:flex space-x-6 lg:space-x-8">
            <Link href="/home" className={linkClasses("/home")}>
              Dashboard
            </Link>
            <Link href="/inventory" className={linkClasses("/inventory")}>
              Inventory
            </Link>
            <Link href="/menu" className={linkClasses("/menu")}>
              Menu
            </Link>
            <Link href="/create" className={linkClasses("/create")}>
              Create
            </Link>
          </nav>

          <div className="flex items-center space-x-3 sm:space-x-4">
            <IoSettingsOutline
              className="w-5 h-5 text-foreground hover:text-primary cursor-pointer transition-colors"
              onClick={() => router.push("/settings")}
            />
            <Link
              href="/profile"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center hover:ring-2 hover:ring-primary transition"
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </Link>

            <button
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? (
                <X className="w-6 h-6 text-foreground" />
              ) : (
                <MenuIcon className="w-6 h-6 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="md:hidden bg-background/90 backdrop-blur-sm border-t border-border shadow-xl px-6 py-4 flex flex-col space-y-3">
            <Link
              href="/home"
              className={linkClasses("/home")}
              onClick={() => setMobileOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/inventory"
              className={linkClasses("/inventory")}
              onClick={() => setMobileOpen(false)}
            >
              Inventory
            </Link>
            <Link
              href="/menu"
              className={linkClasses("/menu")}
              onClick={() => setMobileOpen(false)}
            >
              Menu
            </Link>
            <Link
              href="/create"
              className={linkClasses("/create")}
              onClick={() => setMobileOpen(false)}
            >
              Create
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}
