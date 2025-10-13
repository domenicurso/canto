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
): string[] {
  if (maxWidth <= 0) {
    return [];
  }

  const rawLines = text.split(/\r?\n/);
  if (mode === "none") {
    return rawLines.map((line) => line.slice(0, maxWidth));
  }

  const wrapped: string[] = [];

  for (const rawLine of rawLines) {
    if (rawLine.length <= maxWidth) {
      wrapped.push(rawLine);
      continue;
    }

    if (mode === "char") {
      for (let i = 0; i < rawLine.length; i += maxWidth) {
        wrapped.push(rawLine.slice(i, i + maxWidth));
      }
      continue;
    }

    // word wrap
    const words = splitWords(rawLine);
    let current = "";
    for (const word of words) {
      if (word === " " || word === "\t") {
        if (current.length + word.length > maxWidth) {
          if (current) {
            wrapped.push(current);
            current = "";
          }
        }
        current += word;
        continue;
      }
      if (current.length + word.length > maxWidth) {
        if (current) {
          wrapped.push(current.trimEnd());
        }
        current = word;
        if (current.length > maxWidth) {
          // Fallback to character wrap for long words
          for (let i = 0; i < current.length; i += maxWidth) {
            const slice = current.slice(i, i + maxWidth);
            if (slice.length === maxWidth) {
              wrapped.push(slice);
            } else {
              current = slice;
            }
          }
        }
      } else {
        current += word;
      }
    }
    if (current) {
      wrapped.push(current.trimEnd());
    }
  }

  return wrapped;
}
