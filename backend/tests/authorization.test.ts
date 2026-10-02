import { describe, expect, it, vi } from 'vitest';
import { requireRole } from '../src/middleware/requireRole.js';

describe('authorization middleware', () => {
  it('blocks non-admin access for admin-only route', () => {
    const middleware = requireRole('admin');
    const next = vi.fn();

    middleware(
      { user: { id: '1', email: 'citizen@example.com', role: 'citizen', full_name: null } } as never,
      {} as never,
      next,
    );

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0]?.[0];
    expect(error.code).toBe('FORBIDDEN');
  });
});
