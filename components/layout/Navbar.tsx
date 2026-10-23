"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Agent Hub", href: "/agents" },
  { label: "Demo", href: "/demo" },
  { label: "Finance", href: "/finance" },
  { label: "Trust", href: "/#trust" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMenuOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled || menuOpen
          ? "bg-navy/97 backdrop-blur-sm border-b border-ivory/5 shadow-lg shadow-navy-deep/50"
          : "bg-transparent"
      )}
    >
      <nav
        className="max-w-6xl mx-auto px-6 h-[4.5rem] flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group"
          aria-label="Veltrio home"
          onClick={() => setMenuOpen(false)}
        >
          <div className="relative w-7 h-7" aria-hidden>
            <svg viewBox="0 0 28 28" fill="none">
              <rect x="2"  y="2"  width="11" height="11" rx="2" fill="#315BFF" opacity="0.9" />
              <rect x="15" y="2"  width="11" height="11" rx="2" fill="#315BFF" opacity="0.4" />
              <rect x="2"  y="15" width="11" height="11" rx="2" fill="#315BFF" opacity="0.4" />
              <rect x="15" y="15" width="11" height="11" rx="2" fill="#315BFF" opacity="0.15" />
            </svg>
          </div>
          <span className="text-ivory font-semibold text-lg tracking-tight group-hover:text-gold transition-colors">
            Veltrio
          </span>
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-8" role="list">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm text-ivory/60 hover:text-ivory transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center">
          <Link href="/demo">
            <Button variant="primary" size="sm">Try the demo</Button>
          </Link>
        </div>

        {/* Mobile — hamburger */}
        <button
          className="md:hidden flex items-center justify-center w-9 h-9 text-ivory/70
                     hover:text-ivory transition-colors rounded-md"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-ivory/5 bg-navy/97 backdrop-blur-sm">
          <ul className="flex flex-col px-6 py-4 gap-1" role="list">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block py-3 text-sm text-ivory/70 hover:text-ivory transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-3 border-t border-ivory/8">
              <Link href="/demo" onClick={() => setMenuOpen(false)}>
                <Button variant="primary" size="md" className="w-full">
                  Try the demo
                </Button>
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
