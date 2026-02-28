export default function createFileDropTarget({
  target,
  onDrop,
  onDragOver,
  onDragEnter,
  onDragLeave,
  capture = true,
}) {
  let attached = false;

  const listeners = [
    ['drop', onDrop],
    ['dragover', onDragOver],
    ['dragenter', onDragEnter],
    ['dragleave', onDragLeave],
  ];

  function attach() {
    if (attached) return;
    listeners.forEach(([event, handler]) => target.addEventListener(event, handler, capture));
    attached = true;
  }

  function detach() {
    if (!attached) return;
    listeners.forEach(([event, handler]) => target.removeEventListener(event, handler, capture));
    attached = false;
  }

  return { attach, detach };
}
