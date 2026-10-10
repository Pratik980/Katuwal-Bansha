// src/utils/toastOnce.js
// One failed request used to show the same error two or three times, because
// several places report it. Giving a toast its own text as its id makes
// react-hot-toast show identical messages once.
import toast from 'react-hot-toast';

['error', 'success'].forEach((kind) => {
  const show = toast[kind];
  toast[kind] = (message, options) =>
    show(message, typeof message === 'string' ? { id: `${kind}:${message}`, ...options } : options);
});
