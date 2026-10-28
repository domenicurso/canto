import { useEffect, useState } from "../../index";

export function useTicker(milliseconds: number, limit: number): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(
      () => setTick((value) => (value + 1) % limit),
      milliseconds,
    );
    return () => clearInterval(timer);
  }, [milliseconds, limit]);
  return tick;
}
