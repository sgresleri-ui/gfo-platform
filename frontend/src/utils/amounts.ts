function removeAll(
  value: string,
  separator: string,
): string {
  return value.split(separator).join("");
}

export function parseFlexibleDecimal(
  value: string,
): number | null {
  const compact = value
    .trim()
    .replace(/[\s\u00a0€%]/g, "");

  if (
    compact.length === 0 ||
    !/^[+-]?\d+(?:[.,]\d+)?$/.test(
      compact,
    )
  ) {
    return null;
  }

  const normalized = compact.replace(
    ",",
    ".",
  );
  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

export function parseLocaleAmount(
  value: string,
): number {
  return parseLocaleAmountOrNull(value) ?? 0;
}

export function parseLocaleAmountOrNull(
  value: string,
): number | null {
  const compact = value
    .trim()
    .replace(/[\s\u00a0€]/g, "");

  if (
    compact.length === 0 ||
    !/^\d+(?:[.,]\d+)*$/.test(compact)
  ) {
    return null;
  }

  const lastComma =
    compact.lastIndexOf(",");
  const lastDot =
    compact.lastIndexOf(".");

  let normalized = compact;

  if (
    lastComma >= 0 &&
    lastDot >= 0
  ) {
    const decimalSeparator =
      lastComma > lastDot ? "," : ".";
    const groupingSeparator =
      decimalSeparator === "," ? "." : ",";

    normalized = removeAll(
      compact,
      groupingSeparator,
    ).replace(decimalSeparator, ".");
  } else if (
    lastComma >= 0 ||
    lastDot >= 0
  ) {
    const separator =
      lastComma >= 0 ? "," : ".";
    const parts = compact.split(separator);
    const lastPart =
      parts[parts.length - 1];

    if (
      parts.length === 2 &&
      lastPart.length <= 2
    ) {
      normalized = compact.replace(
        separator,
        ".",
      );
    } else if (
      parts
        .slice(1)
        .every(
          (part) => part.length === 3,
        )
    ) {
      normalized = removeAll(
        compact,
        separator,
      );
    } else {
      return null;
    }
  }

  const amount = Number(normalized);

  return Number.isFinite(amount) &&
    amount >= 0
    ? amount
    : null;
}
