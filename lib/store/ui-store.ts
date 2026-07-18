import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FarmEnterprise = "dairy" | "beef" | "sheep" | "tillage" | "mixed";
export type FarmWeekFocus =
  | "grazing"
  | "nutrients"
  | "spraying"
  | "sales"
  | "compliance";

export type FarmLocation = {
  latitude: number;
  longitude: number;
  label: string;
  routingKey: string | null;
  county: string | null;
  precision: "manual-pin" | "routing-area";
};

type UiStore = {
  activeTab: string;
  enterprise: FarmEnterprise;
  weekFocus: FarmWeekFocus;
  farmCounty: string | null;
  farmLocation: FarmLocation | null;
  preferredOpwStation: string | null;
  evidenceId: string | null;
  hasHydrated: boolean;
  setActiveTab: (tab: string) => void;
  setEnterprise: (enterprise: FarmEnterprise) => void;
  setWeekFocus: (focus: FarmWeekFocus) => void;
  setFarmCounty: (county: string | null) => void;
  setFarmLocation: (location: FarmLocation | null) => void;
  setPreferredOpwStation: (station: string | null) => void;
  setEvidenceId: (evidenceId: string | null) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      activeTab: "this-week",
      enterprise: "mixed",
      weekFocus: "grazing",
      farmCounty: null,
      farmLocation: null,
      preferredOpwStation: null,
      evidenceId: null,
      hasHydrated: false,
      setActiveTab: (activeTab) => set({ activeTab }),
      setEnterprise: (enterprise) => set({ enterprise }),
      setWeekFocus: (weekFocus) => set({ weekFocus }),
      setFarmCounty: (farmCounty) => set({ farmCounty }),
      setFarmLocation: (farmLocation) =>
        set({ farmLocation, farmCounty: farmLocation?.county ?? null }),
      setPreferredOpwStation: (preferredOpwStation) =>
        set({ preferredOpwStation }),
      setEvidenceId: (evidenceId) => set({ evidenceId }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "agriview-farm-profile-v1",
      partialize: (state) => ({
        enterprise: state.enterprise,
        weekFocus: state.weekFocus,
        farmCounty: state.farmCounty,
        farmLocation: state.farmLocation,
        preferredOpwStation: state.preferredOpwStation,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
