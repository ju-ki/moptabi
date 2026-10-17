/**
 * UserLocation / PlanLocation / 最寄駅 の秘匿項目を暗号化・復号するヘルパー
 * - 書き込み: 秘匿項目をまとめて暗号化し、encryptedData / encryptedPlaceId に保存する
 * - 読み出し: encryptedData があれば復号し、無ければ平文カラムを使う（No.168 フェーズ1の移行期間のみ）
 */
import { z } from 'zod';

import { LocationCipher, LocationCipherError } from './locationCipher';

const UserLocationSecretSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  label: z.string().nullable(),
});
export type UserLocationSecret = z.infer<typeof UserLocationSecretSchema>;

const PlanLocationSecretSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  travelTime: z.number(),
  // 目的地の行のみ: travelTime を移し替えた元の最後のスポットのID（読み出し時に戻す先）
  lastSpotId: z.string().optional(),
});
export type PlanLocationSecret = z.infer<typeof PlanLocationSecretSchema>;

type UserLocationRow = {
  encryptedData: string | null;
  latitude: number | null;
  longitude: number | null;
  label: string | null;
};

type PlanLocationRow = {
  encryptedData: string | null;
  latitude: number | null;
  longitude: number | null;
  travelTime: number | null;
};

type NearestStationRow = {
  encryptedPlaceId: string | null;
  placeId: string | null;
};

const parseSecret = async <T>(cipher: LocationCipher, encrypted: string, schema: z.ZodType<T>): Promise<T> => {
  const result = schema.safeParse(await cipher.decryptJson(encrypted));
  if (!result.success) {
    throw new LocationCipherError('Decrypted location data has an unexpected shape');
  }
  return result.data;
};

export const encryptUserLocationSecret = (cipher: LocationCipher, secret: UserLocationSecret) =>
  cipher.encryptJson<UserLocationSecret>({
    latitude: secret.latitude,
    longitude: secret.longitude,
    label: secret.label,
  });

export const decryptUserLocationSecret = async (
  cipher: LocationCipher,
  row: UserLocationRow,
): Promise<UserLocationSecret> => {
  if (row.encryptedData) {
    return parseSecret(cipher, row.encryptedData, UserLocationSecretSchema);
  }
  // 一括変換前の平文データ
  return { latitude: row.latitude ?? 0, longitude: row.longitude ?? 0, label: row.label ?? null };
};

export const encryptPlanLocationSecret = (cipher: LocationCipher, secret: PlanLocationSecret) =>
  cipher.encryptJson<PlanLocationSecret>({
    latitude: secret.latitude,
    longitude: secret.longitude,
    travelTime: secret.travelTime,
    ...(secret.lastSpotId ? { lastSpotId: secret.lastSpotId } : {}),
  });

export const decryptPlanLocationSecret = async (
  cipher: LocationCipher,
  row: PlanLocationRow,
): Promise<PlanLocationSecret & { isEncrypted: boolean }> => {
  if (row.encryptedData) {
    return { ...(await parseSecret(cipher, row.encryptedData, PlanLocationSecretSchema)), isEncrypted: true };
  }
  // 一括変換前の平文データ
  return {
    latitude: row.latitude ?? 0,
    longitude: row.longitude ?? 0,
    travelTime: row.travelTime ?? 0,
    isEncrypted: false,
  };
};

export const encryptPlaceId = (cipher: LocationCipher, placeId: string) => cipher.encryptText(placeId);

export const decryptPlaceId = async (cipher: LocationCipher, row: NearestStationRow): Promise<string> => {
  if (row.encryptedPlaceId) {
    return cipher.decryptText(row.encryptedPlaceId);
  }
  // 一括変換前の平文データ
  return row.placeId ?? '';
};
