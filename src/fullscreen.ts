export async function enterFullscreen(element: HTMLElement | null) {
  if (!element) return;
  try { await element.requestFullscreen?.({ navigationUI: 'hide' }); } catch { /* CSS viewport fallback */ }
  if (matchMedia('(pointer: coarse)').matches) {
    try {
      const orientation = screen.orientation as ScreenOrientation & { lock?: (value: string) => Promise<void> };
      await orientation.lock?.('landscape');
    } catch { /* Some phones only allow manual rotation. */ }
  }
}

export async function exitFullscreen() {
  try { screen.orientation?.unlock(); } catch { /* Optional API */ }
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
}
