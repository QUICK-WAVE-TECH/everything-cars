import { redirect } from "next/navigation";

// Center management now lives on the combined scheduling hub under the
// "Centers" tab. Keep this route as a redirect for old bookmarks/links.
export default function AdminInspectionCentersRedirect() {
  redirect("/admin/inspections");
}
