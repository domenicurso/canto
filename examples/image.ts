import { Image, Renderer, Surface } from "..";

const imagePath = "/Users/dom/Downloads/Monstera Organic Dress.png";

const app = Image(imagePath);

const surface = new Surface(app, new Renderer());
surface.startRender({ cursor: { visibility: "hidden" } });
