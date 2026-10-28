/** Measurements for the content being submitted, excluding diagnostics and terminal I/O. */
export interface ContentFrameStats {
  frame: number;
  fps: number;
  updateTime: number;
  layoutTime: number;
  prepareTime: number;
  paintTime: number;
  diffTime: number;
  contentTime: number;
  layoutNodes: number;
  paintedCells: number;
  contentCellsWritten: number;
}
export interface FrameStats extends ContentFrameStats {
  cellsWritten: number;
  renderTime: number;
  debugTime: number;
  presentTime: number;
  intervalTime: number;
  encodeTime?: number;
  writeTime?: number;
  outputBytes?: number;
}
