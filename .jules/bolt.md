## 2024-03-03 - Cache ImageData in renderAdapter
**Learning:** In `src/api/renderAdapter.js`, the legacy rendering loop (`handleRender`) is highly sensitive to memory allocations. Re-creating `ImageData` objects using `createImageData` for every image chunk causes significant garbage collection overhead.
**Action:** Always prefer caching and reusing `ImageData` and `Uint8ClampedArray` objects by matching their dimensions across frames, only invoking `createImageData` when an unseen dimension combination is encountered.
## 2026-03-04 - Pre-allocate Uint8Array for WebSocket batching
**Learning:** Repeatedly creating `new Uint8Array(batchSize + 3)` within a high-frequency `setInterval` for WebSocket batching causes unnecessary garbage collection (GC) and memory allocation overhead. In Node and browser environments, pre-allocating a single, resizable buffer and using `.subarray()` is more efficient.
**Action:** When repeatedly sending batched binary data over WebSockets, pre-allocate a single `Uint8Array`, dynamically resize it only when needed, and copy chunks using `buffer.set()`. Send the data using `buffer.subarray()` to avoid allocating new arrays on every tick.
