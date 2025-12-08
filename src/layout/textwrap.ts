import type { TextWrap } from "../style";

function splitWords(line: string): string[] {
  const words: string[] = [];
  let current = "";
  for (const char of line) {
    if (char === " " || char === "\t") {
      if (current) {
        words.push(current);
        current = "";
      }
      words.push(char);
    } else {
      current += char;
    }
  }
  if (current) {
    words.push(current);
  }
  return words;
}

export function wrapText(
  text: string,
  maxWidth: number,
  mode: TextWrap,
  lineClamp?: number | null,
): string[] {
  if (maxWidth <= 0) {
    return [];
  }

  const rawLines = text.split(/\r?\n/);
  if (mode === "none") {
    const result = rawLines.map((line) => line.slice(0, maxWidth));
    return lineClamp && lineClamp > 0 ? result.slice(0, lineClamp) : result;
  }

  const wrapped: string[] = [];
  const maxLines = lineClamp && lineClamp > 0 ? lineClamp : Infinity;

  for (const rawLine of rawLines) {
    if (wrapped.length >= maxLines) break;

    if (rawLine.length <= maxWidth) {
      wrapped.push(rawLine);
      continue;
    }

    if (mode === "char") {
      for (let i = 0; i < rawLine.length; i += maxWidth) {
        if (wrapped.length >= maxLines) break;
        let slice = rawLine.slice(i, i + maxWidth);
        // Trim leading whitespace on wrapped lines (not the first slice of rawLine)
        if (i > 0) {
          slice = slice.replace(/^[\s]+/, "");
          // If slice becomes empty after trimming, skip it
          if (slice.length === 0) continue;
        }
        wrapped.push(slice);
      }
      continue;
    }

    // word wrap
    const words = splitWords(rawLine);
    let current = "";
    let isFirstLineOfRawLine = true;

    for (const word of words) {
      if (wrapped.length >= maxLines) break;

      if (word === " " || word === "\t") {
        if (current.length + word.length > maxWidth) {
          if (current) {
            wrapped.push(current.trimEnd());
            current = "";
            isFirstLineOfRawLine = false;
          }
        }
        // Drop leading whitespace on wrapped lines
        if (!isFirstLineOfRawLine && current === "") {
          continue;
        }
        current += word;
        continue;
      }

      // Non-whitespace word
      if (current.length + word.length > maxWidth) {
        if (current) {
          wrapped.push(current.trimEnd());
          isFirstLineOfRawLine = false;
        }
        current = word;

        // Handle very long words that exceed maxWidth
        if (current.length > maxWidth) {
          for (let i = 0; i < current.length; i += maxWidth) {
            if (wrapped.length >= maxLines) break;
            let slice = current.slice(i, i + maxWidth);

            // Trim leading whitespace on continuation chunks (not first chunk)
            if (i > 0) {
              slice = slice.replace(/^[\s]+/, "");
              if (slice.length === 0) continue;
            }

            if (slice.length === maxWidth || i + maxWidth >= current.length) {
              // Add hyphen for word breaks (except for last chunk)
              const hyphenatedSlice =
                slice.length === maxWidth && i + maxWidth < current.length
                  ? slice.slice(0, -1) + "-"
                  : slice;
              wrapped.push(hyphenatedSlice);
            } else {
              current = slice;
              break;
            }
          }
          current = "";
          isFirstLineOfRawLine = false; // Mark that we're no longer on the first line
        }
      } else {
        current += word;
      }
    }
    if (current && wrapped.length < maxLines) {
      wrapped.push(current.trimEnd());
    }
  }

  return wrapped;
}
