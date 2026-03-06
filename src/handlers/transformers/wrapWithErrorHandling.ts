import { ErrorLike, SafeResult } from '../../types/result.js';
import { runToolSafely } from '../../utils/runToolSafely.js';

export function wrapWithErrorHandling<I, T>(
  fn: (input: I) => Promise<T>,
  onError?: (err: unknown) => ErrorLike
): (input: I) => Promise<SafeResult<T>> {
  return runToolSafely(fn, onError);
}
