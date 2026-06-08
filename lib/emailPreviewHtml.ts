/** Email previews in sandboxed iframes cannot run app JS — disable in-preview navigation. */
export function prepareEmailPreviewForIframe(html: string) {
  return html.replace(/<a\s+/gi, '<a tabindex="-1" style="pointer-events:none;cursor:default;" ');
}
