import { Image, Renderer, Surface, Text, VStack } from "..";

const imagePath = "/Users/dom/Downloads/Monstera Organic Dress.png"; // Change to point at a real PNG on disk

const app = VStack(
  Text(`Previewing image: ${imagePath}`),
  Image(imagePath),
).style({ gap: 1 });

const surface = new Surface(app, new Renderer());
surface.startRender({ cursor: { visibility: "hidden" } });
