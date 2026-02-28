import createFileDropTarget from './fileDropTarget';

describe('fileDropTarget', () => {
  it('attaches and detaches drag/drop listeners once', () => {
    const calls = [];
    const target = {
      addEventListener: (...args) => calls.push(['add', ...args]),
      removeEventListener: (...args) => calls.push(['remove', ...args]),
    };

    const handlers = {
      onDrop: () => {},
      onDragOver: () => {},
      onDragEnter: () => {},
      onDragLeave: () => {},
    };

    const fileDropTarget = createFileDropTarget({ target, ...handlers });

    fileDropTarget.attach();
    fileDropTarget.attach();
    fileDropTarget.detach();
    fileDropTarget.detach();

    expect(calls).toEqual([
      ['add', 'drop', handlers.onDrop, true],
      ['add', 'dragover', handlers.onDragOver, true],
      ['add', 'dragenter', handlers.onDragEnter, true],
      ['add', 'dragleave', handlers.onDragLeave, true],
      ['remove', 'drop', handlers.onDrop, true],
      ['remove', 'dragover', handlers.onDragOver, true],
      ['remove', 'dragenter', handlers.onDragEnter, true],
      ['remove', 'dragleave', handlers.onDragLeave, true],
    ]);
  });
});
