#!/usr/bin/env node
/**
 * DocVault License Key Generator
 *
 * Generates offline-verifiable license keys for DocVault.
 * Keys are validated inside the app using the same SHA-256 algorithm
 * implemented in src-tauri/src/commands/license.rs — no network call needed.
 *
 * Key format:  AAAAA-BBBBB-CCCCC-DDDDD-CHECK
 *   - Groups 1-4 : cryptographically random base-36 characters (0-9, A-Z)
 *   - Group 5    : SHA-256(SECRET + groups 1-4), first 4 bytes encoded as base-36
 *
 * No dependencies — requires only Node.js ≥ 14.10 (built-in crypto module).
 *
 * Usage:
 *   node keygen.js          # generate 1 key
 *   node keygen.js 10       # generate 10 keys
 *
 *   npm start               # generate 1 key (via package.json)
 *   npm run gen             # same as above
 */

'use strict';
const crypto = require('crypto');

const SECRET = 'docvault-license-secret-v1';
const BASE36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const GROUP_SIZE = 5;
const MAX = Math.pow(36, GROUP_SIZE); // 60466176

function toBase36(n, len) {
    const result = new Array(len).fill('0');
    for (let i = len - 1; i >= 0; i--) {
        result[i] = BASE36[n % 36];
        n = Math.floor(n / 36);
    }
    return result.join('');
}

function randomGroup() {
    // crypto.randomInt is crypto-safe and available since Node 14.10
    return toBase36(crypto.randomInt(MAX), GROUP_SIZE);
}

function computeCheck(data) {
    const hash = crypto.createHash('sha256')
        .update(SECRET, 'ascii')
        .update(data, 'ascii')
        .digest();
    const n = hash.readUInt32BE(0);
    return toBase36(n, GROUP_SIZE);
}

function generateKey() {
    const groups = Array.from({ length: 4 }, randomGroup);
    const data = groups.join('-');
    return `${data}-${computeCheck(data)}`;
}

const count = parseInt(process.argv[2], 10) || 1;
if (isNaN(count) || count < 1) {
    console.error('Usage: node keygen.js [count]');
    process.exit(1);
}

console.log('DocVault License Key Generator');
console.log('================================');
for (let i = 0; i < count; i++) {
    console.log(generateKey());
}
