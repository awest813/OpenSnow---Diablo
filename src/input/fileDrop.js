export function isDropFile(e) {
  if (e.dataTransfer.items) {
    for (let i = 0; i < e.dataTransfer.items.length; ++i) {
      if (e.dataTransfer.items[i].kind === 'file') {
        return true;
      }
    }
  }

  return e.dataTransfer.files.length > 0;
}

export function getDropFile(e) {
  if (e.dataTransfer.items) {
    for (let i = 0; i < e.dataTransfer.items.length; ++i) {
      if (e.dataTransfer.items[i].kind === 'file') {
        return e.dataTransfer.items[i].getAsFile();
      }
    }
  }

  return e.dataTransfer.files[0];
}
