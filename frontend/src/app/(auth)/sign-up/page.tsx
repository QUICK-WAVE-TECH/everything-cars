import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Create Account</h1>
      <p className="text-muted-foreground">Sign up to start renting or listing cars.</p>
      <div className="mt-4 text-sm">
        <p>
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
