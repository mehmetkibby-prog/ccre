#!/usr/bin/env python3
"""Print a verified binding proposal; write only with explicit --output (exclusive create).

core-manifest: exact sourceIdentity() JSON. native-manifest: files[{path,bytes,sha256}].
runtime-config: {nodeBinary,nodeVersion,nodeExecArgv,featureFlags}.
functional-certificate: {passed:true,coreSHA256,deliverySHA256,proofPaths}; proofPaths
names the --functional-proof inputs, not the certificate itself. All paths resolve
against the assessment workspace. This helper never starts loads or assembles proofs.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import time

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('scoped50_binding_assessor', ROOT / 'tests/runtime/urgent50-assessment.py')
ASSESSOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ASSESSOR)


def path(value):
    return (ROOT / value).resolve(strict=True)


def name(value):
    resolved = path(value)
    return str(resolved.relative_to(ROOT)) if resolved.is_relative_to(ROOT) else str(resolved)


def read(value):
    return json.loads(path(value).read_text())


def require(condition, message):
    if not condition:
        raise ValueError(message)


def manifest_files(manifest, base):
    rows = manifest.get('files')
    require(isinstance(rows, list) and bool(rows), 'Manifest requires nonempty files')
    result = []
    for row in rows:
        require(isinstance(row, dict) and isinstance(row.get('path'), str), 'Invalid manifest row')
        relative = Path(row['path'])
        require(not relative.is_absolute() and '..' not in relative.parts, 'Manifest path must stay within its source root')
        item = name(base / relative)
        actual = ASSESSOR.pin(item)
        require(actual['bytes'] == row.get('bytes') and actual['sha256'] == row.get('sha256'), 'Manifest file changed: ' + item)
        result.append(item)
    require(len(set(result)) == len(result), 'Duplicate manifest file')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ('core-manifest', 'native-manifest', 'runtime-config', 'environment',
                 'functional-certificate', 'game-client', 'transport-client'):
        parser.add_argument('--' + flag, required=True)
    parser.add_argument('--functional-proof', action='append', required=True)
    parser.add_argument('--core-root', default='working/core511-source/scripts/core511')
    parser.add_argument('--native-root', default='working/native510-bb3a6cc689c6')
    parser.add_argument('--output', help='Explicitly create this binding file; existing files are never overwritten')
    args = parser.parse_args()
    core, native = path(args.core_root), path(args.native_root)
    plan, runtime, environment = read(ASSESSOR.PLAN), read(args.runtime_config), read(args.environment)
    require(isinstance(environment, dict) and bool(environment), 'Environment certificate must be a nonempty JSON object')
    require(not any((ROOT / s['rawArtifact']).exists() for s in plan['stages']), 'Campaign artifacts already exist; binding must precede loads')
    node = path(runtime['nodeBinary'])
    env = {k: v for k, v in os.environ.items() if k != 'NODE_OPTIONS'}
    node_version = subprocess.check_output([str(node), '--version'], env=env, text=True).strip()
    require(runtime.get('nodeVersion') == node_version and runtime.get('nodeExecArgv') == ['--no-lazy'], 'Runtime certificate differs from Node/startup policy')
    script = 'import {sourceIdentity} from ' + json.dumps((core / 'source-identity.mjs').as_uri()) + ';process.stdout.write(JSON.stringify(sourceIdentity()));'
    current = json.loads(subprocess.check_output([str(node), '--input-type=module', '-e', script], env=env, text=True))
    require(read(args.core_manifest) == current, 'Core manifest is not the exact current sourceIdentity() result')
    source_files = manifest_files(current, core) + manifest_files(read(args.native_manifest), native)
    test_root = ROOT / 'tests/runtime'
    harness_names = ['native-mixed-load-realistic.mjs', 'native-mixed-generator-realistic.mjs',
                     'potion-ledger-fixture.mjs', 'run.py', 'r84-fixture-loader.mjs', 'register-r84-fixture.mjs']
    topology_names = ['../delivery511/runtime-entry.mjs', '../delivery511/runtime-host.mjs',
                      '../delivery511/runtime-ingress.mjs', 'channel-process.mjs', 'process-supervisor.mjs']
    role_paths = {
        'plan': [ASSESSOR.PLAN], 'assessor': [ASSESSOR.ASSESSOR], 'summarizer': [ASSESSOR.SUMMARIZER],
        'coreManifest': [args.core_manifest], 'nativeManifest': [args.native_manifest],
        'deliveryIngress': [core / '../delivery511/runtime-ingress.mjs'],
        'gameClient': [args.game_client], 'transportClient': [args.transport_client],
        'nodeBinary': [node], 'runtimeConfig': [args.runtime_config], 'environment': [args.environment],
        'functionalProof': args.functional_proof,
        'harness': [test_root / harness_names[0], test_root / harness_names[2]],
        'generator': [test_root / harness_names[1]],
        'fixtureLoader': [test_root / n for n in harness_names[3:]],
        'measurement': [core / 'load-measurements.mjs'],
    }
    roles = {role: [ASSESSOR.pin(name(p)) for p in paths] for role, paths in role_paths.items()}
    proof_paths = [p['path'] for p in roles['functionalProof']]
    require(len(set(proof_paths)) == len(proof_paths), 'Duplicate functional proof')
    certificate = read(args.functional_certificate)
    delivery_sha = roles['deliveryIngress'][0]['sha256']
    require(certificate.get('passed') is True and certificate.get('coreSHA256') == current['sha256']
            and certificate.get('deliverySHA256') == delivery_sha, 'Functional certificate is not a passing same-final candidate proof')
    require([name(p) for p in certificate.get('proofPaths', [])] == proof_paths, 'Certificate proofPaths must exactly match --functional-proof order')
    all_paths = set(source_files + [p['path'] for rows in roles.values() for p in rows]
                    + [name(core / p) for p in topology_names] + [name(args.functional_certificate), name(__file__), ASSESSOR.DEPENDENCY])
    binding = {
        'schemaVersion': 1, 'status': 'frozen-before-scoped-campaign', 'createdAtEpochMs': time.time_ns() // 1_000_000,
        'plan': ASSESSOR.pin(ASSESSOR.PLAN), 'coreSHA256': current['sha256'], 'deliverySHA256': delivery_sha,
        'nodeVersion': node_version, 'nodeExecArgv': runtime['nodeExecArgv'], 'featureFlags': runtime['featureFlags'],
        'expectedTopology': ASSESSOR.TOPOLOGY,
        'stageLabels': [{k: s[k] for k in ('id', 'label', 'rawArtifact')} for s in plan['stages']],
        'pins': [ASSESSOR.pin(p) for p in sorted(all_paths)], 'rolePins': roles,
        'harnessPins': {n: ASSESSOR.pin(name(test_root / n))['sha256'] for n in harness_names},
        'topologyPins': {n: {k: v for k, v in ASSESSOR.pin(name(core / n)).items() if k != 'path'} for n in topology_names},
        'functionalVerification': {'passed': True, 'coreSHA256': current['sha256'], 'deliverySHA256': delivery_sha, 'proofPaths': proof_paths},
        'functionalCertificate': ASSESSOR.pin(name(args.functional_certificate)),
    }
    failures = ASSESSOR.validate_binding(plan, binding)
    require(not failures, 'Binding validation failed: ' + ', '.join(failures))
    encoded = json.dumps(binding, indent=2, ensure_ascii=False, allow_nan=False) + '\n'
    print(encoded, end='')
    if args.output:
        with (ROOT / args.output).open('x', encoding='utf-8') as output:
            output.write(encoded)
        print('Created binding: ' + args.output, file=sys.stderr)
    else:
        print('Dry run validated; no binding file written.', file=sys.stderr)


if __name__ == '__main__':
    main()
