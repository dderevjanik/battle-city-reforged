import posthog from 'posthog-js';

import * as config from '../config';

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

const POSTHOG_DEFAULT_HOST = 'https://us.i.posthog.com';

export class Analytics {
  private gaEnabled = false;
  private posthogEnabled = false;

  public init(): void {
    if (!config.IS_PROD) {
      return;
    }

    const env = import.meta.env as unknown as Record<string, string | undefined>;
    const gaId = env.VITE_GA_MEASUREMENT_ID;
    const posthogKey = env.VITE_POSTHOG_KEY;
    const posthogHost = env.VITE_POSTHOG_HOST ?? POSTHOG_DEFAULT_HOST;

    if (gaId) {
      this.loadGtag(gaId);
    }

    if (posthogKey) {
      try {
        posthog.init(posthogKey, {
          api_host: posthogHost,
          capture_pageview: false,
          autocapture: false,
          persistence: 'localStorage',
        });
        this.posthogEnabled = true;
      } catch (err) {
        console.warn('PostHog init failed:', err);
      }
    }
  }

  public pageview(name: string): void {
    const path = `/${name}`;
    if (this.gaEnabled && window.gtag) {
      try {
        window.gtag('event', 'page_view', {
          page_title: name,
          page_path: path,
        });
      } catch (err) {
        console.warn('GA pageview failed:', err);
      }
    }
    if (this.posthogEnabled) {
      try {
        posthog.capture('$pageview', { $pathname: path, scene_name: name });
      } catch (err) {
        console.warn('PostHog pageview failed:', err);
      }
    }
  }

  public track(event: string, props: Record<string, unknown> = {}): void {
    if (this.gaEnabled && window.gtag) {
      try {
        window.gtag('event', event, props);
      } catch (err) {
        console.warn('GA track failed:', err);
      }
    }
    if (this.posthogEnabled) {
      try {
        posthog.capture(event, props);
      } catch (err) {
        console.warn('PostHog track failed:', err);
      }
    }
  }

  private loadGtag(measurementId: string): void {
    try {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer ?? [];
      window.gtag = function gtag(...args: unknown[]): void {
        window.dataLayer!.push(args);
      };
      window.gtag('js', new Date());
      window.gtag('config', measurementId, { send_page_view: false });
      this.gaEnabled = true;
    } catch (err) {
      console.warn('GA init failed:', err);
    }
  }
}
