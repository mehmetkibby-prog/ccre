"""Development fixtures outside the release's canonical core are not live code.

perf-r11/tests seeds synthetic databases for native tests. Its local fixture
adaptations were never installed by R117 and may differ or be absent on a VDS.
Keep the core's existing identity contract, including its tests, unchanged.
"""
DEVELOPMENT_ROOTS = ('core511-source/scripts/perf-r11/tests/',)


def deployable(name):
    return not name.startswith(DEVELOPMENT_ROOTS)
