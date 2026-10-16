import {render, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ServiceWorkerRegistration} from './service-worker-registration';

const original=Object.getOwnPropertyDescriptor(navigator,'serviceWorker');
const register=vi.fn();
beforeEach(()=>{
  vi.stubEnv('NODE_ENV','production');
  register.mockReset();
  Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{register}});
});
afterEach(()=>{
  vi.unstubAllEnvs();
  if(original)Object.defineProperty(navigator,'serviceWorker',original);
  else Reflect.deleteProperty(navigator,'serviceWorker');
});

describe('service-worker registration',()=>{
  it('registers the root worker in production',async()=>{
    register.mockResolvedValue({});const onError=vi.fn();
    render(<ServiceWorkerRegistration onError={onError}/>);
    await waitFor(()=>expect(register).toHaveBeenCalledWith('/sw.js'));
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports registration failure without an unhandled rejection',async()=>{
    register.mockRejectedValue(new Error('offline'));const onError=vi.fn();
    render(<ServiceWorkerRegistration onError={onError}/>);
    await waitFor(()=>expect(onError).toHaveBeenCalledOnce());
  });

  it('does not register a worker in development',()=>{
    vi.stubEnv('NODE_ENV','development');render(<ServiceWorkerRegistration/>);
    expect(register).not.toHaveBeenCalled();
  });
});
