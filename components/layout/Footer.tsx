import Link from "next/link";

const footerLinks = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Product search", href: "/shop" },
  { label: "Agent Hub", href: "/agents" },
  { label: "Spending mandates", href: "/mandates" },
  { label: "Finance workspace", href: "/finance" },
  { label: "Agent Hub", href: "/agents" },
  { label: "Product search", href: "/shop" },
  { label: "Spending mandates", href: "/mandates" },
  { label: "Finance workspace", href: "/finance" },
  { label: "Authorization demo", href: "/demo" },
  { label: "Trust & Security", href: "#trust" },
];

export function Footer() {
  return (
    <footer className="border-t border-ivory/10 bg-navy-deep">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="text-ivory font-semibold tracking-tight">Veltrio</span>
            <p className="text-xs text-ivory/40">AI commerce, with explicit policy checks.</p>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap justify-center gap-6" role="list">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-ivory/40 hover:text-ivory/80 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Legal */}
          <p className="text-xs text-ivory/25">
            Hackathon demo · Not a real financial product
          </p>
        </div>
      </div>
    </footer>
  );
}
