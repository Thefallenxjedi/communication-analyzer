import Link from "next/link";

type SiteFooterProps = {
  className?: string;
};

export function SiteFooter({ className = "" }: SiteFooterProps) {
  return (
    <footer
      className={`border-t border-border py-8 text-center text-xs text-muted ${className}`}
    >
      <p>EliteSpeak · Free communication diagnosis</p>
      <p className="mt-2">
        <Link
          href="/privacy"
          className="font-semibold text-teal-700 hover:text-teal-900 hover:underline"
        >
          Privacy
        </Link>
      </p>
    </footer>
  );
}
