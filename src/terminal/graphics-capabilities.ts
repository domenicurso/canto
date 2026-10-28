export interface GraphicsCapabilities {
  kitty: boolean;
  sixel: boolean;
}
export type GraphicsReply = "kitty" | "sixel";
const probeId = 2147483647;
export const graphicsQuery = `\x1b_Gi=${probeId},s=1,v=1,a=q,t=d,f=24;AAAA\x1b\\\x1b[c`;
/** Consume capability reports separately from keyboard input, including partial reports. */
export function graphicsResponse(
  buffer: string,
): { length: number; reply?: GraphicsReply } | undefined {
  if ("\x1b_G".startsWith(buffer)) return { length: 0 };
  if (buffer.startsWith("\x1b_G")) {
    const end = buffer.indexOf("\x1b\\");
    if (end < 0) return { length: 0 };
    const payload = buffer.slice(3, end);
    return {
      length: end + 2,
      reply: new RegExp(`(?:^|,)i=${probeId}(?:,|;).*;?OK$`).test(payload)
        ? "kitty"
        : undefined,
    };
  }
  if (buffer.startsWith("\x1b[?")) {
    const report = /^\x1b\[\?([\d;]*)c/.exec(buffer);
    if (report)
      return {
        length: report[0].length,
        reply: report[1]?.split(";").includes("4") ? "sixel" : undefined,
      };
    if (/^\x1b\[\?[\d;]*$/.test(buffer)) return { length: 0 };
  }
  return undefined;
}
