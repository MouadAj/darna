import {afterEach, describe, expect, it, vi} from 'vitest';
import {api, ApiError} from './api';
import type {ShoppingTrip} from './types';

afterEach(() => vi.unstubAllGlobals());

describe('shopping JSON responses', () => {
  it('parses an explicit JSON null as no active trip', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('null', {status: 200, headers: {'Content-Type': 'application/json'}})));
    await expect(api<ShoppingTrip | null>('/shopping/active')).resolves.toBeNull();
  });

  it('parses an existing trip without changing its structure', async () => {
    const trip = {id: 'trip-a', status: 'ACTIVE', shopper: {id: 'member-a', name: 'Member'}, items: []};
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(trip), {status: 200, headers: {'Content-Type': 'application/json'}})));
    await expect(api<ShoppingTrip | null>('/shopping/active')).resolves.toEqual(trip);
  });

  it('continues to report genuine API failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({message: 'Temporary service failure'}), {status: 503, headers: {'Content-Type': 'application/json'}})));
    const error = await api('/shopping/active').catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({status: 503, message: 'Temporary service failure'});
  });

  it('does not silently interpret malformed successful responses as empty shopping data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', {status: 200})));
    await expect(api('/shopping/active')).rejects.toBeInstanceOf(SyntaxError);
  });
});
