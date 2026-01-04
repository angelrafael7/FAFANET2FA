const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

// Verificar sistema operacional
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

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

// Interface de linha de comando interativa
class CLIApp {
    constructor() {
        this.totp = new TOTPGenerator();
        this.keysFile = path.join(__dirname, '2fa-keys.json');
        this.loadKeys();
    }
    
    loadKeys() {
        try {
            if (fs.existsSync(this.keysFile)) {
                this.keys = JSON.parse(fs.readFileSync(this.keysFile, 'utf8'));
            } else {
                this.keys = {};
            }
        } catch {
            this.keys = {};
        }
    }
    
    saveKeys() {
        fs.writeFileSync(this.keysFile, JSON.stringify(this.keys, null, 2));
    }
    
    addKey(name, key) {
        this.keys[name] = key;
        this.saveKeys();
        console.log(`Chave "${name}" salva com sucesso!`);
    }
    
    listKeys() {
        console.log('\n=== Chaves Salvas ===');
        Object.keys(this.keys).forEach((name, index) => {
            console.log(`${index + 1}. ${name}: ${this.keys[name].substring(0, 10)}...`);
        });
        console.log('=====================\n');
    }
    
    generateCode(key) {
        const code = this.totp.generate(key);
        const timeLeft = 30 - (Math.floor(Date.now() / 1000) % 30);
        
        console.log('\n' + '='.repeat(40));
        console.log('CÓDIGO 2FA:');
        console.log(' '.repeat(10) + code);
        console.log(`Tempo restante: ${timeLeft}s`);
        console.log('='.repeat(40));
        
        // Copiar para clipboard automaticamente
        this.copyToClipboard(code);
    }
    
    copyToClipboard(text) {
        const command = isWindows ? 
            `echo ${text} | clip` : 
            isMac ? 
                `echo "${text}" | pbcopy` : 
                `echo "${text}" | xclip -selection clipboard`;
        
        exec(command, (error) => {
            if (!error) {
                console.log('Código copiado para área de transferência!');
            }
        });
    }
    
    start() {
        console.clear();
        console.log('╔══════════════════════════════════════╗');
        console.log('║       GERADOR 2FA - DESKTOP          ║');
        console.log('╚══════════════════════════════════════╝\n');
        
        this.showMenu();
    }
    
    showMenu() {
        console.log('1. Gerar código para chave existente');
        console.log('2. Adicionar nova chave');
        console.log('3. Listar chaves salvas');
        console.log('4. Sair');
        console.log('\nEscolha uma opção: ');
        
        process.stdin.once('data', (data) => {
            const choice = data.toString().trim();
            
            switch(choice) {
                case '1':
                    this.generateForSavedKey();
                    break;
                case '2':
                    this.addNewKey();
                    break;
                case '3':
                    this.listKeys();
                    setTimeout(() => this.showMenu(), 2000);
                    break;
                case '4':
                    console.log('Até logo!');
                    process.exit();
                    break;
                default:
                    console.log('Opção inválida!');
                    setTimeout(() => this.showMenu(), 1000);
            }
        });
    }
    
    generateForSavedKey() {
        if (Object.keys(this.keys).length === 0) {
            console.log('Nenhuma chave salva. Adicione uma primeiro.');
            setTimeout(() => this.showMenu(), 2000);
            return;
        }
        
        this.listKeys();
        console.log('Digite o número da chave ou 0 para voltar: ');
        
        process.stdin.once('data', (data) => {
            const choice = parseInt(data.toString().trim());
            
            if (choice === 0) {
                this.showMenu();
                return;
            }
            
            const keyNames = Object.keys(this.keys);
            if (choice > 0 && choice <= keyNames.length) {
                const selectedKey = this.keys[keyNames[choice - 1]];
                this.generateCode(selectedKey);
                
                // Atualizar a cada 30 segundos
                console.log('\nPressione Ctrl+C para parar...');
                
                const interval = setInterval(() => {
                    const newCode = this.totp.generate(selectedKey);
                    const timeLeft = 30 - (Math.floor(Date.now() / 1000) % 30);
                    console.log(`\rCódigo: ${newCode} | Tempo: ${timeLeft}s`);
                }, 1000);
                
                // Parar com Ctrl+C
                process.on('SIGINT', () => {
                    clearInterval(interval);
                    console.log('\n\nVoltando ao menu...');
                    setTimeout(() => this.showMenu(), 1000);
                });
                
            } else {
                console.log('Opção inválida!');
                setTimeout(() => this.showMenu(), 1000);
            }
        });
    }
    
    addNewKey() {
        console.log('Digite um nome para esta chave: ');
        
        process.stdin.once('data', (nameData) => {
            const name = nameData.toString().trim();
            
            console.log('Digite a chave Base32: ');
            
            process.stdin.once('data', (keyData) => {
                const key = keyData.toString().trim().toUpperCase();
                
                // Validar Base32
                if (!/^[A-Z2-7]+=*$/i.test(key)) {
                    console.log('Chave inválida! Base32 usa apenas A-Z e 2-7.');
                    setTimeout(() => this.showMenu(), 2000);
                    return;
                }
                
                this.addKey(name, key);
                setTimeout(() => this.showMenu(), 2000);
            });
        });
    }
}

// Iniciar aplicativo
const app = new CLIApp();
app.start();