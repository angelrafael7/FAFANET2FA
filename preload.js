
const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para a página web
contextBridge.exposeInMainWorld('electronAPI', {
    // Funções básicas
    generateCode: (secret) => ipcRenderer.send('generate-code', secret),
    copyToClipboard: (text) => ipcRenderer.send('copy-code', text),
    
    // Gerenciamento de contas
    getAccounts: () => ipcRenderer.invoke('get-accounts'),
    saveAccount: (account) => ipcRenderer.invoke('save-account', account),
    deleteAccount: (accountName) => ipcRenderer.invoke('delete-account', accountName),
    generateTOTP: (secret) => ipcRenderer.invoke('generate-totp', secret),
    
    // Eventos
    onCodeResult: (callback) => {
        ipcRenderer.on('code-result', (event, code) => callback(code));
    },
    
    // Remover listeners (importante para evitar memory leaks)
    removeCodeResultListener: () => {
        ipcRenderer.removeAllListeners('code-result');
    }
});
