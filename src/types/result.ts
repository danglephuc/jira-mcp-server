export type ErrorLike = {
  kind: 'error';
  message: string;
  status?: number;
  details?: unknown;
};

export type OkResult<T> = {
  kind: 'ok';
  data: T;
};

export type SafeResult<T> = OkResult<T> | ErrorLike;

export function isErrorLike<T>(value: SafeResult<T>): value is ErrorLike {
  return value.kind === 'error';
}
