import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError, type ZodType } from 'zod';
import type { AppEnvironment } from './types';

export const MAX_SAVE_BYTES = 750_000;
export const MAX_ROUND_BYTES = 350_000;

export class ApiError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 500 | 502,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function parseJson<T>(c: Context<AppEnvironment>, schema: ZodType<T>, maxBytes: number): Promise<T> {
  const declared = Number(c.req.header('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > maxBytes) throw new ApiError(413, 'payload_too_large', `Request body exceeds ${maxBytes} bytes.`);

  const text = await c.req.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new ApiError(413, 'payload_too_large', `Request body exceeds ${maxBytes} bytes.`);

  try {
    return schema.parse(JSON.parse(text));
  } catch (error) {
    if (error instanceof ZodError) throw new ApiError(422, 'invalid_payload', 'The request body is not valid.', error.issues);
    throw new ApiError(400, 'invalid_json', 'The request body must be valid JSON.');
  }
}

export function jsonError(error: unknown, c: Context<AppEnvironment>) {
  const requestId = c.get('requestId');
  if (error instanceof ApiError) {
    return c.json({ error: { code: error.code, message: error.message, details: error.details, requestId } }, error.status);
  }
  if (error instanceof HTTPException) {
    return c.json({ error: { code: 'http_error', message: error.message, requestId } }, error.status);
  }
  console.error(JSON.stringify({ level: 'error', event: 'unhandled_api_error', requestId, message: error instanceof Error ? error.message : 'Unknown error' }));
  return c.json({ error: { code: 'internal_error', message: 'Something went wrong.', requestId } }, 500);
}
