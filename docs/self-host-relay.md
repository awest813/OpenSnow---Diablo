# Self-Hosting a Multiplayer Relay (WebSocket Transport)

This guide explains how to run a custom WebSocket relay endpoint and point the browser client to it.

> Note: DiabloWeb still defaults to PeerJS transport. WebSocket transport is intended as an operational fallback path when PeerJS signaling/connectivity is blocked.

---

## 1) Relay requirements

Your relay endpoint must:

- Accept secure WebSocket connections (`wss://...`) from browsers.
- Forward binary packet payloads bidirectionally between peers in a game session.
- Keep packet ordering intact.
- Handle disconnect/reconnect cleanly (close codes and stale peer cleanup).

Recommended baseline:

- TLS termination at reverse proxy (Nginx/Caddy/Traefik).
- Idle timeout >= 60s.
- Sticky routing (or single instance) per active session.
- Structured logs for `connect`, `disconnect`, `error`, `session`, `peer`.

---

## 2) Deployment topology

Typical production topology:

1. Browser clients connect to `wss://relay.example.com/ws`.
2. Reverse proxy terminates TLS and upgrades WebSocket traffic.
3. Relay service handles session fanout and peer lifecycle.
4. Optional observability stack ingests relay logs/metrics.

If you use autoscaling, ensure peer/session affinity or shared session state so reconnect behavior remains deterministic.

---

## 3) Client configuration

DiabloWeb can be pointed at a self-hosted relay via runtime options.

### Option A: URL query params (quick testing)

Use:

- `transport=websocket`
- `websocketUrl=wss://relay.example.com/ws`

Example:

```
https://your-hosted-diabloweb.example/?transport=websocket&websocketUrl=wss%3A%2F%2Frelay.example.com%2Fws
```

### Option B: Global runtime config (embedded deployment)

Set before mounting the app:

```html
<script>
  window.DIABLOWEB_MULTIPLAYER_OPTIONS = {
    kind: 'websocket',
    websocketUrl: 'wss://relay.example.com/ws',
  };
</script>
```

You can also set `kind: 'peerjs'` to force default behavior.

---

## 4) Operational checklist

- Verify websocket endpoint supports binary frames.
- Verify CORS/origin policy allows your DiabloWeb host.
- Validate reconnect flow by restarting a relay instance during a multiplayer session.
- Monitor:
  - active sessions
  - active peers
  - join rejects
  - disconnect reasons
  - handshake failures/version mismatch categories

---

## 5) Troubleshooting

- **Status stuck on connecting**  
  Check TLS cert validity, proxy upgrade headers, and relay URL.

- **Immediate failed status with protocol mismatch**  
  Ensure relay forwards raw binary packets unchanged.

- **Frequent retrying/failed transitions**  
  Inspect relay close codes and timeout settings; increase idle timeout and verify sticky routing.
