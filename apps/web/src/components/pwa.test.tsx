import {act, fireEvent, screen, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {renderWithProviders} from '@/test-utils';
import {InstallLink, InstallPage} from './install-page';
import {PwaProvider} from './pwa-provider';

let displayMode: EventTarget & {matches: boolean};
beforeEach(() => {
  displayMode=Object.assign(new EventTarget(),{matches:false});
  vi.stubGlobal('matchMedia',vi.fn(()=>displayMode));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (navigator as Navigator & {standalone?: boolean}).standalone;
});
function installStatus() { return within(screen.getByRole('region',{name:'Make room for Darna on your phone.'})).getByRole('status'); }
function renderInstall() { return renderWithProviders(<PwaProvider><InstallPage/></PwaProvider>); }
function browserPrompt(outcome: 'accepted'|'dismissed'='accepted', prompt=vi.fn().mockResolvedValue(undefined)) {
  const event=Object.assign(new Event('beforeinstallprompt',{cancelable:true}),{prompt,userChoice:Promise.resolve({outcome})});
  act(()=>{window.dispatchEvent(event);});
  return event;
}

describe('PWA installation',()=>{
  it('offers manual instructions without a browser prompt and keeps the guide public',()=>{
    renderInstall();
    expect(screen.getByRole('heading',{name:'Android'})).toBeVisible();
    expect(screen.getByRole('heading',{name:'iPhone & iPad'})).toBeVisible();
    expect(screen.getByText(/An internet connection is needed/)).toBeVisible();
    expect(screen.queryByRole('button',{name:'Install Darna'})).not.toBeInTheDocument();
  });

  it('waits for a user click and does not claim installation on acceptance alone',async()=>{
    renderInstall();const event=browserPrompt();
    expect(event.defaultPrevented).toBe(true);expect(event.prompt).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Install Darna'}));
    await waitFor(()=>expect(installStatus()).toHaveTextContent('Installation accepted'));
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(screen.queryByText('Darna is installed')).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Install Darna'})).not.toBeInTheDocument();
    act(()=>{window.dispatchEvent(new Event('appinstalled'));});
    expect(installStatus()).toHaveTextContent('Darna is installed');
    expect(screen.queryByRole('region',{name:'Install on your phone'})).not.toBeInTheDocument();
  });

  it('lets the user cancel and waits for a fresh browser event before offering another prompt',async()=>{
    renderInstall();const event=browserPrompt('dismissed');
    fireEvent.click(screen.getByRole('button',{name:'Install Darna'}));
    await waitFor(()=>expect(installStatus()).toHaveTextContent('No problem'));
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button',{name:'Install Darna'})).not.toBeInTheDocument();
    browserPrompt();expect(screen.getByRole('button',{name:'Install Darna'})).toBeEnabled();
  });

  it('handles a rejected prompt with manual recovery',async()=>{
    renderInstall();browserPrompt('accepted',vi.fn().mockRejectedValue(new Error('not allowed')));
    fireEvent.click(screen.getByRole('button',{name:'Install Darna'}));
    await waitFor(()=>expect(installStatus()).toHaveTextContent('could not open'));
    expect(screen.getByRole('heading',{name:'Android'})).toBeVisible();
    expect(screen.queryByText('Darna is installed')).not.toBeInTheDocument();
  });

  it('prevents duplicate prompts while the browser dialog is pending',async()=>{
    let resolve!:()=>void;
    const prompt=vi.fn(()=>new Promise<void>(yes=>{resolve=yes;}));
    renderInstall();browserPrompt('accepted',prompt);
    fireEvent.click(screen.getByRole('button',{name:'Install Darna'}));
    const pending=screen.getByRole('button',{name:'Opening installation…'});
    expect(pending).toBeDisabled();fireEvent.click(pending);expect(prompt).toHaveBeenCalledOnce();
    await act(async()=>{resolve();});
  });

  it('retains the captured event when navigating from the install link to the guide',async()=>{
    const view=renderWithProviders(<PwaProvider><InstallLink/></PwaProvider>);
    expect(screen.getByRole('link',{name:'Install Darna'})).toHaveAttribute('href','/en/install');
    const event=browserPrompt();
    view.rerender(<PwaProvider><InstallPage/></PwaProvider>);
    fireEvent.click(screen.getByRole('button',{name:'Install Darna'}));
    await waitFor(()=>expect(event.prompt).toHaveBeenCalledOnce());
  });

  it('hides installation controls when launched in standalone mode',()=>{
    displayMode.matches=true;renderInstall();browserPrompt();
    expect(installStatus()).toHaveTextContent('Darna is installed');
    expect(screen.queryByRole('button',{name:'Install Darna'})).not.toBeInTheDocument();
    expect(screen.queryByRole('region',{name:'Install on your phone'})).not.toBeInTheDocument();
  });

  it('responds when display mode changes',()=>{
    renderWithProviders(<PwaProvider><InstallLink/></PwaProvider>);
    expect(screen.getByRole('link',{name:'Install Darna'})).toBeVisible();
    act(()=>{displayMode.matches=true;displayMode.dispatchEvent(new Event('change'));});
    expect(screen.queryByRole('link',{name:'Install Darna'})).not.toBeInTheDocument();
  });

  it('recognizes Safari standalone mode',()=>{
    Object.defineProperty(navigator,'standalone',{configurable:true,value:true});
    renderInstall();expect(installStatus()).toHaveTextContent('Darna is installed');
  });

  it.each(['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)','Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)'])('places Safari instructions first for %s',userAgent=>{
    vi.spyOn(navigator,'userAgent','get').mockReturnValue(userAgent);
    renderInstall();
    expect(screen.getAllByRole('article')[0]).toHaveAccessibleName('iPhone & iPad');
    expect(screen.getByText(/Open as Web App if shown/)).toBeVisible();
  });
});
