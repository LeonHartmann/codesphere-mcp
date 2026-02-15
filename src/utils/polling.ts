export class PollTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Polling timed out after ${timeoutMs}ms`);
    this.name = "PollTimeoutError";
  }
}

export async function pollUntil<T>(
  fn: () => Promise<T>,
  isDone: (result: T) => boolean,
  intervalMs = 3000,
  timeoutMs = 600_000
): Promise<T> {
  const start = Date.now();
  while (true) {
    const result = await fn();
    if (isDone(result)) return result;
    if (Date.now() - start >= timeoutMs) {
      throw new PollTimeoutError(timeoutMs);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
