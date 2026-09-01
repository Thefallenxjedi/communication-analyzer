export type StaffRole = "viewer" | "editor" | "admin";

export const STAFF_RANK: Record<StaffRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

export type StaffSession = {
  email: string;
  name?: string;
  staffRole: StaffRole;
};

export function staffMeetsMinimum(role: StaffRole, minimum: StaffRole): boolean {
  return STAFF_RANK[role] >= STAFF_RANK[minimum];
}

export function canEditStaff(role: StaffRole): boolean {
  return staffMeetsMinimum(role, "editor");
}

export function canManageTeam(role: StaffRole): boolean {
  return role === "admin";
}
