/** Inline SVG icons from the design. `stroke` is set per use so themes can colour them. */
export const icons = {
  back: (c: string) =>
    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  restart: (c: string) =>
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7" stroke="${c}" stroke-width="2" stroke-linecap="round"/><path d="M4 4v4.5h4.5" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  undo: (c: string, w = 2.2) =>
    `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 14 4 9l5-5" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 9h10a6 6 0 0 1 0 12h-3" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/></svg>`,
  glass: (c: string, w = 2.2) =>
    `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4h10l-1.4 16.5a1.6 1.6 0 0 1-1.6 1.5h-4a1.6 1.6 0 0 1-1.6-1.5L7 4z" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/><path d="M12 9v6M9 12h6" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/></svg>`,
  hint: (c: string, w = 2.2) =>
    `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/></svg>`,
  share: (c: string) =>
    `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" stroke="${c}" stroke-width="2" stroke-linecap="round"/></svg>`,
  star: (c: string, size = 16) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="${c}"/></svg>`,
};

/** Escapes text for use inside HTML. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
}
