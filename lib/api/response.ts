import { NextResponse } from 'next/server';

export function ok<T>(data: T, init?: number | ResponseInit) {
  const status = typeof init === 'number' ? init : init?.status ?? 200;
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function paginated<T>(data: T[], total: number, page: number, limit: number) {
  return NextResponse.json({
    success: true,
    data,
    pagination: { total, page, limit, totalPages: limit > 0 ? Math.ceil(total / limit) : 0 },
  });
}

// Generic, non-leaking error helpers — never echo DB internals to clients.
export function badRequest(message = 'Invalid request') {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}
export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}
export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}
export function notFound(message = 'Not found') {
  return NextResponse.json({ success: false, error: message }, { status: 404 });
}
export function serverError(message = 'Something went wrong') {
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}
