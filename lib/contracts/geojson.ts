import { z } from "zod";

const positionSchema = z.array(z.number().finite()).min(2);

function coordinatesAreFinite(value: unknown): boolean {
  if (!Array.isArray(value) || !value.length) return false;
  if (value.every((item) => typeof item === "number")) {
    return value.length >= 2 && value.every(Number.isFinite);
  }
  return value.every(coordinatesAreFinite);
}

const geometrySchema = z
  .object({
    type: z.string().min(1),
    coordinates: z.unknown(),
  })
  .passthrough()
  .refine((geometry) => coordinatesAreFinite(geometry.coordinates), {
    message: "Geometry coordinates must be finite coordinate arrays.",
  });

export const geoJsonFeatureSchema = z
  .object({
    type: z.literal("Feature"),
    id: z.union([z.string(), z.number()]).optional(),
    geometry: geometrySchema.nullable(),
    properties: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough();

export const geoJsonFeatureCollectionSchema = z
  .object({
    type: z.literal("FeatureCollection"),
    features: z.array(geoJsonFeatureSchema),
  })
  .passthrough();

export const featureCollectionContract =
  geoJsonFeatureCollectionSchema as z.ZodType<GeoJSON.FeatureCollection>;

export const pointGeometrySchema = z.object({
  type: z.literal("Point"),
  coordinates: positionSchema.length(2),
});
