import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ChatAppearanceStore {
  topbar: boolean
  primarySidebar: boolean
  secondarySidebar: boolean
  setTopbar: (topbar: boolean) => void
  setPrimarySidebar: (primarySidebar: boolean) => void
  setSecondarySidebar: (secondarySidebar: boolean) => void
}

export const useChatAppearance = create<ChatAppearanceStore>()(
  persist(
    (set) => ({
      topbar: true,
      primarySidebar: true,
      secondarySidebar: false,
      setTopbar: (topbar) => set(() => ({ topbar })),
      setPrimarySidebar: (primarySidebar) => set(() => ({ primarySidebar })),
      setSecondarySidebar: (secondarySidebar) =>
        set(() => ({ secondarySidebar })),
    }),
    {
      name: 'chat-appearance-storage',
    },
  ),
)
