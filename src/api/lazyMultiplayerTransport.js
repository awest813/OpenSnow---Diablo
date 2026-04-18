export function createLazyMultiplayerTransport({createTransport}) {
  if (typeof createTransport !== 'function') {
    throw new TypeError('createTransport must be a function');
  }

  let activeTransport = null;

  function ensureTransport() {
    if (!activeTransport) {
      activeTransport = createTransport();
    }
    return activeTransport;
  }

  function disposeActiveTransport() {
    if (activeTransport && activeTransport.dispose) {
      activeTransport.dispose();
    }
    activeTransport = null;
  }

  return {
    send(packet) {
      ensureTransport().send(packet);
    },

    reconnect() {
      if (!activeTransport) {
        activeTransport = createTransport();
        return;
      }
      if (activeTransport.reconnect) {
        activeTransport.reconnect();
        return;
      }
      disposeActiveTransport();
      activeTransport = createTransport();
    },

    replace() {
      disposeActiveTransport();
      activeTransport = createTransport();
    },

    dispose() {
      disposeActiveTransport();
    },
  };
}
