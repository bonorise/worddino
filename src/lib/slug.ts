const WORD_REGEX = /^[a-zA-Z][a-zA-Z'-]*$/;

export class InvalidSlugError extends Error {
  constructor(message = "Invalid word slug") {
    super(message);
    this.name = "InvalidSlugError";
  }
}

export function normalizeSlug(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new InvalidSlugError("Empty word");
  }

  if (!WORD_REGEX.test(trimmed)) {
    throw new InvalidSlugError(
      "Only letters, apostrophe and hyphen are supported",
    );
  }

  return trimmed.toLowerCase();
}
