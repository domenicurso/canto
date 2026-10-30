import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const tmux = Bun.which("tmux");

/** Each case owns its server and socket so it cannot touch an existing tmux session. */
class TmuxSession {
  constructor(private readonly socket: string) {}
  async command(...args: string[]): Promise<string> {
    const child = Bun.spawn(
      [tmux ?? "tmux", "-u", "-S", this.socket, "-f", "/dev/null", ...args],
      {
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [output, error, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    if (code !== 0)
      throw new Error(`tmux ${args[0]} failed (${code}): ${error}`);
    return output;
  }
  async waitFor(
    text: string,
    command = ["capture-pane", "-p", "-t", "canto"],
  ): Promise<string> {
    const deadline = performance.now() + 5000;
    let output = "";
    while (performance.now() < deadline) {
      output = await this.command(...command);
      if (output.includes(text)) return output;
      await Bun.sleep(20);
    }
    throw new Error(`tmux did not display ${JSON.stringify(text)}: ${output}`);
  }
  async stop(): Promise<void> {
    const child = Bun.spawn(
      [tmux ?? "tmux", "-S", this.socket, "kill-server"],
      {
        stdout: "ignore",
        stderr: "ignore",
      },
    );
    // Startup failure can leave no server; disposal still waits for its process.
    await child.exited;
  }
}

async function verifySession(terminal: TmuxSession): Promise<void> {
  expect(await terminal.waitFor("count=0")).toContain("Unicode: 界 🙂 e\u0301");
  await terminal.command("send-keys", "-t", "canto", "-l", "\x1b[");
  await Bun.sleep(100);
  await terminal.command("send-keys", "-t", "canto", "-l", "hello世界");
  await terminal.waitFor("hello世界");
  await terminal.command("send-keys", "-t", "canto", "Tab", "Enter");
  await terminal.waitFor("count=1");
  await terminal.command("resize-window", "-t", "canto", "-x", "30", "-y", "8");
  expect(await terminal.waitFor("viewport=30x8")).toContain("count=1");
  await terminal.command(
    "resize-window",
    "-t",
    "canto",
    "-x",
    "80",
    "-y",
    "24",
  );
  await terminal.waitFor("viewport=80x24");
  await terminal.waitFor("hello世界");
  await terminal.command("send-keys", "-t", "canto", "C-c");
  expect(
    (
      await terminal.waitFor("1:0", [
        "display-message",
        "-p",
        "-t",
        "canto",
        "#{pane_dead}:#{pane_dead_status}",
      ])
    ).trim(),
  ).toBe("1:0");
}

test.skipIf(!tmux).each(["fullscreen", "inline"] as const)(
  "tmux %s preserves Unicode, recovers partial input, resizes, and exits cleanly",
  async (mode) => {
    const directory = await mkdtemp(join(tmpdir(), "canto-tmux-"));
    const terminal = new TmuxSession(join(directory, "socket"));
    try {
      await terminal.command(
        "new-session",
        "-d",
        "-s",
        "canto",
        "-x",
        "80",
        "-y",
        "24",
        process.execPath,
        resolve("src/terminal/fixtures/tmux.ts"),
        mode,
      );
      await terminal.command(
        "set-option",
        "-t",
        "canto",
        "remain-on-exit",
        "on",
      );
      await verifySession(terminal);
    } finally {
      await terminal.stop();
      await rm(directory, { recursive: true, force: true });
    }
  },
  15000,
);
