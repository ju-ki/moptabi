/**
 * UserLocation / PlanLocation / 最寄駅 の秘匿項目を暗号化・復号するヘルパー
 * - 書き込み: 秘匿項目をまとめて暗号化し、encryptedData / encryptedPlaceId に保存する
 * - 読み出し: encryptedData / encryptedPlaceId を復号する
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

type EncryptedLocationRow = {
  encryptedData: string;
};

type NearestStationRow = {
  encryptedPlaceId: string;
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
  row: EncryptedLocationRow,
): Promise<UserLocationSecret> => parseSecret(cipher, row.encryptedData, UserLocationSecretSchema);

export const encryptPlanLocationSecret = (cipher: LocationCipher, secret: PlanLocationSecret) =>
  cipher.encryptJson<PlanLocationSecret>({
    latitude: secret.latitude,
    longitude: secret.longitude,
    travelTime: secret.travelTime,
    ...(secret.lastSpotId ? { lastSpotId: secret.lastSpotId } : {}),
  });

export const decryptPlanLocationSecret = async (
  cipher: LocationCipher,
  row: EncryptedLocationRow,
): Promise<PlanLocationSecret> => parseSecret(cipher, row.encryptedData, PlanLocationSecretSchema);

export const encryptPlaceId = (cipher: LocationCipher, placeId: string) => cipher.encryptText(placeId);

export const decryptPlaceId = (cipher: LocationCipher, row: NearestStationRow): Promise<string> =>
  cipher.decryptText(row.encryptedPlaceId);
