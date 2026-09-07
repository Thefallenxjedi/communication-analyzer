export const SAMPLE_CLIENT_EMAIL = "sample@gmail.com";

export function isSampleClientEmail(email: string | undefined | null): boolean {
  return email?.trim().toLowerCase() === SAMPLE_CLIENT_EMAIL;
}
