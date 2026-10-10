import Link from "next/link";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b">
        <nav className="mx-auto flex w-full max-w-6xl items-center gap-6 px-4 py-3 text-sm sm:px-6">
          <Link href="/" className="font-semibold tracking-tight">
            TelDeal
          </Link>
          <Link href="/desk" className="text-muted-foreground hover:text-foreground">
            Dealing desk
          </Link>
          <Link href="/trades" className="text-muted-foreground hover:text-foreground">
            Trades
          </Link>
        </nav>
      </header>
      {children}
    </>
  );
}
