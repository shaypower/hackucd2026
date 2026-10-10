// ISIN validation (ISO 6166): 2-letter country code, 9 alphanumerics, 1 check digit.

const ISIN_FORMAT = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/** Uppercase and drop spaces, hyphens and dots, so "ie00 b4l5-y983" becomes "IE00B4L5Y983". */
export function normalizeIsin(raw: string): string {
  return raw.toUpperCase().replace(/[\s.-]/g, "");
}

export function isValidIsinFormat(isin: string): boolean {
  return ISIN_FORMAT.test(isin);
}

/** Check digit for the first 11 characters: letters become numbers (A=10..Z=35), then Luhn. */
export function isinCheckDigit(first11: string): number {
  const digits = [...first11].map((c) => parseInt(c, 36).toString()).join("");
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let n = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 0) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return (10 - (sum % 10)) % 10;
}

export function hasValidCheckDigit(isin: string): boolean {
  return isValidIsinFormat(isin) && isinCheckDigit(isin.slice(0, 11)) === Number(isin[11]);
}

export function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = curr;
  }
  return prev[b.length];
}

/** Closest known ISIN within `maxDistance` edits (a misheard or mistyped character or two). */
export function closestIsin(isin: string, known: string[], maxDistance = 2): string | null {
  let best: string | null = null;
  let bestDistance = maxDistance + 1;
  for (const candidate of known) {
    const d = levenshtein(isin, candidate);
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best;
}
