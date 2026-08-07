import { AuthGuard } from "@/shared/components";
import { TeamPage } from "@/features/team/components";

export default function OwnerTeamPage() {
  return (
    <AuthGuard requiredRole="owner">
      <TeamPage />
    </AuthGuard>
  );
}
