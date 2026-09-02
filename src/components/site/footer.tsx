import { Link } from "react-router-dom";
import dictionary from "@/Constants/dictionary";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        {/* Brand */}
        <div className="md:col-span-2">
          <p className="font-display text-2xl tracking-[0.16em]">
            {dictionary.siteFullName}
          </p>

          <p className="mt-6 max-w-md text-sm text-muted-foreground">
            Every order is confirmed personally on WhatsApp before payment.
          </p>
        </div>

        {/* Store */}
        <div>
          <p className="eyebrow">Store</p>

          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link
                to="/shop"
                className="transition-colors hover:text-foreground"
              >
                All jewellery
              </Link>
            </li>

            {/* About page is temporarily disabled */}
            {/* 
            <li>
              <Link
                to="/about"
                className="transition-colors hover:text-foreground"
              >
                Our story
              </Link>
            </li>
            */}

            <li>
              <Link
                to="/cart"
                className="transition-colors hover:text-foreground"
              >
                Your bag
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <p className="eyebrow">Contact</p>

          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>
              <a
                href={`mailto:${dictionary.footerDetails.supportEmail}`}
                className="transition-colors hover:text-foreground"
              >
                {dictionary.footerDetails.supportEmail}
              </a>
            </li>

            <li>
              <a
                href={`tel:${dictionary.footerDetails.mobileNumber}`}
                className="transition-colors hover:text-foreground"
              >
                {dictionary.footerDetails.mobileNumber}
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl justify-center px-4 py-6 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {dictionary.siteFullName}. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
