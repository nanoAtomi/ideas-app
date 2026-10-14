import { describe, expect, it } from 'vitest';
import { siblingAppUrl } from './platformApps';

describe('siblingAppUrl', () => {
  it('finds a neighbour app on the same domain', () => {
    expect(siblingAppUrl('todo', { protocol: 'https:', hostname: 'ideas.nicasso.de' })).toBe('https://todo.nicasso.de');
  });

  it('has no neighbours locally', () => {
    expect(siblingAppUrl('todo', { protocol: 'http:', hostname: 'localhost' })).toBeNull();
  });
});
