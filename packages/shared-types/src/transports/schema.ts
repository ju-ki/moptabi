import { z } from 'zod';

// 移動手段の種別(基本的にここをマスターとする)
export const TransportMethodEnum = z.enum(['DRIVING', 'TRANSIT', 'WALKING', 'BICYCLING', 'DEFAULT']);
export const StationTypeSchema = z.enum(['BUS', 'TRAIN', 'OTHER']);
export const TransportMethodIdEnum = z.number().int().min(0).max(4); // 0: DEFAULT, 1: WALKING, 2: BICYCLING, 3: DRIVING, 4: TRANSIT

// 移動情報のスキーマ
export const NextTransportSchema = z.object({
  transportMethodId: TransportMethodIdEnum,
  transportMethod: TransportMethodEnum,
  travelTime: z.number().int().min(0),
});
