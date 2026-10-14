import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function MarketplaceHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="nav">
      <div className="wrap navin">
        <Link className="brand marketplace-brand" href="/" aria-label="O2N E-Mall home">
          <Image
            className="marketplace-logo"
            src="/o2n-logo.svg"
            alt="O2N E-Mall logo"
            width={48}
            height={48}
            priority
          />
          <span>
            O2N <span className="marketplace-brand-accent">E-Mall</span>
            <small>SHOP LOCAL. DISCOVER MORE.</small>
          </span>
        </Link>
        {children}
      </div>
    </header>
  );
}
