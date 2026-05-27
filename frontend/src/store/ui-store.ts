import { create } from "zustand";
import { Agent } from "@/lib/types";

interface UIState {
  sidebarOpen: boolean;
  runModalOpen: boolean;
  selectedAgent: Agent | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openRunModal: (agent: Agent) => void;
  closeRunModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  runModalOpen: false,
  selectedAgent: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openRunModal: (agent) => set({ runModalOpen: true, selectedAgent: agent }),
  closeRunModal: () => set({ runModalOpen: false, selectedAgent: null }),
}));
