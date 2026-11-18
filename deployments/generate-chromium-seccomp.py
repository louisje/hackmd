#!/usr/bin/env python3
"""Generate architecture-specific OCI profiles from the checked-in Moby profile."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent
source = json.loads((root / 'chromium-seccomp.json').read_text())
for arch, architectures in (
    ('amd64', ['SCMP_ARCH_X86_64', 'SCMP_ARCH_X86', 'SCMP_ARCH_X32']),
    ('arm64', ['SCMP_ARCH_AARCH64', 'SCMP_ARCH_ARM']),
):
    result = dict(defaultAction=source['defaultAction'], defaultErrnoRet=1,
                  architectures=architectures, syscalls=[])
    for rule in source['syscalls']:
        include = rule.get('includes', {})
        exclude = rule.get('excludes', {})
        if include.get('caps') and include['caps'] != ['CAP_SYS_CHROOT']:
            continue
        if include.get('arches') and arch not in include['arches']:
            continue
        if arch in exclude.get('arches', []):
            continue
        # Do not enable kernel-version-dependent tracing permissions.
        if include.get('minKernel'):
            continue
        result['syscalls'].append({k: v for k, v in rule.items()
                                   if k not in ('includes', 'excludes', 'comment')})
    (root / ('chromium-seccomp-' + arch + '.json')).write_text(
        json.dumps(result, indent=2) + '\n')
