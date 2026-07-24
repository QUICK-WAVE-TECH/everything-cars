/** Capitalize the first alphabetic character without changing the rest. */
export function capitalizeFirstLetter(value: string): string {
  const firstLetterIndex = value.search(/[a-z]/i);
  if (firstLetterIndex === -1) return value;

  return (
    value.slice(0, firstLetterIndex) +
    value[firstLetterIndex]!.toUpperCase() +
    value.slice(firstLetterIndex + 1)
  );
}
