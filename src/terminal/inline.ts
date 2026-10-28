/** Translate application coordinates to the cursor anchor reserved by an inline session. */
export function inlineOutput(output: string): string {
  let rendition = "";
  return output.replace(
    /\x1b\[(?:(\d+);(\d+)H|[\d;]*m)/g,
    (sequence: string, row: string | undefined, col: string | undefined) => {
      if (row === undefined) {
        // Frame diffs emit complete SGR state, beginning with a reset.
        rendition = sequence;
        return sequence;
      }
      // DECRC restores rendition as well as position, invalidating the diff's active style.
      return (
        "\x1b8" +
        (Number(row) > 1 ? `\x1b[${Number(row) - 1}B` : "") +
        (Number(col) > 1 ? `\x1b[${Number(col) - 1}C` : "") +
        rendition
      );
    },
  );
}
