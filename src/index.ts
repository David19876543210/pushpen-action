import * as core from '@actions/core';
import * as github from '@actions/github';

interface PushCommitPayload {
  id: string;
  message: string;
  author?: { name?: string; email?: string };
  added?: string[];
  modified?: string[];
  removed?: string[];
}

interface GenerateDocsResponse {
  success?: boolean;
  generated?: string[];
  failed?: string[];
  unchanged?: string[];
  skipped_no_match?: string[];
  prUrl?: string;
  connected?: boolean;
  kickstart?: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  message?: string;
}

async function run(): Promise<void> {
  try {
    const apiKey = core.getInput('api-key', { required: true });
    const githubToken = core.getInput('github-token') || process.env.GITHUB_TOKEN || '';
    const apiBaseUrl = (core.getInput('api-base-url') || 'https://pushpen.dev').replace(/\/+$/, '');
    const docTypesInput = core.getInput('doc-types');

    // Belt-and-suspenders: GitHub already masks values passed via `with:` from
    // a secret, but registering them explicitly ensures neither ever appears
    // in logs even if a future change accidentally echoes a header or a
    // debug dump of the request.
    core.setSecret(apiKey);
    if (githubToken) core.setSecret(githubToken);

    if (!githubToken) {
      core.setFailed(
        'No GitHub token available. Pass github-token explicitly or ensure the workflow has a default token (this is normally automatic).'
      );
      return;
    }

    const { owner, repo } = github.context.repo;
    const eventName = github.context.eventName;
    const payload = github.context.payload as { commits?: unknown[] };

    const body: Record<string, unknown> = {
      repoOwner: owner,
      repoName: repo,
      eventName,
      headSha: github.context.sha,
    };

    if (docTypesInput.trim()) {
      body.docTypes = docTypesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (eventName === 'push' && Array.isArray(payload.commits)) {
      body.commits = (payload.commits as PushCommitPayload[]).map((c) => ({
        id: c.id,
        message: c.message,
        author: c.author ? { name: c.author.name, email: c.author.email } : undefined,
        added: c.added,
        modified: c.modified,
        removed: c.removed,
      }));
    }

    core.info(`Requesting doc generation for ${owner}/${repo} (event: ${eventName})...`);

    const res = await fetch(`${apiBaseUrl}/api/action/generate-docs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pushpen-api-key': apiKey,
        'x-github-token': githubToken,
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => ({}))) as GenerateDocsResponse;

    if (!res.ok) {
      core.setFailed(`Pushpen API returned ${res.status}: ${data.message ?? data.error ?? 'unknown error'}`);
      return;
    }

    if (data.skipped) {
      core.info(`Skipped: ${data.reason ?? 'no reason given'}`);
      core.setOutput('generated', '');
      core.setOutput('pr-url', '');
      core.setOutput('connected', 'false');
      return;
    }

    if (data.connected) {
      core.info('This repository was connected to your Pushpen account automatically (first request from this Action).');
    }
    if (data.kickstart) {
      core.info('First run for this repository — generated an initial documentation baseline from full repository context.');
    }

    const generated = data.generated ?? [];
    const failed = data.failed ?? [];
    const unchanged = data.unchanged ?? [];
    const skippedNoMatch = data.skipped_no_match ?? [];

    if (generated.length > 0) core.info(`Generated: ${generated.join(', ')}`);
    if (unchanged.length > 0) core.info(`No changes justified by this push for: ${unchanged.join(', ')}`);
    if (skippedNoMatch.length > 0) core.warning(`Anchor mismatch (skipped, will retry next push): ${skippedNoMatch.join(', ')}`);
    if (failed.length > 0) core.warning(`Generation failed for: ${failed.join(', ')} (will retry on the next push)`);
    if (data.prUrl) core.info(`Pull request: ${data.prUrl}`);

    core.setOutput('generated', generated.join(','));
    core.setOutput('pr-url', data.prUrl ?? '');
    core.setOutput('connected', data.connected ? 'true' : 'false');
  } catch (err) {
    core.setFailed(err instanceof Error ? err.message : String(err));
  }
}

run();
