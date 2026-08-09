import { z } from 'zod';
import { NextTransportSchema, StationTypeSchema, TransportMethodEnum, TransportMethodIdEnum } from './schema';

export type TransportMethodType = z.infer<typeof TransportMethodEnum>;
export type StationTypeType = z.infer<typeof StationTypeSchema>;
export type TransportMethodIdType = z.infer<typeof TransportMethodIdEnum>;
export type NextTransportType = z.infer<typeof NextTransportSchema>;
// 移動手段とIDを紐づけたマッピング
export const TransportMethodIdMapping: Record<number, TransportMethodType> = {
  0: 'DEFAULT',
  1: 'WALKING',
  2: 'BICYCLING',
  3: 'DRIVING',
  4: 'TRANSIT',
};
