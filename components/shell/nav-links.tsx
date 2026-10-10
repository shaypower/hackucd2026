"use client";
// The pill nav. `ActiveNav` reads the pathname, so render it inside <Suspense> (Cache Components);
// `NavLinks` with no `current` is its prerender fallback.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/desk", label: "Dealing desk" },
  { href: "/trades", label: "Trades" },
  { href: "/billing", label: "Billing" },
];

export function NavLinks({ current }: { current?: string | null }) {
  return (
    <ul className="flex w-fit gap-0.5 rounded-full bg-[#f5f3ee]/95 p-1 shadow-[0_10px_30px_rgb(0_0_0/0.28)]">
      {NAV.map((item) => {
        const active = !!current && (current === item.href || current.startsWith(`${item.href}/`));
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap text-[#46524d] transition-colors duration-200 hover:bg-foreground/5 hover:text-foreground",
                active && "bg-foreground text-background hover:bg-foreground hover:text-background",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ActiveNav() {
  return <NavLinks current={usePathname()} />;
}
