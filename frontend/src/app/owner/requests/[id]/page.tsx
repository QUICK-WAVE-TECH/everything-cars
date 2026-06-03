export default function OwnerRequestDetailPage({
  params: _params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Request Details</h1>
      <p className="mt-2 text-muted-foreground">Review rental request details.</p>
    </div>
  );
}
