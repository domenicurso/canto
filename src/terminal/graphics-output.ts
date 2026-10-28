import type { RasterPlacement } from "../render/raster-placement";

import {
  kittyClearPlacement,
  kittyDelete,
  kittyPlace,
  kittyUpload,
} from "./kitty-graphics";
import { sixel } from "./sixel";

interface Displayed {
  image: RasterPlacement;
  id: number;
  bytes: Buffer;
  encoded?: string;
}
/** Own native image IDs and their cleanup for one terminal session. */
export class GraphicsOutput {
  private displayed = new Map<object, Displayed>();
  private nextId =
    1 + ((crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % 0x3fffffff);
  update(
    images: readonly RasterPlacement[],
    dirtyRows: readonly number[] = [],
  ): {
    output: string;
    repaint: boolean;
  } {
    let { output, repaint } = this.prune(images);
    for (const image of images) {
      const previous = this.displayed.get(image.owner);
      const bytes = Buffer.from(
        image.buffer.data.buffer,
        image.buffer.data.byteOffset,
        image.buffer.data.byteLength,
      );
      const moved =
        !previous ||
        JSON.stringify(previous.image.rect) !== JSON.stringify(image.rect);
      const changed = imageChanged(image, previous);
      let encoded = previous?.encoded;
      const id = previous && !changed ? previous.id : this.nextId++;
      if (image.renderer === "kitty") {
        if (previous && moved && !changed) output += kittyClearPlacement(id);
        if (changed) output += kittyUpload(id, image);
        if (changed || moved) output += kittyPlace(id, image);
        if (previous && changed) output += kittyDelete(previous.id);
      } else {
        repaint ||= Boolean(previous && moved);
        if (changed || moved || repaint || touchesRows(image, dirtyRows)) {
          encoded = changed || !encoded ? sixel(image.buffer) : encoded;
          output += `\x1b[${image.rect.y + 1};${image.rect.x + 1}H` + encoded;
        }
      }
      this.displayed.set(image.owner, {
        image,
        id,
        encoded,
        bytes: !changed && previous ? previous.bytes : Buffer.from(bytes),
      });
    }
    return { output, repaint };
  }
  private prune(images: readonly RasterPlacement[]): {
    output: string;
    repaint: boolean;
  } {
    const live = new Set(images.map((image) => image.owner));
    let output = "",
      repaint = false;
    for (const [owner, previous] of this.displayed) {
      const current = images.find((image) => image.owner === owner);
      if (live.has(owner) && current?.renderer === previous.image.renderer) {
        if (
          current.renderer === "sixel" &&
          JSON.stringify(current.rect) !== JSON.stringify(previous.image.rect)
        )
          repaint = true;
        continue;
      }
      if (previous.image.renderer === "kitty")
        output += kittyDelete(previous.id);
      else repaint = true;
      this.displayed.delete(owner);
    }
    return { output, repaint };
  }
  stop(): string {
    let output = "";
    for (const previous of this.displayed.values())
      if (previous.image.renderer === "kitty")
        output += kittyDelete(previous.id);
    this.displayed.clear();
    return output;
  }
}

function imageChanged(image: RasterPlacement, previous?: Displayed): boolean {
  const bytes = Buffer.from(
    image.buffer.data.buffer,
    image.buffer.data.byteOffset,
    image.buffer.data.byteLength,
  );
  return (
    !previous ||
    image.buffer.width !== previous.image.buffer.width ||
    image.buffer.height !== previous.image.buffer.height ||
    (previous.image.buffer !== image.buffer && !previous.bytes.equals(bytes))
  );
}
function touchesRows(image: RasterPlacement, rows: readonly number[]): boolean {
  return rows.some(
    (row) => row >= image.rect.y && row < image.rect.y + image.rect.height,
  );
}
