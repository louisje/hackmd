# Chromium PDF sandbox

The PDF endpoint uses system Chromium through puppeteer-core. Keep Chromium sandbox enabled. Do not use `--no-sandbox`, privileged mode, SYS_ADMIN or unconfined seccomp as a deployment workaround.

## Docker

Use `--security-opt seccomp=deployments/chromium-seccomp.json` when running from the repository root. The profile is based on [Moby profiles](https://github.com/moby/profiles/blob/f862455628f78f84c937e967e4a03902fb1dee11/seccomp/default.json), with additional clone and unshare allowances. These allowances apply to the entire container, not just Chromium. The amd64 image was tested under Docker 29.8.2 (OrbStack).

## Kubernetes

Generate OCI-compatible architecture-specific profiles with `python3 deployments/generate-chromium-seccomp.py`. On each eligible worker, an administrator must install the matching file under the kubelet seccomp root (normally `/var/lib/kubelet/seccomp`), e.g. `install -D -m 0644 deployments/chromium-seccomp-amd64.json /var/lib/kubelet/seccomp/hackmd/chromium.json`. For arm64 use the arm64 file. For cri-dockerd, verify runtime support; the Docker-format profile retains Docker's conditional rules. Do not assume OCI and Docker profiles have identical semantics.

Set Helm values:

```yaml
securityContext:
  seccompProfile:
    type: Localhost
    localhostProfile: hackmd/chromium.json
```

The profile is node-local; a ConfigMap mounted in the application container cannot install it for the runtime. Verify node policy permits Chromium's setuid sandbox (including privilege escalation for the sandbox helper), namespaces and required syscalls. If cluster policy prohibits this, PDF rendering needs a separately isolated service or a different engine; do not silently disable the sandbox. The OCI amd64 profile has been tested with Docker only; Kubernetes/CRI and arm64 remain unverified. No cluster settings are automatically changed by the chart.

## Rendering behavior

Raw HTML and JavaScript are disabled. External resources are blocked; local raster uploads are embedded from the configured uploads directory. Remote image providers may not appear in PDF exports. `CMD_CHROMIUM_EXECUTABLE_PATH` overrides the executable location.
