import createFs from './fs';

const fsPromise = createFs();

window.addEventListener('message', async ({ data, source }) => {
  switch (data?.method) {
    case 'transfer': {
      if (!source?.postMessage) return;
      const { files } = await fsPromise;
      source.postMessage({ method: 'storage', files }, '*');
      break;
    }
    case 'clear': {
      const { clear } = await fsPromise;
      clear();
      break;
    }
    default:
      break;
  }
});
