/**
 * Parses a pasted Facebook post URL into a usable fb_post_id.
 *
 * Supports the two common formats:
 *   1. https://www.facebook.com/{page_id_or_slug}/posts/{post_id}
 *      -> combined as "{page_id_or_slug}_{post_id}" when page part is numeric
 *   2. https://www.facebook.com/permalink.php?story_fbid={fbid}&id={page_id}
 *      -> combined as "{page_id}_{fbid}"
 *
 * Note: URLs using the newer opaque `pfbid...` format (from /photo?fbid=pfbid...
 * or some permalink variants) cannot be reliably converted client-side — the
 * pfbid string itself is NOT a valid Graph API post ID. In that case this
 * function returns null and the UI should ask the user to grab the "story_fbid"
 * style link instead (via "Copy link to post" on the post's timestamp, not
 * "Copy link" on an individual photo).
 *
 * Returns null if the URL doesn't match a known, safely-parseable format —
 * callers should treat null as "ask the user to paste a different link format".
 */
export const parseFbPostUrl = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return null;

    let url;
    try {
        url = new URL(rawUrl.trim());
    } catch {
        return null; // not a valid URL at all
    }

    if (!url.hostname.includes('facebook.com')) return null;

    // Format 1: /{page}/posts/{post_id}
    const postsMatch = url.pathname.match(/^\/([^/]+)\/posts\/([^/?]+)/);
    if (postsMatch) {
        const [, pagePart, postPart] = postsMatch;
        if (/^\d+$/.test(pagePart) && /^\d+$/.test(postPart)) {
            return `${pagePart}_${postPart}`;
        }
        if (/^\d+_\d+$/.test(postPart)) {
            return postPart;
        }
        return null;
    }

    // Format 2: permalink.php?story_fbid=...&id=...
    if (url.pathname.includes('permalink.php')) {
        const storyFbid = url.searchParams.get('story_fbid');
        const id = url.searchParams.get('id');
        if (storyFbid && id && /^\d+$/.test(storyFbid) && /^\d+$/.test(id)) {
            return `${id}_${storyFbid}`;
        }
        return null;
    }

    return null;
};