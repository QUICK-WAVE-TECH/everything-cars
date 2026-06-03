import { Card, CardContent } from "@/components/ui/card";
import { AuthShell } from "@/features/auth/components";

export default function VerifyPage() {
  return (
    <AuthShell>
      <Card className="w-full max-w-xl rounded-2xl border-[0.5px] p-6 shadow-xs sm:p-10">
        <CardContent className="space-y-4 p-0">
          <h1 className="text-2xl font-bold sm:text-3xl">Verify Email</h1>
          <p className="text-muted-foreground">Check your email for verification instructions.</p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
