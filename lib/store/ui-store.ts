import { create } from "zustand";

type UiStore = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  activeTab: "my-land",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
