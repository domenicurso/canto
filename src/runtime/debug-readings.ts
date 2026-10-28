import type { Screen } from "../render/screen";
import type { DebugReadings } from "./debug-sampling";
import type { ContentFrameStats, FrameStats } from "./frame-stats";

export type Reading = readonly [label: string, value: string, help?: string];
const ms = (value: number): string => `${value.toFixed(1)} ms`;
export function debugReadings(
  stats: DebugReadings,
  screen: Screen,
): {
  header: Reading[];
  left: Reading[];
  right: Reading[];
} {
  return {
    header: [
      [
        `${Math.round(stats.fps)} FPS`,
        `${screen.width} × ${screen.height}`,
        "Frames presented in the last second.",
      ],
      [`Content #${stats.content.frame}`, `Output #${stats.completed.frame}`],
    ],
    left: contentReadings(stats.content),
    right: outputReadings(stats.completed),
  };
}
function contentReadings(content: Readonly<ContentFrameStats>): Reading[] {
  return [
    [
      "CPU",
      ms(content.contentTime),
      "Content work before inspector and output.",
    ],
    [
      " View",
      ms(content.updateTime),
      "Reconcile components and refresh input state.",
    ],
    [
      " Style/layout",
      ms(content.prepareTime),
      "Resolve styles and position content.",
    ],
    [" Paint", ms(content.paintTime), "Paint cells and prepare native images."],
    [
      " Diff",
      ms(content.diffTime),
      "Compare content cells with the previous frame.",
    ],
    ["", ""],
    [
      "Nodes",
      content.layoutNodes.toString(),
      "Nodes laid out in this content frame.",
    ],
    [
      "Painted",
      content.paintedCells.toString(),
      "Cell area repainted, including unchanged cells.",
    ],
    [
      "Changed",
      content.contentCellsWritten.toString(),
      "Content cell writes, excluding the inspector.",
    ],
  ];
}
function outputReadings(completed: Readonly<FrameStats>): Reading[] {
  const metric = (value?: number): string =>
    value === undefined ? "—" : ms(value);
  return [
    [
      "Frame",
      ms(completed.renderTime),
      "Time from reconciliation through output.",
    ],
    [
      " Inspector",
      ms(completed.debugTime),
      "Compose the inspector and diff the final screen.",
    ],
    [
      " Encode",
      metric(completed.encodeTime),
      "Encode graphics and terminal output.",
    ],
    [
      " Write",
      metric(completed.writeTime ?? completed.presentTime),
      completed.writeTime === undefined
        ? "Complete presentation through this adapter."
        : "Write output, including stream backpressure.",
    ],
    [
      "Interval",
      ms(completed.intervalTime),
      "Time between completed frames, including idle.",
    ],
    [
      "Output",
      completed.outputBytes === undefined
        ? "—"
        : `${(completed.outputBytes / 1024).toFixed(1)} KiB`,
      "Bytes sent for this frame, including graphics.",
    ],
  ];
}
