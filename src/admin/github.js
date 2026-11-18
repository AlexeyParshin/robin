// Commits a file to this game's GitHub repo straight from the browser.
// Needs a fine-grained personal access token with "Contents: Read and write" on this repo only.
// The token is kept in this browser's localStorage and is never part of the site's code.

const OWNER = 'AlexeyParshin';
const REPO = 'robin';
const BRANCH = 'main';
const TOKEN_KEY = 'robin.githubToken';

export const repoName = `${OWNER}/${REPO}`;

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

export function setToken(token) {
  try { token ? localStorage.setItem(TOKEN_KEY, token.trim()) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function explain(res) {
  let msg = '';
  try { msg = (await res.json()).message || ''; } catch { /* not JSON */ }
  if (res.status === 401) return new Error('GitHub rejected the token (expired or mistyped?)');
  if (res.status === 403 || res.status === 404) return new Error(`Token has no write access to ${repoName} (${msg || res.status})`);
  if (res.status === 409) return new Error('File changed on GitHub meanwhile. Reload the page and try again.');
  return new Error(`GitHub error ${res.status}: ${msg}`);
}

/** Creates a commit that sets `path` to `text`. Resolves to the commit's web URL. */
export async function commitFile(path, text, message) {
  const token = getToken();
  if (!token) throw new Error('Set a GitHub token first');
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const cur = await fetch(`${url}?ref=${BRANCH}&t=${Date.now()}`, { headers, cache: 'no-store' });
  let sha;
  if (cur.ok) sha = (await cur.json()).sha;
  else if (cur.status !== 404) throw await explain(cur);

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ message, content: utf8ToBase64(text), sha, branch: BRANCH }),
  });
  if (!res.ok) throw await explain(res);
  return (await res.json()).commit.html_url;
}
