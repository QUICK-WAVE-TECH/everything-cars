export default function CarDetailPage({
  params: _params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Car Details</h1>
      <p className="mt-2 text-muted-foreground">Edit and manage your car listing.</p>
    </div>
  );
}
