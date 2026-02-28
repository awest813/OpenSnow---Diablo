# DiabloWeb System Diagrams (Phase 0)

These diagrams expand the Phase 0 baseline with concrete flows for boot, worker lifecycle, and multiplayer handshake.

## App Boot and Engine Startup

```mermaid
sequenceDiagram
  participant U as User
  participant I as index.js
  participant A as App.js
  participant L as api/loader.js
  participant W as api/game.worker.js

  U->>I: Open app
  I->>A: Mount React app
  A->>A: Initialize UI/input state
  A->>L: Start session
  L->>W: Create worker + initialize runtime
  W-->>L: Ready / init events
  L-->>A: Runtime handles + callbacks
  A-->>U: Game canvas and controls available
```

## Worker Lifecycle Contract (Current Behavior)

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Starting: start() invoked
  Starting --> Running: worker init/ready
  Running --> Running: render/audio/network/fs events
  Running --> Stopping: session stop / reset
  Stopping --> Idle: terminate worker + cleanup listeners
  Running --> Error: runtime exception
  Error --> Stopping: propagate fatal error
```

## Multiplayer Join Handshake (Abstracted)

```mermaid
sequenceDiagram
  participant Host as Host Client
  participant T as Transport Adapter
  participant Joiner as Joiner Client

  Host->>T: Advertise/listen
  Joiner->>T: Connect using session id
  T-->>Host: Join request
  Host-->>T: Accept/Reject
  alt Accepted
    T-->>Joiner: Connected
    Host-->>Joiner: Sync game/session state
  else Rejected
    T-->>Joiner: Rejected reason
  end
```

## Storage Interaction Path

```mermaid
flowchart LR
  UI[App UI actions] --> FS[src/fs.js API]
  FS --> DB[(IndexedDB / idb-kv-store)]
  FS --> Loader[src/api/loader.js callbacks]
  Loader --> Worker[src/api/game.worker.js]
```
