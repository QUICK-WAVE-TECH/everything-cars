import Link from "next/link";

export default function GetStartedPage() {
  return (
    <div className="space-y-6 text-center">
      <h1 className="text-3xl font-bold">Get Started</h1>
      <p className="text-muted-foreground">Join EverythingCars today.</p>
      <div className="flex flex-col gap-3">
        <Link
          href="/sign-up"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          Create Account
        </Link>
        <Link href="/sign-in" className="rounded-md border px-4 py-2">
          Sign In
        </Link>
      </div>
    </div>
  );
}
