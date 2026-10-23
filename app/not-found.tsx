import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 w-12 h-12 rounded-full border border-gold/30 bg-gold/8 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-gold" strokeWidth={1.5} />
      </div>
      <h1 className="text-5xl font-bold text-ivory mb-3">404</h1>
      <p className="text-ivory/50 text-base mb-8 max-w-sm">
        This page doesn&apos;t exist. The gateway has nothing to authorize here.
      </p>
      <div className="flex gap-3">
        <Link href="/">
          <Button variant="primary" size="md">Back to home</Button>
        </Link>
        <Link href="/demo">
          <Button variant="secondary" size="md">Try the demo</Button>
        </Link>
      </div>
    </div>
  );
}
