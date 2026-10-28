import type { Color } from "../../index";

export interface GitFile {
  path: string;
  status: string;
  color: Color;
}
export function parseGitStatus(output: string): GitFile[] {
  const fields = output.split("\0");
  const files: GitFile[] = [];
  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
    if (!field) continue;
    if (field.length < 4 || field[2] !== " ") throw new Error("Malformed Git status record");
    const code = field.slice(0, 2);
    let path = field.slice(3);
    if (/[RC]/.test(code)) {
      const source = fields[++index];
      if (!source) throw new Error("Missing Git rename source");
      path = `${source} → ${path}`;
    }
    files.push({ path, ...statusLabel(code) });
  }
  return files;
}
function statusLabel(code: string): { status: string; color: Color } {
  if (["DD", "AU", "UD", "UA", "DU", "AA", "UU"].includes(code))
    return { status: "UNMERGED", color: "magenta" };
  if (code === "??") return { status: "UNTRACKED", color: "cyan" };
  if (code.includes("R")) return { status: "RENAMED", color: "blue" };
  if (code.includes("C")) return { status: "COPIED", color: "blue" };
  if (code.includes("D")) return { status: "DELETED", color: "red" };
  if (code.includes("A"))
    return { status: code[1] === "M" ? "ADDED+MOD" : "ADDED", color: "green" };
  if (code.includes("M")) return { status: "MODIFIED", color: "yellow" };
  return { status: code.trim() || "UNKNOWN", color: "white" };
}
export async function readGitStatus(signal: AbortSignal): Promise<GitFile[]> {
  const child = Bun.spawn(["git", "status", "--porcelain=v1", "-z", "--untracked-files=normal"], {
    cwd: process.cwd(),
    signal,
  });
  const [output, error, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) throw new Error(error.trim() || "Git status failed");
  return parseGitStatus(output);
}
