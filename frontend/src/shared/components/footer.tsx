import Link from "next/link";
import { config } from "@/lib/config";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-lg font-semibold">{config.appName}</h3>
            <p className="mt-2 text-sm text-muted-foreground">Your trusted car rental marketplace.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Company</h4>
            <ul className="mt-2 space-y-2">
              <li><Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">About Us</Link></li>
              <li><Link href="/services" className="text-sm text-muted-foreground hover:text-foreground">Services</Link></li>
              <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">For Customers</h4>
            <ul className="mt-2 space-y-2">
              <li><Link href="/listings" className="text-sm text-muted-foreground hover:text-foreground">Browse Cars</Link></li>
              <li><Link href="/sign-up" className="text-sm text-muted-foreground hover:text-foreground">Sign Up</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">For Owners</h4>
            <ul className="mt-2 space-y-2">
              <li><Link href="/sign-up" className="text-sm text-muted-foreground hover:text-foreground">List Your Car</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {config.appName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
