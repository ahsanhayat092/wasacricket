import React, { createContext, useContext, useState, ReactNode } from "react";
import { PlayerPerformanceModal } from "@/components/PlayerPerformanceModal";
import { PlayerSearchDialog } from "@/components/PlayerSearchDialog";

interface PlayerModalContextType {
  selectedPlayerId: string | null;
  openPlayerProfile: (playerId: string) => void;
  closePlayerProfile: () => void;
  isSearchOpen: boolean;
  openPlayerSearch: () => void;
  closePlayerSearch: () => void;
}

const PlayerModalContext = createContext<PlayerModalContextType | undefined>(undefined);

export function PlayerModalProvider({ children }: { children: ReactNode }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const openPlayerProfile = (playerId: string) => {
    setSelectedPlayerId(playerId);
  };

  const closePlayerProfile = () => {
    setSelectedPlayerId(null);
  };

  const openPlayerSearch = () => {
    setIsSearchOpen(true);
  };

  const closePlayerSearch = () => {
    setIsSearchOpen(false);
  };

  return (
    <PlayerModalContext.Provider
      value={{
        selectedPlayerId,
        openPlayerProfile,
        closePlayerProfile,
        isSearchOpen,
        openPlayerSearch,
        closePlayerSearch,
      }}
    >
      {children}
      {selectedPlayerId && (
        <PlayerPerformanceModal
          playerId={selectedPlayerId}
          open={Boolean(selectedPlayerId)}
          onOpenChange={(open) => {
            if (!open) closePlayerProfile();
          }}
          onSelectPlayer={(id) => openPlayerProfile(id)}
        />
      )}
      <PlayerSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onSelectPlayer={(id) => {
          setIsSearchOpen(false);
          openPlayerProfile(id);
        }}
      />
    </PlayerModalContext.Provider>
  );
}

export function usePlayerModal() {
  const context = useContext(PlayerModalContext);
  if (!context) {
    throw new Error("usePlayerModal must be used within a PlayerModalProvider");
  }
  return context;
}
