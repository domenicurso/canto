import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

async function waitFor(file: string, expected: string): Promise<string> {
  const deadline = performance.now() + 8000;
  let content = "";
  while (performance.now() < deadline) {
    if (await Bun.file(file).exists()) content = await Bun.file(file).text();
    if (content.includes(expected)) return content;
    await Bun.sleep(20);
  }
  throw new Error(`Hot reload did not report ${expected}: ${content}`);
}

test("Bun soft reload preserves live state across module versions without duplicating effects", async () => {
  const directory = await mkdtemp(join(tmpdir(), "canto-hot-"));
  const file = join(directory, "app.ts");
  const report = join(directory, "report.txt");
  const source = (
    await Bun.file("src/runtime/reload/fixtures/session.ts").text()
  ).replace('"../../../../index"', JSON.stringify(resolve("index.ts")));
  await Bun.write(file, source);
  const child = Bun.spawn(
    [process.execPath, "--hot", "--no-clear-screen", file, report],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
  );
  const output = new Response(child.stdout).text();
  const errors = new Response(child.stderr).text();
  try {
    await waitFor(report, "version-one root=0");
    child.stdin.write("enter\n");
    child.stdin.flush();
    await waitFor(report, "child=1");
    child.stdin.write("r\n");
    child.stdin.flush();
    await waitFor(report, "version-one root=1");
    await Bun.write(file, source.replaceAll("version-one", "version-two"));
    const updated = await waitFor(report, "version-two root=1");
    expect(updated.slice(updated.lastIndexOf("version-two root=1"))).toContain(
      "child=1",
    );
    expect(updated.match(/start version-two/g)).toHaveLength(1);
    expect(updated.match(/stop version-one/g)).toHaveLength(1);
    child.stdin.write("enter\n");
    child.stdin.flush();
    await waitFor(report, "child=2");
    child.stdin.write("quit\n");
    child.stdin.flush();
    await waitFor(report, "stop version-two");
  } finally {
    child.kill();
    await child.exited;
    const diagnostics = (await output) + (await errors);
    expect(diagnostics).not.toContain("Hooks must be called");
    expect(diagnostics).not.toContain("already belongs");
    await rm(directory, { recursive: true, force: true });
  }
}, 15000);
