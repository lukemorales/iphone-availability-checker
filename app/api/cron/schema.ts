import { z } from "zod";

const store = z.object({
  storeName: z.string(),
  storeDistanceWithUnit: z.string(),
  makeReservationUrl: z.string().url(),
  reservationUrl: z.string().url(),
  partsAvailability: z.record(
    z.string(),
    z.object({
      storePickEligible: z.boolean(),
      pickupDisplay: z.enum(["available", "unavailable"]),
      partNumber: z.string(),
    })
  ),
});

export const response = z.object({
  body: z.object({
    content: z.object({
      pickupMessage: z.object({ stores: z.array(store) }),
    }),
  }),
});
