import { exhaustive } from "exhaustive";
import { delay } from "../delay";
import { getEnv } from "../get-env";
import { response } from "./schema";

export const config = {
  runtime: "edge",
};

const CHICAGO = "Chicago, IL";
const NEW_YORK = "New York, NY";
const PORTLAND = "Portland, OR";

const [
  BLUE_TITANIUM_IPHONE_15_PRO_MAX_256,
  BLUE_TITANIUM_IPHONE_15_PRO_MAX_512,
  BLUE_TITANIUM_IPHONE_15_PRO_MAX_1024,
] = ["MU693LL/A", "MU6E3LL/A", "MU6J3LL/A"] as const;

type IPhoneModel =
  | typeof BLUE_TITANIUM_IPHONE_15_PRO_MAX_256
  | typeof BLUE_TITANIUM_IPHONE_15_PRO_MAX_512
  | typeof BLUE_TITANIUM_IPHONE_15_PRO_MAX_1024;

interface AvailableStore {
  name: string;
  distance: string;
  reservationUrl: string;
  model: string;
  storage: string;
}

function searchModelAvailability(
  model: string,
  { location }: { location: string }
) {
  return `https://www.apple.com/shop/fulfillment-messages?pl=true&mts.0=regular&mts.1=compact&cppart=UNLOCKED/US&parts.0=${model}&location=${encodeURI(
    location
  )}`;
}

function modelPartToReadableName(model: IPhoneModel) {
  return exhaustive(model, {
    "MU693LL/A": () => "iPhone 15 Pro Max 256GB Blue Titanium",
    "MU6E3LL/A": () => "iPhone 15 Pro Max 512GB Blue Titanium",
    "MU6J3LL/A": () => "iPhone 15 Pro Max 1024GB Blue Titanium",
    _: () => "iPhone 15 Pro",
  });
}

function modelPartToStorageSize(model: IPhoneModel) {
  return exhaustive(model, {
    "MU693LL/A": () => "256gb",
    "MU6E3LL/A": () => "512gb",
    "MU6J3LL/A": () => "1tb",
    _: () => "512gb",
  });
}

async function getAvailability(location: string, models: IPhoneModel[]) {
  const availableStores: AvailableStore[] = [];

  for (const model of models) {
    const { body } = await fetch(searchModelAvailability(model, { location }))
      .then((res) => res.json())
      .then(response.parse);

    const currentAvailableStores =
      body.content.pickupMessage.stores.flatMap<AvailableStore>((store) =>
        store.partsAvailability[model]?.pickupDisplay === "available"
          ? {
              name: store.storeName,
              distance: store.storeDistanceWithUnit,
              reservationUrl: store.reservationUrl,
              model: modelPartToReadableName(model),
              storage: modelPartToStorageSize(model),
            }
          : []
      );

    if (currentAvailableStores.length) {
      availableStores.push(...currentAvailableStores);
    }

    await delay(300);
  }

  return availableStores;
}

async function sendNotification(location: string, stores: AvailableStore[]) {
  const [firstRankedStore] = stores;

  const notificationParams = {
    token: getEnv("PUSHOVER_TOKEN"),
    user: getEnv("PUSHOVER_USER_KEY"),
    title: `Available iPhone 15 Pro MAX (${firstRankedStore.storage.toUpperCase()}) in ${location}`,
    message: `Available stores: ${stores
      .map(
        (store) =>
          `<a href="${store.reservationUrl}">Apple ${store.name} (${store.distance})</a>`
      )
      .join(", ")}`,
    html: "1",
    url: `https://www.apple.com/shop/buy-iphone/iphone-15-pro/6.7-inch-display-${firstRankedStore.storage}-blue-titanium-unlocked`,
    url_title: `Go to Apple website to make a reservation at ${firstRankedStore.name} store (${firstRankedStore.distance})`,
  };

  const notificationUrl = new URL("https://api.pushover.net/1/messages.json");

  for (const [key, value] of Object.entries(notificationParams)) {
    notificationUrl.searchParams.set(key, value);
  }

  await fetch(notificationUrl, { method: "POST" });
}

export async function GET() {
  let availableLocation: string | undefined;

  const availableStores: AvailableStore[] = [];

  for (const location of [CHICAGO, NEW_YORK, PORTLAND]) {
    const locationAvailableStores = await getAvailability(location, [
      BLUE_TITANIUM_IPHONE_15_PRO_MAX_256,
      BLUE_TITANIUM_IPHONE_15_PRO_MAX_512,
      BLUE_TITANIUM_IPHONE_15_PRO_MAX_1024,
    ]);

    if (!locationAvailableStores.length) {
      continue;
    }

    availableStores.push(...locationAvailableStores);
    availableLocation = location;
    break;
  }

  if (!availableStores.length || !availableLocation) {
    return new Response(
      JSON.stringify({
        message: "No stores with iPhone 15 Pro MAX available at the moment",
      }),
      { status: 200 }
    );
  }

  await sendNotification(availableLocation, availableStores);

  return new Response(
    JSON.stringify({ city: availableLocation, stores: availableStores }),
    { status: 200 }
  );
}
