import { exhaustive } from "exhaustive";
import { NextResponse } from "next/server";
import { z } from "zod";

export const config = {
  runtime: "edge",
};

const appleResponse = z.object({
  body: z.object({
    content: z.object({
      pickupMessage: z.object({
        stores: z.array(
          z.object({
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
          })
        ),
      }),
    }),
  }),
});

const IPHONE_MODELS = ["MU693LL/A", "MU6E3LL/A", "MU6J3LL/A"] as const;

const [
  BLUE_TITANIUM_IPHONE_15_PRO_MAX_256,
  BLUE_TITANIUM_IPHONE_15_PRO_MAX_512,
  BLUE_TITANIUM_IPHONE_15_PRO_MAX_1024,
] = IPHONE_MODELS;

const LOCATION = "Chicago, IL";

function missingEnv(name: string): never {
  throw new Error(`Missing environment variable: "${name}"`);
}

function getModelUrl(model: string) {
  return `https://www.apple.com/shop/fulfillment-messages?pl=true&mts.0=regular&mts.1=compact&cppart=UNLOCKED/US&parts.0=${model}&location=${encodeURI(
    LOCATION
  )}`;
}

interface AvailableStore {
  name: string;
  distance: string;
  reservationUrl: string;
  available: true;
  model: string;
  storage: string;
}

async function getAvailability(...models: string[]) {
  const availableStores: AvailableStore[] = [];

  for (const model of models) {
    const { body } = await fetch(getModelUrl(model))
      .then((res) => res.json())
      .then(appleResponse.parse);

    const currentAvailableStores = body.content.pickupMessage.stores.filter(
      (store) => store.partsAvailability[model]?.pickupDisplay === "available"
    );

    if (currentAvailableStores.length) {
      availableStores.push(
        ...currentAvailableStores.map((store) => ({
          name: store.storeName,
          distance: store.storeDistanceWithUnit,
          reservationUrl: store.reservationUrl,
          available: true as const,
          model: exhaustive(model, {
            "MU693LL/A": () => "iPhone 15 Pro Max 256GB Blue Titanium",
            "MU6E3LL/A": () => "iPhone 15 Pro Max 512GB Blue Titanium",
            "MU6J3LL/A": () => "iPhone 15 Pro Max 1024GB Blue Titanium",
            _: () => "iPhone 15 Pro",
          }),
          storage: exhaustive(model, {
            "MU693LL/A": () => "256gb",
            "MU6E3LL/A": () => "512gb",
            "MU6J3LL/A": () => "1tb",
            _: () => "512gb",
          }),
        }))
      );
    }

    await new Promise((res) => setTimeout(res, 800));
  }

  return availableStores;
}

async function sendNotification(stores: AvailableStore[]) {
  const [firstRankedStore] = stores;

  const notificationParams = {
    token: process.env.PUSHOVER_TOKEN || missingEnv("PUSHOVER_TOKEN"),
    user: process.env.PUSHOVER_USER_KEY || missingEnv("PUSHOVER_USER_KEY"),
    title: `Available iPhone 15 Pro MAX (${firstRankedStore.storage.toUpperCase()}) at stores nearby`,
    message: `Available stores: ${stores
      .map(
        (store) =>
          `<a href="${store.reservationUrl}">Apple ${store.name} (${store.distance})</a>`
      )
      .join(", ")}`,
    html: "1",
    url: `https://www.apple.com/shop/buy-iphone/iphone-15-pro/6.7-inch-display-${firstRankedStore.storage}-blue-titanium-unlocked`,
    url_title: `Go to Apple website to make a reservation: Apple ${firstRankedStore.name} (${firstRankedStore.distance})`,
  };

  const notificationUrl = new URL("https://api.pushover.net/1/messages.json");

  for (const [key, value] of Object.entries(notificationParams)) {
    notificationUrl.searchParams.set(key, value);
  }

  await fetch(notificationUrl, { method: "POST" });
}

export default async function handler() {
  const availableStores = await getAvailability(
    BLUE_TITANIUM_IPHONE_15_PRO_MAX_256,
    BLUE_TITANIUM_IPHONE_15_PRO_MAX_512,
    BLUE_TITANIUM_IPHONE_15_PRO_MAX_1024
  );

  if (!availableStores.length) {
    return new NextResponse(
      JSON.stringify({
        message: "No stores with iPhone 15 Pro MAX available at the moment",
      }),
      { status: 200 }
    );
  }

  await sendNotification(availableStores);

  return new NextResponse(JSON.stringify(availableStores), {
    status: 200,
  });
}
