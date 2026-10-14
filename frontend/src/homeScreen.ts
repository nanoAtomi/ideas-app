import { useEffect } from 'react';

/**
 * Quick-capture pages (blueprint "quick pages"): a page with one job - jot down a task,
 * an idea - that people put on their phone's home screen as its own icon. Web apps
 * can't offer home-screen widgets (that needs a native app); this is the web's answer,
 * and an iOS Shortcuts widget can open the same URL.
 *
 * While the page is open it swaps in its own manifest (start_url = this page), icon and
 * name, so "Share -> Add to Home Screen" picks those up; leaving restores the app's.
 * index.html needs the tags it swaps: <link rel="manifest">, <link rel="apple-touch-icon">,
 * <meta name="apple-mobile-web-app-title">.
 */
export interface HomeScreenIdentity {
  /** e.g. "/quick.webmanifest" - id and start_url point at the page. */
  manifest: string;
  /** Square 180 px PNG for iOS (it rounds the corners itself). */
  icon: string;
  /** Name under the icon - short, ~12 characters. */
  title: string;
}

export function useHomeScreenIdentity({ manifest, icon, title }: HomeScreenIdentity) {
  useEffect(() => {
    const swaps: [Element | null, string, string][] = [
      [document.querySelector('link[rel="manifest"]'), 'href', manifest],
      [document.querySelector('link[rel="apple-touch-icon"]'), 'href', icon],
      [document.querySelector('meta[name="apple-mobile-web-app-title"]'), 'content', title],
    ];
    const before = swaps.map(([el, attr]) => el?.getAttribute(attr) ?? null);
    swaps.forEach(([el, attr, value]) => el?.setAttribute(attr, value));
    return () =>
      swaps.forEach(([el, attr], i) => {
        const old = before[i];
        if (old !== null) el?.setAttribute(attr, old);
      });
  }, [manifest, icon, title]);
}
