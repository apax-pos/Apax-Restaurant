/** Shared form/button classes matching Orders, Inventory, Settings pages. */
export const apaxInput =
  "w-full rounded-xl border border-apax-border-green bg-apax-gray text-apax-text px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-apax-green transition";

export const apaxSelect = apaxInput;

export const apaxTextarea =
  "w-full rounded-xl border border-apax-border-green bg-apax-gray text-apax-text px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-apax-green transition resize-y";

export const apaxBtnPrimary =
  "rounded-xl px-4 py-2.5 text-white bg-apax-green hover:bg-apax-green-button-hover border border-apax-border-green transition active:scale-95 font-medium";

export const apaxBtnSecondary =
  "rounded-xl px-4 py-2.5 border border-apax-border-green bg-apax-gray hover:bg-apax-button-hover text-apax-text transition active:scale-95 font-medium";

export const apaxBtnSm =
  "rounded-lg px-3 py-1.5 text-sm " +
  apaxBtnSecondary.replace("rounded-xl px-4 py-2.5 ", "");

export const apaxBtnDanger =
  "rounded-xl px-4 py-2.5 text-white bg-red-500 hover:bg-red-600 border border-red-400 transition active:scale-95 font-medium";

export const apaxCard =
  "rounded-2xl p-6 bg-apax-card-bg border border-apax-border-green shadow-sm";

export const apaxPageTitle = "text-2xl font-bold text-apax-text";
