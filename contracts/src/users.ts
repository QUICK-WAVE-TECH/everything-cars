import { z } from "zod";

export const userProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  phone: z.string().optional(),
  role: z.enum(["customer", "owner"]),
  avatarUrl: z.string().optional(),
  createdAt: z.string(),
});

export const ownerProfileSchema = userProfileSchema.extend({
  ownerType: z.enum(["individual", "fleet"]),
  fleetName: z.string().optional(),
  totalListings: z.number(),
  totalRentals: z.number(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type OwnerProfile = z.infer<typeof ownerProfileSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
