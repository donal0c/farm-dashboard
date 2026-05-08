import { create } from "zustand";

export type FarmEnterprise = "dairy" | "beef" | "sheep" | "tillage" | "mixed";
export type FarmWeekFocus =
  | "grazing"
  | "nutrients"
  | "spraying"
  | "sales"
  | "compliance";

type UiStore = {
  activeTab: string;
  enterprise: FarmEnterprise;
  weekFocus: FarmWeekFocus;
  farmCounty: string | null;
  setActiveTab: (tab: string) => void;
  setEnterprise: (enterprise: FarmEnterprise) => void;
  setWeekFocus: (focus: FarmWeekFocus) => void;
  setFarmCounty: (county: string | null) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  activeTab: "my-land",
  enterprise: "mixed",
  weekFocus: "grazing",
  farmCounty: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setEnterprise: (enterprise) => set({ enterprise }),
  setWeekFocus: (weekFocus) => set({ weekFocus }),
  setFarmCounty: (farmCounty) => set({ farmCounty }),
}));
