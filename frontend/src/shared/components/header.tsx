import Link from "next/link";
import { config } from "@/lib/config";

type HeaderProps = {
  variant?: "public" | "customer" | "owner";
};

export function Header({ variant = "public" }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          {config.appName}
        </Link>
        <nav className="flex items-center gap-6">
          {variant === "public" && (
            <>
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About Us</Link>
              <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Services</Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
              <Link href="/sign-in" className="text-sm font-medium">Sign In</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
