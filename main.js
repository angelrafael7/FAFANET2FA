const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('path');
const crypto = require('crypto');

// ==================== ALGORITMO TOTP DO SEU app.js ORIGINAL ====================
// COPIEI EXATAMENTE do seu app.js que funcionava

class TOTPGenerator {
    generate(secretKey) {
        try {
            // Converter Base32 para Buffer
            const key = this.base32ToBytes(secretKey);
            
            // Calcular tempo atual em intervalos de 30 segundos
            const time = Math.floor(Date.now() / 1000 / 30);
            
            // Converter tempo para buffer (8 bytes, big endian)
            const timeBuffer = Buffer.alloc(8);
            timeBuffer.writeBigInt64BE(BigInt(time), 0);
            
            // Calcular HMAC-SHA1
            const hmac = crypto.createHmac('sha1', Buffer.from(key));
            hmac.update(timeBuffer);
            const hmacResult = hmac.digest();
            
            // Obter offset (últimos 4 bits do último byte)
            const offset = hmacResult[hmacResult.length - 1] & 0x0f;
            
            // Extrair 4 bytes do offset
            const code = (
                ((hmacResult[offset] & 0x7f) << 24) |
                ((hmacResult[offset + 1] & 0xff) << 16) |
                ((hmacResult[offset + 2] & 0xff) << 8) |
                (hmacResult[offset + 3] & 0xff)
            ) % 1000000;
            
            return code.toString().padStart(6, '0');
        } catch (error) {
            return '000000';
        }
    }
    
    base32ToBytes(base32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        base32 = base32.toUpperCase().replace(/=+$/, '');
        
        let bits = 0;
        let value = 0;
        const output = [];
        
        for (let i = 0; i < base32.length; i++) {
            const char = base32.charAt(i);
            const index = chars.indexOf(char);
            if (index === -1) continue;
            
            value = (value << 5) | index;
            bits += 5;
            
            if (bits >= 8) {
                output.push((value >>> (bits - 8)) & 0xff);
                bits -= 8;
            }
        }
        
        return output;
    }
}

const totpGenerator = new TOTPGenerator();

// ==================== TESTE: VERIFICAR SE GERA O MESMO CÓDIGO ====================
function testTOTP() {
    const testKey = 'JBSWY3DPEHPK3PXP';
    const code = totpGenerator.generate(testKey);
    console.log('=== TESTE TOTP ===');
    console.log('Chave:', testKey);
    console.log('Código gerado:', code);
    console.log('Agora vá para https://2fa.zone/');
    console.log('Cole a mesma chave e compare!');
    console.log('Os códigos DEVEM ser IGUAIS!');
}

// Executar teste ao iniciar
testTOTP();

// ==================== IPC HANDLERS ====================
ipcMain.on('generate-code', (event, secret) => {
    const code = totpGenerator.generate(secret);
    console.log(`[Backend] Código ${code} para ${secret.substring(0, 10)}...`);
    event.sender.send('code-result', code);
});

ipcMain.on('copy-code', (event, code) => {
    clipboard.writeText(code);
    console.log(`[Backend] Código ${code} copiado`);
});

// ==================== JANELA PRINCIPAL ====================
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        show: true,
        backgroundColor: '#0f0f23',
        autoHideMenuBar: true,
        frame: true,
        icon: path.join(__dirname, 'icon.ico')
    });

    mainWindow.loadFile('index.html');
    
    // Para debug
    mainWindow.webContents.openDevTools();
    
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ==================== INICIAR APP ====================
app.whenReady().then(() => {
    console.log('FAFANET 2FA - Backend com TOTP Correto');
    createWindow();
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});