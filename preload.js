const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getProducts: () => ipcRenderer.invoke('get-products'),
    addProduct: (name, quantity, price) => ipcRenderer.invoke('add-product', name, quantity, price),
    deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
});