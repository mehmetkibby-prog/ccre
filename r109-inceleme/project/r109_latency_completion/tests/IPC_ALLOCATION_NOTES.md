# R108 bounded IPC allocation change

Selected production change: only outgoing `ProcessStream._write` stops cloning a
Buffer immediately before Node's advanced IPC serializer clones it. The Writable
write callback remains the ownership boundary; send/EOF/corked ordering and
backpressure are unchanged. Incoming bytes still copy, preserving slab lifetime
and isolation from other message listeners. No reusable shared buffer is added.

Pinned Node v22.23.4 `internal/child_process/serialization` synchronously runs
`ser.writeValue(message)`, obtains its owned `serializedMessage`, and sends that.
An asynchronous write retains that serializedMessage on the request. Therefore
caller mutation after the stream write callback cannot alter the sent snapshot.

Regression: `ipc-owned-buffer.test.mjs` uses an actual advanced-serialization
child process. It queues 32 large, offset Buffer slices, forces backpressure,
mutates every caller buffer immediately in its write callback, and checks exact
ordered echoed frames and EOF. Six tests including existing cork/EOF/disconnect
and frame-byte checks passed in 460 ms. Evidence:
`evidence/ipc-outgoing-owned-buffer-tests.log`.

Short real IPC echo benchmark: 3 alternating repetitions, 1000 round trips each,
64 KiB per message. Parent CPU and GC only; not a production capacity result.

| Variant | Elapsed median ms | Parent CPU median ms | Parent GC median ms |
|---|---:|---:|---:|
| Previous R107 | 295.41 | 187.51 | 7.14 |
| Selected outgoing-only | 176.34 | 91.11 | 6.18 |
| Experimental both directions | 171.26 | 79.00 | 7.20 |

Incoming zero-copy saves additional allocation but can retain larger coalesced
IPC read slabs. It was rejected; the small elapsed improvement does not justify
altering incoming lifetime. Both-direction experiment lives only under evidence.
Raw results: `evidence/ipc-copy-variants.json`; this benchmark is not a game load
or proof that 30/40-player stalls are solved. Parent coordinates those tests.

Previous R107 profile also contained synthetic gateway cost: writeBuffer had
~780.9 ms in ProcessStream -> TCP browser forwarding and ~108.5 ms TCP ->
ProcessStream, versus ~374 ms total child-process serialization writeBuffer.
The production channels have direct listeners; parent is correcting load realism.
Do not describe removing this fixture proxy as a production game optimization.
