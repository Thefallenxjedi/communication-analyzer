export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || "";
}

export function isAdminConfigured(): boolean {
  return Boolean(getAdminPassword());
}

/** Accept Bearer token or x-admin-password header. */
export function checkAdminAuth(request: Request): boolean {
  const expected = getAdminPassword();
  if (!expected) return false;

  const header = request.headers.get("x-admin-password")?.trim();
  if (header && header === expected) return true;

  const auth = request.headers.get("authorization")?.trim() || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token === expected) return true;
  }

  return false;
}
