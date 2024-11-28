import { contextBridge, ipcRenderer } from 'electron';

// Define types for the API
type Channel = 'toMain' | 'fromMain';
type SendData = unknown;
type ReceiveCallback = (...args: unknown[]) => void;

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  send: (channel: Channel, data: SendData): void => {
    // whitelist channels
    const validChannels: Channel[] = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: Channel, func: ReceiveCallback): void => {
    const validChannels: Channel[] = ['fromMain'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` 
      ipcRenderer.on(channel, (_event, ...args) => func(...args));
    }
  },
});
