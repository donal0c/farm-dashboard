import { z } from "zod";

export type CapCountyAggregate = {
  county: string;
  beneficiaries: number;
  totalPayment: number;
};

export const capCountyAggregateSchema = z.object({
  county: z.string().min(1),
  beneficiaries: z.number().int().nonnegative(),
  totalPayment: z.number().finite().nonnegative(),
});

export const capRowsSchema = z.array(
  z
    .object({
      co: z.string().optional(),
      z: z.union([z.number(), z.string()]).optional(),
    })
    .passthrough(),
);
