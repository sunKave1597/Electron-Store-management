const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getProducts: () => ipcRenderer.invoke('get-products'),
    addProduct: (name, quantity, price) => ipcRenderer.invoke('add-product', name, quantity, price),
    deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
    getIncome: () => ipcRenderer.invoke('get-income'),
    addIncome: (incomeDate, incomeItem, incomeAmount, billNumber ) => ipcRenderer.invoke('add-income', incomeDate, incomeItem, incomeAmount, billNumber),
    deleteIncome: (id) => ipcRenderer.invoke('delete-income', id),
});