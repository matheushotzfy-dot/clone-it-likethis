const info = {
  backgroundColor: window.getComputedStyle(document.body).backgroundColor,
  primaryButton: window.getComputedStyle(document.querySelector('.bg-primary, .button-primary, button[class*="bg-primary"]')).backgroundColor || 'not found',
  textColor: window.getComputedStyle(document.body).color,
  fontFamily: window.getComputedStyle(document.body).fontFamily,
  logoUrl: document.querySelector('img[src*="logo"]')?.src || 'not found',
  bannerUrls: Array.from(document.querySelectorAll('img')).filter(img => img.src.includes('banner') || img.src.includes('highlights')).map(img => img.src),
  providerUrls: Array.from(document.querySelectorAll('img')).filter(img => img.src.includes('provider') || img.src.includes('game-provider')).map(img => img.src),
  gameThumbnails: Array.from(document.querySelectorAll('img')).filter(img => img.src.includes('game') || img.src.includes('thumbnail')).map(img => img.src)
};
console.log(JSON.stringify(info, null, 2));
