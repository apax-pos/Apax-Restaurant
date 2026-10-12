/**
 * Empty-state illustrations as data URIs (?raw) so they always load from the JS bundle
 * without extra requests to /assets/illustrations/*.webp or hashed Vite asset files.
 */
import circleRaw from "../assets/illustrations/circle_illustration.svg?raw";
import customersRaw from "../assets/illustrations/no-customers.svg?raw";
import kitchenRaw from "../assets/illustrations/kitchen.svg?raw";
import invoiceRaw from "../assets/illustrations/no-invoice.svg?raw";
import popularRaw from "../assets/illustrations/no-popular-items.svg?raw";
import reservationRaw from "../assets/illustrations/no-reservation.svg?raw";
import waveRaw from "../assets/illustrations/wave-bg.svg?raw";

function svgDataUri(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const emptyStateIllu = {
  circle: svgDataUri(circleRaw),
  customers: svgDataUri(customersRaw),
  kitchen: svgDataUri(kitchenRaw),
  invoice: svgDataUri(invoiceRaw),
  orders: svgDataUri(invoiceRaw),
  pos: svgDataUri(popularRaw),
  reservation: svgDataUri(reservationRaw),
  topSelling: svgDataUri(popularRaw),
  wave: svgDataUri(waveRaw),
};
