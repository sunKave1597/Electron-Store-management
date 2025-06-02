const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getProducts: () => ipcRenderer.invoke('get-products'),
    addProduct: (name, quantity, price) => ipcRenderer.invoke('add-product', name, quantity, price),
    deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
    createBill: (billData) => ipcRenderer.invoke('create-bill', billData),
    getBills: () => ipcRenderer.invoke('get-bills'),
    getBillItems: (billId) => ipcRenderer.invoke('get-bill-items', billId)
});