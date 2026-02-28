export default function createEventListeners(bindings) {
  let attached = false;

  function attach() {
    if (attached) return;
    bindings.forEach(({ target, event, handler, options }) => {
      target.addEventListener(event, handler, options);
    });
    attached = true;
  }

  function detach() {
    if (!attached) return;
    bindings.forEach(({ target, event, handler, options }) => {
      target.removeEventListener(event, handler, options);
    });
    attached = false;
  }

  return { attach, detach };
}
