"use client";
// Top navigation: brand mark, pill nav, demo label. Only links to routes that exist.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/desk", label: "Dealing desk" },
  { href: "/trades", label: "Trades" },
];

/** The TelDeal mark: two hairlines (matched) and a copper point. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 26 26" fill="none" aria-hidden="true" className={cn("size-6.5", className)}>
      <path d="M3 11h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="21.5" cy="13" r="2.2" fill="var(--copper-lit)" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="bg-night text-[#f5f3ee]">
      <div className="mx-auto grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 sm:px-10 md:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="inline-flex items-center gap-2.5 justify-self-start rounded-md">
          <BrandMark />
          <span className="font-serif text-2xl tracking-[-0.01em]">TelDeal</span>
        </Link>
        <nav aria-label="Primary" className="order-3 col-span-2 md:order-none md:col-span-1">
          <ul className="flex w-fit gap-0.5 rounded-full bg-[#f5f3ee]/95 p-1 shadow-[0_10px_30px_rgb(0_0_0/0.28)]">
            {NAV.map((item) => {
              const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap text-[#46524d] transition-colors duration-200 hover:bg-foreground/5 hover:text-foreground",
                      current && "bg-foreground text-background hover:bg-foreground hover:text-background",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <p className="justify-self-end font-mono text-[10.5px] tracking-[0.08em] text-[#f5f3ee]/65 uppercase">Synthetic demo data</p>
      </div>
    </header>
  );
}
