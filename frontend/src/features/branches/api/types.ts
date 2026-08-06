/** A dealer branch — a physical location belonging to a verified fleet business.
 * Mirrors the backend `BranchSerializer`. `business_name` is read-only (inherited
 * from the owner's business and never editable per-branch). */
export type Branch = {
  id: string;
  name: string;
  business_name: string;
  state: string;
  city: string;
  street_address: string;
  phone: string;
  email: string;
  is_active: boolean;
  created_at: string;
};

/** Writable branch fields (create + edit). `business_name` is intentionally absent. */
export type BranchInput = {
  name: string;
  state: string;
  city: string;
  street_address: string;
  phone: string;
  email: string;
};
