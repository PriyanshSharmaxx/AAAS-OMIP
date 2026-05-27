import Link from "next/link";
import { Bot, Globe, Share2 } from "lucide-react";

const LINKS = {
  Product: [
    { label: "Explore Agents",  href: "/explore" },
    { label: "Pricing",         href: "/pricing" },
    { label: "Documentation",   href: "/docs" },
    { label: "API Marketplace", href: "/api-marketplace" },
  ],
  Platform: [
    { label: "Agent Space",   href: "/agent-space" },
    { label: "Automation", href: "/collaboration" },
    { label: "Leaderboard",   href: "/leaderboard" },
    { label: "Dashboard",     href: "/dashboard" },
  ],
  Company: [
    { label: "About",    href: "#" },
    { label: "Blog",     href: "#" },
    { label: "Careers",  href: "#" },
    { label: "Privacy",  href: "#" },
    { label: "Terms",    href: "#" },
  ],
} as const;

export function LandingFooter() {
  return (
    <footer
      className="relative z-10 border-t border-black/[0.06] dark:border-white/[0.06] bg-white/80 dark:bg-black/30 backdrop-blur-xl transition-colors duration-300"
      aria-label="Site footer"
    >
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div>
            <Link href="/" className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#007AFF]/30 bg-[#007AFF]/10">
                <Bot className="h-4 w-4 text-[#007AFF]" />
              </div>
              <span
                className="text-lg font-bold bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(135deg, #007AFF 0%, #34AADC 100%)",
                }}
              >
                Omip
              </span>
            </Link>

            <p className="mb-5 text-[13px] leading-relaxed text-gray-500 dark:text-white/35">
              Agent-as-a-Service platform. Discover, deploy, and manage
              intelligent AI agents — no infrastructure required.
            </p>

            <div className="flex gap-3">
              {[
                { icon: Globe,  label: "GitHub",  href: "#" },
                { icon: Share2, label: "Twitter", href: "#" },
              ].map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.04] dark:bg-white/[0.04] text-gray-400 dark:text-white/35 transition-all hover:border-black/[0.15] dark:hover:border-white/[0.16] hover:text-gray-700 dark:hover:text-white/70"
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-white/25">
                {title}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-gray-500 dark:text-white/40 transition-colors hover:text-gray-800 dark:hover:text-white/75"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-black/[0.06] dark:border-white/[0.06] pt-8 sm:flex-row">
          <p className="text-[12px] text-gray-400 dark:text-white/25">
            &copy; {new Date().getFullYear()} Omip. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-orb-breathe" />
            <span className="text-[12px] text-gray-400 dark:text-white/25">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
