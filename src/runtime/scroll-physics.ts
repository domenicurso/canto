import type { ScrollPosition } from "../element/props";
import type { Mounted } from "./tree";

interface Motion {
  velocity: ScrollPosition;
  time: number;
  friction: number;
}
export function decayMotion(
  velocity: ScrollPosition,
  seconds: number,
  friction: number,
) {
  const decay = Math.exp(-friction * seconds);
  const distance = (1 - decay) / friction;
  return {
    velocity: { x: velocity.x * decay, y: velocity.y * decay },
    delta: { x: velocity.x * distance, y: velocity.y * distance },
  };
}
export class ScrollPhysics {
  private readonly motions = new Map<Mounted, Motion>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(
    private readonly schedule: () => void,
    private readonly move: (node: Mounted, delta: ScrollPosition) => void,
  ) {}
  kick(node: Mounted, delta: ScrollPosition): void {
    const config = node.element.data.props.scroll?.physics;
    if (!config || config === "instant") return;
    const friction = config.friction ?? 8;
    const previous = this.motions.get(node);
    this.motions.set(node, {
      time: performance.now(),
      friction,
      velocity: {
        x:
          (previous?.velocity.x ?? 0) +
          delta.x * friction * (config.momentum ?? 2),
        y:
          (previous?.velocity.y ?? 0) +
          delta.y * friction * (config.momentum ?? 2),
      },
    });
    this.arm();
  }
  advance(now = performance.now()): void {
    for (const [node, motion] of this.motions) {
      if (
        !node.active ||
        !node.element.data.props.scroll?.physics ||
        node.element.data.props.scroll.physics === "instant"
      ) {
        this.motions.delete(node);
        continue;
      }
      const next = decayMotion(
        motion.velocity,
        Math.max(0, now - motion.time) / 1000,
        motion.friction,
      );
      this.move(node, next.delta);
      motion.velocity = next.velocity;
      motion.time = now;
      if (
        (node.offsetX <= 0 && next.velocity.x < 0) ||
        (node.offsetX >= node.maxOffsetX && next.velocity.x > 0)
      )
        motion.velocity.x = 0;
      if (
        (node.offset <= 0 && next.velocity.y < 0) ||
        (node.offset >= node.maxOffset && next.velocity.y > 0)
      )
        motion.velocity.y = 0;
      if (Math.hypot(motion.velocity.x, motion.velocity.y) < 0.1)
        this.motions.delete(node);
    }
    this.arm();
  }
  private arm(): void {
    if (!this.motions.size || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.schedule();
    }, 16);
  }
  dispose(): void {
    clearTimeout(this.timer);
    this.motions.clear();
  }
}
