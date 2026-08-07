import { AuthGuard } from "@/shared/components";
import { BranchesPage } from "@/features/branches/components";

export default function OwnerBranchesPage() {
  return (
    <AuthGuard requiredRole="owner">
      <BranchesPage />
    </AuthGuard>
  );
}
