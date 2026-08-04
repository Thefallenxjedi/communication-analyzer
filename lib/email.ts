const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Common disposable / throwaway domains */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "sharklasers.com",
  "grr.la",
  "guerrillamailblock.com",
  "pokemail.net",
  "spam4.me",
  "yopmail.com",
  "yopmail.fr",
  "cool.fr.nf",
  "jetable.org",
  "nospam.ze.tc",
  "nomail.xl.cx",
  "mega.zik.dj",
  "speed.1s.fr",
  "courriel.fr.nf",
  "moncourrier.fr.nf",
  "monemail.fr.nf",
  "monmail.fr.nf",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "tmpmail.org",
  "tmpmail.net",
  "10minutemail.com",
  "10minutemail.net",
  "10minemail.com",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.me",
  "trashmail.net",
  "trash-mail.com",
  "discard.email",
  "discardmail.com",
  "mailnesia.com",
  "maildrop.cc",
  "getnada.com",
  "nada.email",
  "emailondeck.com",
  "fakeinbox.com",
  "mailcatch.com",
  "mailnull.com",
  "spamgourmet.com",
  "mintemail.com",
  "mytemp.email",
  "tempail.com",
  "tempr.email",
  "dispostable.com",
  "mailforspam.com",
  "spamobox.com",
  "moakt.com",
  "emailfake.com",
  "crazymailing.com",
  "inboxkitten.com",
  "tempinbox.com",
  "mailtemp.net",
  "throwam.com",
  "getairmail.com",
  "fakemailgenerator.com",
  "mohmal.com",
  "burnermail.io",
  "mail.tm",
  "mailgx.com",
  "1secmail.com",
  "1secmail.org",
  "1secmail.net",
  "wwjmp.com",
  "esiix.com",
  "oosln.com",
  "vjuum.com",
]);

const GARBAGE_LOCAL = /^(test|testing|asdf|qwert|qwerty|abc|abcd|aaaa|xxx|xyz|fake|noreply|no-reply|donotreply|spam|garbage|asdfgh|admin|user|sample|example|null|undefined|temp|tmp)[\d._-]*$/i;

export type EmailValidation =
  | { ok: true; email: string }
  | { ok: false; error: string };

export function validateEmail(raw: string): EmailValidation {
  const email = raw.trim().toLowerCase();
  if (!email) {
    return { ok: false, error: "Enter your email address to continue." };
  }
  if (!EMAIL_RE.test(email) || email.includes("..")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const [local, domain] = email.split("@");
  if (!local || !domain || local.length < 2) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (GARBAGE_LOCAL.test(local)) {
    return {
      ok: false,
      error: "Please use your real email — not a test or fake address.",
    };
  }

  if (
    domain === "example.com" ||
    domain === "example.org" ||
    domain === "example.net" ||
    domain === "test.com" ||
    domain === "email.com" ||
    domain.endsWith(".test") ||
    domain.endsWith(".invalid") ||
    domain.endsWith(".localhost")
  ) {
    return {
      ok: false,
      error: "Please use your real email address.",
    };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      ok: false,
      error: "Disposable emails aren’t allowed. Use your real email.",
    };
  }

  return { ok: true, email };
}

export function isValidLeadEmail(raw: string): boolean {
  return validateEmail(raw).ok;
}
