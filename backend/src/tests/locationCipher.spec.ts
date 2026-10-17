import { describe, expect, it } from 'vitest';

import { createLocationCipher, getLocationCipher, LocationCipherError } from '@/lib/locationCipher';

// テスト用の鍵（32バイトをbase64にしたもの）
const TEST_KEY = Buffer.alloc(32, 1).toString('base64');
const OTHER_KEY = Buffer.alloc(32, 2).toString('base64');

describe('locationCipher', () => {
  it('JSONを暗号化して復号すると元の値に戻る', async () => {
    const cipher = createLocationCipher(TEST_KEY);
    const payload = { latitude: 35.6895, longitude: 139.6917, label: '自宅' };

    const encrypted = await cipher.encryptJson(payload);
    const decrypted = await cipher.decryptJson(encrypted);

    expect(decrypted).toEqual(payload);
  });

  it('文字列を暗号化して復号すると元の値に戻る', async () => {
    const cipher = createLocationCipher(TEST_KEY);

    const encrypted = await cipher.encryptText('ChIJxxxxxxxxxxxx');
    const decrypted = await cipher.decryptText(encrypted);

    expect(decrypted).toBe('ChIJxxxxxxxxxxxx');
  });

  it('暗号文はv1:IV:本文の形式で、平文の値を含まない', async () => {
    const cipher = createLocationCipher(TEST_KEY);

    const encrypted = await cipher.encryptJson({ latitude: 35.6895, longitude: 139.6917 });

    expect(encrypted).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
    expect(encrypted).not.toContain('35.6895');
    expect(encrypted).not.toContain('139.6917');
  });

  it('同じ値でも暗号化のたびに違う暗号文になる', async () => {
    const cipher = createLocationCipher(TEST_KEY);
    const payload = { latitude: 35.6895, longitude: 139.6917 };

    const first = await cipher.encryptJson(payload);
    const second = await cipher.encryptJson(payload);

    expect(first).not.toBe(second);
  });

  it('改ざんされた暗号文は復号できない', async () => {
    const cipher = createLocationCipher(TEST_KEY);
    const encrypted = await cipher.encryptText('secret');
    const [version, iv, body] = encrypted.split(':');
    const tamperedBody = (body[0] === 'A' ? 'B' : 'A') + body.slice(1);

    await expect(cipher.decryptText(`${version}:${iv}:${tamperedBody}`)).rejects.toThrow(LocationCipherError);
  });

  it('違う鍵では復号できない', async () => {
    const encrypted = await createLocationCipher(TEST_KEY).encryptText('secret');

    await expect(createLocationCipher(OTHER_KEY).decryptText(encrypted)).rejects.toThrow(LocationCipherError);
  });

  it('未対応のバージョンや形式の暗号文は復号できない', async () => {
    const cipher = createLocationCipher(TEST_KEY);

    await expect(cipher.decryptText('v2:aaaa:bbbb')).rejects.toThrow(LocationCipherError);
    await expect(cipher.decryptText('not-encrypted')).rejects.toThrow(LocationCipherError);
  });

  it('鍵が32バイトでない場合はエラーになる', () => {
    expect(() => createLocationCipher(Buffer.alloc(16, 1).toString('base64'))).toThrow(LocationCipherError);
  });

  it('鍵が未設定の場合はエラーになる', () => {
    expect(() => getLocationCipher('')).toThrow(LocationCipherError);
  });

  it('getLocationCipherは環境変数の鍵を使う', async () => {
    const encrypted = await getLocationCipher().encryptText('secret');

    expect(await createLocationCipher(process.env.LOCATION_ENCRYPTION_KEY as string).decryptText(encrypted)).toBe(
      'secret',
    );
  });
});
