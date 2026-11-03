import { expect, test } from "bun:test";

import { Decoder } from "./decoder";
import { InputTimeout } from "./input-timeout";

test("process input expires partial sequences while allowing slow paste chunks", async () => {
  const keys: string[] = [];
  const input = new InputTimeout(
    new Decoder((event) => {
      if (event.type === "key") keys.push(event.event.text ?? event.event.key);
    }),
  );
  try {
    input.push(Buffer.from("\x1b["));
    await Bun.sleep(50);
    input.push(Buffer.from("hello"));
    input.push(Buffer.from("\x1b[200~slow"));
    await Bun.sleep(50);
    input.push(Buffer.from(" paste\x1b[201~"));
    expect(keys).toEqual(["h", "e", "l", "l", "o", "slow paste"]);
  } finally {
    input.dispose();
  }
});
