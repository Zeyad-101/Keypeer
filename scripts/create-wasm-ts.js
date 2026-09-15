import fs from 'fs';
import path from 'path';

const wasmPath = path.resolve('node_modules/argon2-browser/dist/argon2.wasm');
const b64 = fs.readFileSync(wasmPath).toString('base64');
const target = path.resolve('src/crypto/wasmBinary.ts');

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `// Embedded 25KB Argon2 WebAssembly binary for offline, zero-network execution\nexport const ARGON2_WASM_BASE64 = ${JSON.stringify(b64)};\n`);
console.log('Successfully created src/crypto/wasmBinary.ts');
