# Pushpen Docs

Automatically generate and update your README, CHANGELOG, API docs, and onboarding guide from a GitHub Actions workflow in your own repo — powered by [Pushpen](https://pushpen.dev).

This Action calls the same backend as the Pushpen dashboard: the same repo-fact-sheet grounding, patch-based diff-driven edits, and scheduled fact-check audit. There is no separate, lower-quality generation path for Actions — it's the same pipeline, just triggered from your own workflow instead of Pushpen's webhook.

## Setup

1. Create a Pushpen account at [pushpen.dev](https://pushpen.dev) if you don't have one.
2. In the dashboard, go to **Settings → API Keys** and generate a new key.
3. Add it as a repository secret: **Settings → Secrets and variables → Actions → New repository secret**, named `PUSHPEN_API_KEY`.
4. Add a workflow file (below) to `.github/workflows/`.

## Minimal workflow

```yaml
name: Pushpen Docs

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # full history — needed the first time this repo runs, for commit-history-based changelog generation

      - uses: David19876543210/pushpen-action@v1
        with:
          api-key: ${{ secrets.PUSHPEN_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

`github-token` must be passed explicitly, exactly as shown — GitHub does not inject `GITHUB_TOKEN` into a step's environment automatically just because `permissions:` grants scopes; every action that needs it has to receive it through `with:` like this. `secrets.GITHUB_TOKEN` is the repository's automatically-provisioned token (nothing to create or store yourself), scoped by the `permissions:` block below.

### Required permissions and token

Pushpen opens pull requests (or commits directly, if you've enabled auto-commit for this repo in the dashboard) using the token forwarded from this workflow run. You need both the `permissions:` block below **and** the explicit `github-token: ${{ secrets.GITHUB_TOKEN }}` line in `with:` (shown in the example above) — without either one, generation will fail on the delivery step:

```yaml
permissions:
  contents: write
  pull-requests: write
```

### Trigger on your own schedule

Pushpen doesn't dictate when generation runs — that's entirely your workflow's `on:` block. A few common patterns:

```yaml
# Run on every push to your default branch (most common)
on:
  push:
    branches: [main]

# Run manually from the Actions tab
on:
  workflow_dispatch:

# Run on a schedule (e.g. nightly) in addition to push
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 3 * * *'
```

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `api-key` | Yes | — | Your Pushpen API key. Pass via `secrets.PUSHPEN_API_KEY` — never commit it directly. |
| `github-token` | No (but see note) | — | Token used to read the repo and open/update PRs. Pass `${{ secrets.GITHUB_TOKEN }}` explicitly as shown above — GitHub does not inject it into a step's environment automatically. Only omit or override this if you're supplying a different token (e.g. a custom PAT) some other way. |
| `doc-types` | No | your plan's defaults | Comma-separated subset of `readme,changelog,api-docs,onboarding`. Can only narrow your plan's defaults, never expand past them (e.g. a free-plan key still only generates `readme` and `changelog` even if you list all four). |
| `api-base-url` | No | `https://pushpen.dev` | Override for testing against a non-production Pushpen deployment. |

## Outputs

| Output | Description |
|---|---|
| `generated` | Comma-separated doc types actually generated this run. Empty if nothing was justified by the push. |
| `pr-url` | URL of the pull request Pushpen opened, if any. Empty if auto-commit delivered directly, or if nothing was generated. |
| `connected` | `"true"` on the very first request for a repository (it was just connected to your Pushpen account), `"false"` otherwise. |

## First run

The first time this Action runs against a repository, Pushpen automatically connects it to your account (the same repo-count limits your plan enforces on the dashboard apply here too) and generates an initial documentation baseline from the full repository — not a diff, since there's nothing to diff against yet. Every run after that is driven by the actual push, reading only what changed.

## How this differs from the Pushpen dashboard's webhook integration

Functionally, nothing — same generation pipeline, same plan limits, same fact-sheet grounding and audit. The only difference is *how* Pushpen gets access to your repository:

- **Dashboard/webhook**: Pushpen stores a GitHub OAuth token for your account and reads your repo via the GitHub API whenever a webhook fires.
- **This Action**: nothing is stored. Your workflow passes its own short-lived, repository-scoped `GITHUB_TOKEN` explicitly (`github-token: ${{ secrets.GITHUB_TOKEN }}`), which is forwarded to Pushpen for the duration of that one request and expires when the job ends. Only your account-wide Pushpen API key persists, and it never grants repo access on its own — it identifies which account/plan to bill against.

If you'd rather not add a workflow file to every repo, the dashboard's webhook integration remains the simpler option for repos you connect there. Use this Action for repos where you want generation to run as part of your own CI, or where you'd rather not grant Pushpen a stored GitHub token at all.

## Security

- The forwarded `GITHUB_TOKEN` and your Pushpen API key are never logged by this Action or by Pushpen's backend.
- The GitHub token is used only for the single request this Action makes and is never persisted by Pushpen.
- Revoke a compromised API key anytime from **Settings → API Keys** in the dashboard — it takes effect immediately.

## License

[MIT](./LICENSE)
