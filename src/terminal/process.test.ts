import { Terminal as Emulator } from "@xterm/headless";
import { expect, test } from "bun:test";

const available = process.platform !== "win32" && Bun.which("python3") !== null;
interface Phase {
  width: number;
  height: number;
  output: string;
}
function phases(value: unknown): Phase[] {
  if (!Array.isArray(value))
    throw new Error("PTY fixture did not return phases.");
  return value.map((entry: unknown) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      !("width" in entry) ||
      !("height" in entry) ||
      !("output" in entry) ||
      typeof entry.width !== "number" ||
      typeof entry.height !== "number" ||
      typeof entry.output !== "string"
    )
      throw new Error("Invalid PTY phase.");
    return { width: entry.width, height: entry.height, output: entry.output };
  });
}
async function write(emulator: Emulator, output: string): Promise<void> {
  await new Promise<void>((resolve) => emulator.write(output, resolve));
}
function visible(emulator: Emulator): string {
  const buffer = emulator.buffer.active;
  return Array.from(
    { length: emulator.rows },
    (_, y) => buffer.getLine(buffer.baseY + y)?.translateToString(true) ?? "",
  ).join("\n");
}
function verifyTheme(emulator: Emulator, bytes: string): void {
  expect(visible(emulator)).toContain("offset=0,0");
  expect(bytes).toContain("\x1b]10;?\x1b\\");
  expect(bytes).toContain("\x1b]11;?\x1b\\");
  expect(bytes).toContain("\x1b]4;15;?\x1b\\");
  const cell = emulator.buffer.active
    .getLine(emulator.buffer.active.baseY + 9)
    ?.getCell(0);
  expect(cell?.getFgColor()).toBe(0x828282);
  expect(cell?.getBgColor()).toBe(0x14283c);
}
test.skipIf(!available).each([
  ["fullscreen", 8, 16],
  ["inline", 9, 21],
] as const)(
  "process terminal %s handles native input, clipboard, and resize at %sx%s pixels",
  async (mode, width, height) => {
    const child = Bun.spawn(
      [
        "python3",
        "src/terminal/fixtures/pty_session.py",
        process.execPath,
        mode,
        String(width),
        String(height),
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    const [output, error, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect({ code, error }).toEqual({ code: 0, error: "" });
    const reports = phases(JSON.parse(output));
    const emulator = new Emulator({
      cols: 80,
      rows: 24,
      allowProposedApi: true,
    });
    try {
      for (const [index, phase] of reports.entries()) {
        emulator.resize(phase.width, phase.height);
        const bytes = Buffer.from(phase.output, "base64").toString("utf8");
        await write(emulator, bytes);
        if (index < 8) expect(bytes).toContain("\x1b[?2026h");
        expect(bytes).toContain("\x1b[?2026l");
        if (index === 0) verifyTheme(emulator, bytes);
        if (index === 1) expect(visible(emulator)).toContain("offset=3,3");
        if (index === 2) expect(visible(emulator)).toContain("offset=3,35");
        if (index === 3)
          expect(bytes).toContain(
            `\x1b]52;c;${Buffer.from("Select").toString("base64")}\x1b\\`,
          );
        if (index === 5) expect(visible(emulator)).toContain("offset=3,35");
        if (index === 6) expect(bytes).toContain("\x1b[?1003l");
        if (index === 7) expect(bytes).toContain("\x1b[?1003h");
        if (index === 8) {
          expect(bytes).toContain("\x1b[?25h");
          expect(bytes).toContain("\x1b[?2004l");
        }
      }
    } finally {
      emulator.dispose();
    }
  },
  10000,
);
