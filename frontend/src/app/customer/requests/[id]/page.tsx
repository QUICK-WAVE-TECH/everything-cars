export default function RequestDetailPage({
  params: _params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Request Details</h1>
      <p className="mt-2 text-muted-foreground">View your rental request details.</p>
    </div>
  );
}
