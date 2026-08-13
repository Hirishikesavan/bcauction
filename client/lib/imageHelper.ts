/**
 * Image URL helpers — Cloudinary or local /uploads paths
 */

export const getImageUrl = (
  imageUrl: string | null | undefined,
  fallbackImage: string = '/default-player.png'
): string => {
  if (!imageUrl) return fallbackImage;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;

  // Remove /api suffix if present to get base URL for static files
  const backendUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');
  
  const normalizedPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  const fullUrl = `${backendUrl}${normalizedPath}`;
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(' Image URL resolution:', {
      original: imageUrl,
      backendUrl,
      normalizedPath,
      fullUrl
    });
  }
  
  return fullUrl;
};

export const getTeamLogoUrl = (
  logoUrl: string | null | undefined,
  fallbackLogo: string = '/default-team-logo.png'
): string => getImageUrl(logoUrl, fallbackLogo);

export const getBannerUrl = (
  bannerUrl: string | null | undefined,
  fallbackBanner: string = '/default-banner.png'
): string => getImageUrl(bannerUrl, fallbackBanner);
