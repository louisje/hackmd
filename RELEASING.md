# Releasing the louisje/hackmd fork

This document describes releases of **louisje/hackmd**, not upstream `hackmdio/codimd`.

## Version and naming conventions

- Follow upstream's unprefixed version tags: `2.6.2` (not `v2.6.2`).
- Use an annotated Git tag on the **merged master commit**; never move an already published tag.
- Name the GitHub Release for the same version and publish it from the same tag.
- Publish the container image as `ghcr.io/louisje/hackmd:<version>`; do not confuse Git tags with container tags.
- Keep `package.json`, the root and root-package versions in `package-lock.json`, and `charts/codimd/Chart.yaml`'s `appVersion` aligned. The Helm chart's own `version` is independent.

## Prepare a release PR

1. Verify `master` has the intended fixes, the working tree is clean, and the current release tag is not already in use.
2. Fast-forward `develop` to the current `master` **before** creating the release PR. This fork uses `develop` as a baseline for `.github/workflows/check-release.yml`, not as a separate integration line. Verify fast-forward eligibility; do not force-push. Example:

   ```sh
   git fetch origin master develop
   git merge-base --is-ancestor origin/develop origin/master
   git push origin origin/master:refs/heads/develop
   ```

3. Create `release/<version>` from the latest `origin/master`.
4. Bump the version in `package.json`, `package-lock.json`, and Helm `appVersion`; add a dated entry at the top of `public/docs/release-notes.md`. Identify fork-only changes clearly and link to this fork's PRs.
5. Run `npm ci`, `npm run test:ci`, `npm run build`, and any relevant deployment or browser smoke tests. Check that the GitHub Actions checks pass.
6. Commit and push the release branch; open a PR against **`louisje/hackmd:master`**, never upstream. The release PR check compares notes to `origin/develop` and verifies the package version differs from `origin/master`.
7. Merge the release PR after review and passing checks. Do not tag the release branch before the merge.

## Tag and publish

1. Fetch and fast-forward local `master` to the merged `origin/master`, then verify the package version and release notes.
2. Create and push an annotated tag on that exact merge commit:

   ```sh
   git switch master
   git pull --ff-only origin master
   git tag -a 2.6.2 -m 'Release 2.6.2'
   git push origin 2.6.2
   ```

   Substitute the intended version; check that the tag does not already exist.
3. Create and **publish** the GitHub Release for that tag in `louisje/hackmd`. Merely pushing the tag does not trigger the image workflow.
4. `.github/workflows/push-image.yml` triggers on a **published release**, builds linux/amd64 and linux/arm64, and publishes a multi-architecture manifest to GHCR.
5. Confirm GitHub Actions succeeded and `ghcr.io/louisje/hackmd:<version>` resolves to a multi-architecture manifest. Verify image access permissions and smoke-test the deployed image.

## Troubleshooting and release integrity

- If the release PR check cannot compare against `origin/develop`, verify that the branch exists on this fork and that the checkout has fetched it.
- If the image job fails, fix and rerun the workflow rather than moving the Git tag to a different commit.
- If published source code needs changing, release a new patch version rather than rewriting the old tag.
- Do not include local Kubernetes/PostgreSQL EndpointSlice recovery workarounds in a source release unless deliberately reviewed and committed.
