import { spawnSync } from 'node:child_process';

// Reuse Git Credential Manager without printing or persisting its credential.
const credential = spawnSync('git', ['credential', 'fill'], {
  input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8',
  env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
  timeout: 20000,
});
if (credential.status !== 0) throw new Error('Accesso GitHub dal terminale non disponibile');
const fields = Object.fromEntries(credential.stdout.trim().split(/\r?\n/).map(line => {
  const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)];
}));
async function request(route) {
  const response = await fetch(`https://api.github.com/${route}`, {
    headers: { Authorization: `Bearer ${fields.password}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`GitHub ${route}: HTTP ${response.status}`);
  return response.json();
}
const user = await request('user');
const repo = await request('repos/deboshoot/unseen');
const sha = process.argv[2] || repo.default_branch;
const [status, deployments, checks] = await Promise.all([
  request(`repos/deboshoot/unseen/commits/${sha}/status`),
  request('repos/deboshoot/unseen/deployments?per_page=5'),
  request(`repos/deboshoot/unseen/commits/${sha}/check-runs`),
]);
const comments = await request(`repos/deboshoot/unseen/commits/${status.sha}/comments`);
const deploymentStatuses = [];
for (const deployment of deployments.slice(0, 3)) {
  const entries = await request(`repos/deboshoot/unseen/deployments/${deployment.id}/statuses`);
  deploymentStatuses.push({ sha: deployment.sha, environment: deployment.environment, states: entries.map(s => ({ state: s.state, url: s.environment_url, log: s.log_url, description: s.description })) });
}
console.log(JSON.stringify({ login: user.login, name: user.name, email: user.email, id: user.id, permission: repo.permissions, defaultBranch: repo.default_branch, sha: status.sha, status: status.state,
  statuses: status.statuses.map(s => ({ context: s.context, state: s.state, description: s.description, url: s.target_url })),
  checks: checks.check_runs.map(c => ({ name: c.name, status: c.status, conclusion: c.conclusion, url: c.details_url })),
  comments: comments.map(c => ({ author: c.user.login, body: c.body, url: c.html_url })), deployments: deploymentStatuses }, null, 2));
