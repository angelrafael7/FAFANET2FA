// test.js - Execute: node test.js
const crypto = require('crypto');

function generateTOTP(secret) {
    // Base32 para bytes
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    secret = secret.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
    
    let bits = 0;
    let value = 0;
    const key = [];
    
    for (let i = 0; i < secret.length; i++) {
        const char = secret.charAt(i);
        const index = base32Chars.indexOf(char);
        if (index === -1) continue;
        
        value = (value << 5) | index;
        bits += 5;
        
        if (bits >= 8) {
            key.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    
    if (bits > 0) {
        key.push((value << (8 - bits)) & 0xff);
    }
    
    // Calcular contador
    const time = Math.floor(Date.now() / 1000);
    const counter = Math.floor(time / 30);
    
    // Converter contador para bytes
    const counterBytes = Buffer.alloc(8);
    counterBytes.writeBigInt64BE(BigInt(counter), 0);
    
    // HMAC-SHA1
    const hmac = crypto.createHmac('sha1', Buffer.from(key));
    hmac.update(counterBytes);
    const hmacResult = hmac.digest();
    
    // Obter offset
    const offset = hmacResult[hmacResult.length - 1] & 0x0f;
    
    // Extrair código
    const code = (
        ((hmacResult[offset] & 0x7f) << 24) |
        ((hmacResult[offset + 1] & 0xff) << 16) |
        ((hmacResult[offset + 2] & 0xff) << 8) |
        (hmacResult[offset + 3] & 0xff)
    ) % 1000000;
    
    return code.toString().padStart(6, '0');
}

// Testar
console.log('==========================================');
console.log('TESTE DO ALGORITMO FAFANET 2FA');
console.log('==========================================');
console.log('Chave: 7J64V3P3E77J3LKNUGSZ5QANTLRLTKVL');
console.log('Código gerado:', generateTOTP('7J64V3P3E77J3LKNUGSZ5QANTLRLTKVL'));
console.log('Horário atual:', new Date().toISOString());
console.log('==========================================');
console.log('\n🔄 Abra https://2fa.zone/ e cole a mesma chave');
console.log('✅ Os códigos DEVEM ser IDÊNTICOS');