import { create } from 'zustand'

type Visibility = 'private' | 'team'

type ExplorerNode = {
  folderId?: string | null
}

interface ChatOptionsStore {
  visibility: Visibility
  explorerNode: ExplorerNode
  setVisibility: (visibility: Visibility) => void
  setExplorerNode: (explorerNode?: ExplorerNode) => void
}

export const useChatOptions = create<ChatOptionsStore>((set) => ({
  visibility: 'private',
  explorerNode: {
    folderId: null,
  },
  setVisibility: (visibility) => set(() => ({ visibility })),
  setExplorerNode: (explorerNode?: ExplorerNode) =>
    set(() => ({ explorerNode })),
}))
