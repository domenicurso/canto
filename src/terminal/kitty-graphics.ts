import { deflateSync } from "node:zlib";

import type { RasterPlacement } from "../render/raster-placement";

export function kittyUpload(id: number, image: RasterPlacement): string {
  const { width, height, data } = image.buffer;
  const raw = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  const compressed = raw.length >= 4096 ? deflateSync(raw, { level: 1 }) : raw;
  const deflated = compressed.length < raw.length;
  const bytes = (deflated ? compressed : raw).toString("base64");
  let output = "";
  for (let offset = 0; offset < bytes.length; offset += 4096) {
    const more = Number(offset + 4096 < bytes.length);
    const header =
      offset === 0
        ? `a=t,t=d,f=32,s=${width},v=${height},i=${id},q=2,${deflated ? "o=z," : ""}`
        : "";
    output += `\x1b_G${header}m=${more};${bytes.slice(offset, offset + 4096)}\x1b\\`;
  }
  return output;
}
export function kittyPlace(id: number, image: RasterPlacement): string {
  const r = image.rect;
  return `\x1b[${r.y + 1};${r.x + 1}H\x1b_Ga=p,i=${id},c=${r.width},r=${r.height},C=1,z=-1,q=2;\x1b\\`;
}
export function kittyDelete(id: number): string {
  return `\x1b_Ga=d,d=I,i=${id},q=2;\x1b\\`;
}

export function kittyClearPlacement(id: number): string {
  return `\x1b_Ga=d,d=i,i=${id},q=2;\x1b\\`;
}
