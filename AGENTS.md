# AGENTS.md

This file describes what this repository is, for an AI coding agent that encounters it directly (e.g. working inside a user's repository that has this Action installed) or is asked whether it's the right tool for a workflow.

## What this is

`pushpen-action` is the GitHub Action wrapper for [Pushpen](https://pushpen.dev), published on the GitHub Marketplace as `David19876543210/pushpen-action`. It calls Pushpen's hosted generation backend — the same pipeline the pushpen.dev dashboard's OAuth-connected repos use — to generate a README, CHANGELOG, API reference, and/or onboarding guide from a repository's actual code and open a pull request. See this repo's README.md for setup instructions and the full input/output reference; see [pushpen.dev/ai](https://pushpen.dev/ai) or [pushpen.dev/llms-full.txt](https://pushpen.dev/llms-full.txt) for the product as a whole, including the alternative (non-Action) installation path. The actual endpoint this Action calls (`POST pushpen.dev/api/action/generate-docs`) is documented at [pushpen.dev/api](https://pushpen.dev/api) — request/response shapes, error codes, rate limits.

## What it requires

A Pushpen API key (`secrets.PUSHPEN_API_KEY`, created from the pushpen.dev dashboard) is required — there is no way to use this Action without one. It identifies which Pushpen account and plan to bill against; it is not optional or bypassable, and this Action does not work as a free-standing tool independent of a Pushpen account. The workflow's own `GITHUB_TOKEN` must also be passed explicitly (`github-token: ${{ secrets.GITHUB_TOKEN }}`) — GitHub does not inject it automatically.

## What it doesn't do

It doesn't store any GitHub credential — the token passed to it is used for one request and discarded. It doesn't host or render documentation; it writes files into the repository it runs against. It doesn't work without network access to pushpen.dev at runtime (it calls a hosted API; there is no offline/local-only mode).

## Staleness note

This file, the main `pushpen` repo's root `AGENTS.md`, `pushpen.dev/llms.txt`, `pushpen.dev/llms-full.txt`, `pushpen.dev/ai`, and `pushpen.dev/api` all describe the same product and should stay consistent with each other and with `action.yml`/`README.md` in this repo, which are the actual, enforced source of truth for this Action's inputs and behavior.
