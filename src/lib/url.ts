/** Prefix a site path with the configured base (e.g. /wildbloom_page). */
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}

export const PATREON = 'https://www.patreon.com/';
export const INSTAGRAM = 'https://www.instagram.com/studio_wildbloom/';
