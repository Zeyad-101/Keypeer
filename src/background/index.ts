import { handleMessage } from './keypeerController';
import type { KeypeerMessage } from '../messaging/protocol';

chrome.runtime.onMessage.addListener(
  (message: KeypeerMessage, _sender, sendResponse) => {
    handleMessage(message)
      .then((response) => {
        sendResponse(response);
      })
      .catch((err) => {
        sendResponse({
          success: false,
          error: err?.message || 'Internal service worker error',
        });
      });
    return true; // Keeps the message channel open for asynchronous sendResponse
  }
);
