/**
 * Generates a Facebook post URL that opens seamlessly on both Desktop and Mobile phones
 * (including deep linking directly into the Facebook mobile app).
 *
 * Problem it solves:
 * Facebook Graph API returns IDs in '{pageId}_{postId}' format (e.g. '177315082136543_122274802532141011').
 * When 'https://facebook.com/{pageId}_{postId}' is opened on mobile devices, Facebook treats the ID
 * as a user/page vanity handle and returns a 404/not found error.
 * By formatting into 'https://www.facebook.com/{pageId}/posts/{postId}', Facebook web and mobile apps
 * recognize the '/posts/' route and open the post directly.
 *
 * @param {string} [fbPostId] - The Facebook post ID (e.g. '177315082136543_122274802532141011' or '122274802532141011').
 * @param {string} [postUrl] - Optional full URL if already available.
 * @param {string|number} [pageId] - Optional fallback page ID.
 * @returns {string} Fully working Facebook URL.
 */
export const getFacebookPostUrl = (fbPostId, postUrl, pageId) => {
  // If postUrl is provided and is a string
  if (postUrl && typeof postUrl === 'string') {
    const trimmed = postUrl.trim();
    // Fix legacy raw ID pattern: https://facebook.com/{pageId}_{postId}
    const rawIdMatch = trimmed.match(/^https?:\/\/(?:www\.|m\.)?facebook\.com\/(\d+)_(\d+)\/?$/i);
    if (rawIdMatch) {
      const [, pId, pPostId] = rawIdMatch;
      return `https://www.facebook.com/${pId}/posts/${pPostId}`;
    }
    return trimmed;
  }

  if (!fbPostId || typeof fbPostId !== 'string') {
    return '#';
  }

  const cleanId = fbPostId.trim();

  // If in '{pageId}_{postId}' format (standard Facebook Graph API format)
  if (cleanId.includes('_')) {
    const [extractedPageId, extractedPostId] = cleanId.split('_');
    if (extractedPageId && extractedPostId) {
      return `https://www.facebook.com/${extractedPageId}/posts/${extractedPostId}`;
    }
  }

  // If we only have postId and an optional fallback pageId
  if (pageId && /^\d+$/.test(cleanId)) {
    return `https://www.facebook.com/${pageId}/posts/${cleanId}`;
  }

  // If cleanId is already a full URL
  if (cleanId.startsWith('http://') || cleanId.startsWith('https://')) {
    const rawIdMatch = cleanId.match(/^https?:\/\/(?:www\.|m\.)?facebook\.com\/(\d+)_(\d+)\/?$/i);
    if (rawIdMatch) {
      const [, pId, pPostId] = rawIdMatch;
      return `https://www.facebook.com/${pId}/posts/${pPostId}`;
    }
    return cleanId;
  }

  return `https://www.facebook.com/${cleanId}`;
};
