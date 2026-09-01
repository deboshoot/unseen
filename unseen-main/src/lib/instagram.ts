const instagramUsernamePattern = /^[A-Za-z0-9._]{1,30}$/;

export function getInstagramProfile(value: string | null | undefined) {
  const input = value?.trim();
  if (!input) return null;

  let username = input.replace(/^@/, "");

  try {
    const url = new URL(input.match(/^https?:\/\//i) ? input : `https://${input}`);
    if (url.hostname === "instagram.com" || url.hostname === "www.instagram.com") {
      username = url.pathname.split("/").filter(Boolean)[0] ?? "";
    }
  } catch {
    return null;
  }

  if (!instagramUsernamePattern.test(username)) return null;

  return {
    username,
    href: `https://www.instagram.com/${username}/`,
  };
}
