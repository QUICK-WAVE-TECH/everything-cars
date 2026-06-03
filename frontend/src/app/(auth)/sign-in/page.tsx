import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Sign In</h1>
      <p className="text-muted-foreground">Sign in to your EverythingCars account.</p>
      <div className="mt-4 text-sm">
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
