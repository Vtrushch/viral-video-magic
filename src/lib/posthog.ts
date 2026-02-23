import posthog from 'posthog-js';

export const initPostHog = () => {
  if (typeof window !== 'undefined') {
    posthog.init('phc_Hl8fONebiAjkSkpYH8nbUZ8jQCAoYfXJiqPywkAWAy4', {
      api_host: 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
    });
  }
  return posthog;
};

export { posthog };
