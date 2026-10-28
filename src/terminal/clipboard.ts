/** Reads are optional: terminal paste normally arrives as bracketed keyboard input. */
export interface Clipboard {
  writeText(text: string): Promise<void>;
  readText?(): Promise<string>;
}
export function clipboardOutput(text: string): string {
  return `\x1b]52;c;${Buffer.from(text, "utf8").toString("base64")}\x1b\\`;
}
export const unavailableClipboard: Clipboard = {
  writeText: async () => {
    throw new Error("This terminal has no clipboard adapter.");
  },
};
