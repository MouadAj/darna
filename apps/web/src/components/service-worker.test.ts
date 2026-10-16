import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe, expect, it, vi} from 'vitest';

function worker() {
  const handlers = new Map<string, (event: unknown) => void>();
  const cache={addAll:vi.fn().mockResolvedValue(undefined)};
  const caches={open:vi.fn().mockResolvedValue(cache),keys:vi.fn().mockResolvedValue(['darna-shell-v3','darna-shell-v4','another-feature-cache']),delete:vi.fn().mockResolvedValue(true),match:vi.fn().mockResolvedValue(new Response('Offline'))};
  const fetch=vi.fn().mockResolvedValue(new Response('Online'));
  const self={location:{origin:'https://darna.example'},addEventListener:(name: string, callback: (event: unknown) => void)=>handlers.set(name,callback),skipWaiting:vi.fn(),clients:{claim:vi.fn(),openWindow:vi.fn()}};
  runInNewContext(readFileSync('public/sw.js','utf8'),{self,caches,fetch,URL});
  return {handlers,caches,cache,fetch};
}

describe('service-worker privacy and offline behavior',()=>{
  it('precaches only the public offline page and brand mark',async()=>{
    const {handlers,caches,cache}=worker();let pending!:Promise<unknown>;
    handlers.get('install')!({waitUntil:(promise:Promise<unknown>)=>{pending=promise;}});await pending;
    expect(caches.open).toHaveBeenCalledWith('darna-shell-v4');
    expect(cache.addAll).toHaveBeenCalledWith(['/offline.html','/brand/housefamily-mark.png']);
  });

  it('removes old Darna caches while preserving other features and the current shell',async()=>{
    const {handlers,caches}=worker();let pending!:Promise<unknown>;
    handlers.get('activate')!({waitUntil:(promise:Promise<unknown>)=>{pending=promise;}});await pending;
    expect(caches.delete).toHaveBeenCalledExactlyOnceWith('darna-shell-v3');
  });

  it.each(['/api/items','/api/auth/me','/api/shopping/active'])('does not intercept private API requests to %s',path=>{
    const {handlers,caches,fetch}=worker();const respondWith=vi.fn();
    handlers.get('fetch')!({request:{url:`https://darna.example${path}`,method:'GET',mode:'cors'},respondWith});
    expect(respondWith).not.toHaveBeenCalled();expect(caches.match).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
  });

  it('serves the offline screen when navigation cannot reach the network',async()=>{
    const {handlers,caches,fetch}=worker();fetch.mockRejectedValueOnce(new Error('offline'));let pending!:Promise<Response>;
    handlers.get('fetch')!({request:{url:'https://darna.example/en',method:'GET',mode:'navigate'},respondWith:(promise:Promise<Response>)=>{pending=promise;}});
    expect(await(await pending).text()).toBe('Offline');expect(caches.match).toHaveBeenCalledWith('/offline.html');
  });

  it('preserves real HTTP errors instead of disguising them as offline',async()=>{
    const {handlers,caches,fetch}=worker();fetch.mockResolvedValueOnce(new Response('Server error',{status:500}));let pending!:Promise<Response>;
    handlers.get('fetch')!({request:{url:'https://darna.example/en',method:'GET',mode:'navigate'},respondWith:(promise:Promise<Response>)=>{pending=promise;}});
    expect((await pending).status).toBe(500);expect(caches.match).not.toHaveBeenCalled();
  });
});
