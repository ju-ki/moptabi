/**
 * 地点情報（座標・ラベル・移動時間・最寄駅）の暗号化・復号
 * - 方式: AES-256-GCM（Web Crypto。Cloudflare Workers / Bun の両方で動作）
 * - 鍵: 環境変数 LOCATION_ENCRYPTION_KEY（32バイトをbase64にしたもの）
 * - 保存形式: `v1:<IVのbase64>:<暗号文+認証タグのbase64>`
 * エラーメッセージやログには平文・暗号文・鍵を含めないこと
 */

const CURRENT_VERSION = 'v1';
const KEY_BYTE_LENGTH = 32;
const IV_BYTE_LENGTH = 12;

export class LocationCipherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocationCipherError';
  }
}

export type LocationCipher = {
  encryptText: (plainText: string) => Promise<string>;
  decryptText: (encrypted: string) => Promise<string>;
  encryptJson: <T>(payload: T) => Promise<string>;
  decryptJson: <T = unknown>(encrypted: string) => Promise<T>;
};

const toBase64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64');
const fromBase64 = (value: string): Uint8Array<ArrayBuffer> => {
  const decoded = Buffer.from(value, 'base64');
  const bytes = new Uint8Array(decoded.length);
  bytes.set(decoded);
  return bytes;
};

/**
 * base64の鍵からCipherを作成する
 * @param base64Key 32バイトの鍵をbase64にした文字列
 */
export const createLocationCipher = (base64Key: string): LocationCipher => {
  const rawKey = fromBase64(base64Key);
  if (rawKey.length !== KEY_BYTE_LENGTH) {
    throw new LocationCipherError('LOCATION_ENCRYPTION_KEY must be 32 bytes encoded in base64');
  }

  const cryptoKeyPromise = crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);

  const encryptText = async (plainText: string): Promise<string> => {
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTE_LENGTH));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await cryptoKeyPromise,
      new TextEncoder().encode(plainText),
    );
    return `${CURRENT_VERSION}:${toBase64(iv)}:${toBase64(new Uint8Array(encrypted))}`;
  };

  const decryptText = async (encrypted: string): Promise<string> => {
    const [version, iv, body, ...rest] = encrypted.split(':');
    if (version !== CURRENT_VERSION || !iv || !body || rest.length > 0) {
      throw new LocationCipherError('Unsupported encrypted location format');
    }
    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromBase64(iv) },
        await cryptoKeyPromise,
        fromBase64(body),
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      throw new LocationCipherError('Failed to decrypt location data');
    }
  };

  return {
    encryptText,
    decryptText,
    encryptJson: async (payload) => encryptText(JSON.stringify(payload)),
    decryptJson: async (encrypted) => JSON.parse(await decryptText(encrypted)),
  };
};

// 鍵ごとにCipherをキャッシュする（importKeyを毎回呼ばないため）
const cipherCache = new Map<string, LocationCipher>();
// Workersのenvから設定された鍵（未設定ならprocess.envを使う）
let configuredKey: string | undefined;

/**
 * Cloudflare Workers の env から鍵を設定する（index.ts のミドルウェアから呼ぶ）
 */
export const configureLocationEncryptionKey = (key: string | undefined) => {
  if (key) {
    configuredKey = key;
  }
};

/**
 * 地点情報用のCipherを取得する
 * @param key 鍵（省略時は設定済みの鍵、なければ process.env.LOCATION_ENCRYPTION_KEY）
 */
export const getLocationCipher = (key?: string): LocationCipher => {
  const resolvedKey = key !== undefined ? key : (configuredKey ?? process.env.LOCATION_ENCRYPTION_KEY);
  if (!resolvedKey) {
    console.error('LOCATION_ENCRYPTION_KEY is not set');
    throw new LocationCipherError('LOCATION_ENCRYPTION_KEY is not set');
  }

  const cached = cipherCache.get(resolvedKey);
  if (cached) {
    return cached;
  }
  const cipher = createLocationCipher(resolvedKey);
  cipherCache.set(resolvedKey, cipher);
  return cipher;
};
