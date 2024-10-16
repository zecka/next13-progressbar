import React, { useEffect } from 'react';
import NProgress from 'nprogress';
import { usePathname, useSearchParams, useRouter as useNextRouter } from 'next/navigation';
import { Next13ProgressProps } from '.';
import { NavigateOptions } from 'next/dist/shared/lib/app-router-context.shared-runtime';

type PushStateInput = [data: any, unused: string, url?: string | URL | null | undefined];

export const Next13ProgressBar = React.memo(
  ({ color = '#0A2FFF', height = '2px', options, showOnShallow = false, delay = 0, style }: Next13ProgressProps) => {
    const styles = (
      <style>
        {style ||
          `
          #nprogress {
            pointer-events: none;
          }
          
          #nprogress .bar {
            background: ${color};
          
            position: fixed;
            z-index: 1031;
            top: 0;
            left: 0;
          
            width: 100%;
            height: ${height};
          }
          
          /* Fancy blur effect */
          #nprogress .peg {
            display: block;
            position: absolute;
            right: 0px;
            width: 100px;
            height: 100%;
            box-shadow: 0 0 10px ${color}, 0 0 5px ${color};
            opacity: 1.0;
          
            -webkit-transform: rotate(3deg) translate(0px, -4px);
                -ms-transform: rotate(3deg) translate(0px, -4px);
                    transform: rotate(3deg) translate(0px, -4px);
          }
          
          /* Remove these to get rid of the spinner */
          #nprogress .spinner {
            display: block;
            position: fixed;
            z-index: 1031;
            top: 15px;
            right: 15px;
          }
          
          #nprogress .spinner-icon {
            width: 18px;
            height: 18px;
            box-sizing: border-box;
          
            border: solid 2px transparent;
            border-top-color: ${color};
            border-left-color: ${color};
            border-radius: 50%;
          
            -webkit-animation: nprogress-spinner 400ms linear infinite;
                    animation: nprogress-spinner 400ms linear infinite;
          }
          
          .nprogress-custom-parent {
            overflow: hidden;
            position: relative;
          }
          
          .nprogress-custom-parent #nprogress .spinner,
          .nprogress-custom-parent #nprogress .bar {
            position: absolute;
          }
          
          @-webkit-keyframes nprogress-spinner {
            0%   { -webkit-transform: rotate(0deg); }
            100% { -webkit-transform: rotate(360deg); }
          }
          @keyframes nprogress-spinner {
            0%   { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    );

    NProgress.configure(options || {});

    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
      NProgress.done();
    }, [pathname, searchParams]);

    useEffect(() => {
      let timer: NodeJS.Timeout;

      const startProgress = () => {
        timer = setTimeout(NProgress.start, delay);
      };

      const stopProgress = () => {
        clearTimeout(timer);
        NProgress.done();
      };

      const handleAnchorClick = (event: MouseEvent) => {
        const anchorElement = event.currentTarget as HTMLAnchorElement;

        // Skip anchors with target attribute but different than _self
        if (anchorElement.target !== '_self' && anchorElement.target?.trim() !== '')
          return;

        // Skip anchors with download attribute
        if (anchorElement.hasAttribute('download')) return;

        // target url without hash removed
        const targetUrl = new URL(anchorElement.href);
        const currentUrl = new URL(location.href);

        // check if search params changed
        const hasSearchParams = targetUrl?.searchParams?.toString() !== currentUrl?.searchParams?.toString();
        const paramsChanged = hasSearchParams && targetUrl?.search !== currentUrl?.search;
        const isSameUrl = targetUrl?.pathname === currentUrl?.pathname && !paramsChanged;

        // detect ctrl/cmd option/alt shift click
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        if (showOnShallow && isSameUrl) return;
        if (isSameUrl) return;

        startProgress();
      };

      const handleMutation: MutationCallback = () => {
        const anchorElements = document.querySelectorAll('a');
        const validAnchorELes = Array.from(anchorElements).filter((anchor) => {
          if (anchor.href.startsWith('tel:+') || anchor.href.startsWith('mailto:')) return false;
          if (anchor.target !== '_self' && anchor.target?.trim() !== '') return false;
          return anchor.href;
        });
        validAnchorELes.forEach((anchor) => anchor.addEventListener('click', handleAnchorClick));
      };

      const mutationObserver = new MutationObserver(handleMutation);
      mutationObserver.observe(document, { childList: true, subtree: true });
      
      const proxyStateChange = new Proxy(window.history.pushState, {
        apply: (target, thisArg, argArray: PushStateInput) => {
          stopProgress();
          return target.apply(thisArg, argArray);
        },
      });

      window.history.pushState = proxyStateChange;
      window.history.replaceState = proxyStateChange;
      

    return styles;
  },
  () => true
);

export function useRouter() {
  const router = useNextRouter();
  const pathname = usePathname();

  function push(href: string, options?: NavigateOptions) {
    const targetUrl = new URL(href, location.href);
    const currentUrl = new URL(location.href);
    const hasSearchParams = targetUrl?.searchParams?.toString() !== currentUrl?.searchParams?.toString();
    const paramsChanged = hasSearchParams && targetUrl?.search !== currentUrl?.search;
    if (targetUrl.pathname === pathname && !paramsChanged) return Promise.resolve(true);
    NProgress.start();
    return router.push(href, options);
  }

  function replace(href: string, options?: NavigateOptions) {
    const targetUrl = new URL(href, location.href);
    if (targetUrl.pathname === pathname) return Promise.resolve(true);
    NProgress.start();
    return router.replace(href, options);
  }

  return { ...router, push, replace };
}
