import { create } from "zustand";
import type { PlayerData } from "../types/playerData";

type UserStore = {
    user: PlayerData;
    isSocketReady: boolean;
    setUser: (data: PlayerData) => void;
    setIsSocketReady: (ready: boolean) => void;
    updateElo: (elo: number) => void;
    clearUser: () => void;
};

const dummyUser: PlayerData = {
    id: "-1",
    email: "player@nomail.com",
    nickname: "Player",
    role: "user",
    isProfileComplete: true,
    elo: 0,
};

const getInitialUser = (): PlayerData => {
    try {
        const stored = localStorage.getItem("user");
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // ignore
    }
    return dummyUser;
};

export const useUserStore = create<UserStore>((set) => ({
    user: getInitialUser(),
    isSocketReady: false,
    setUser: (data: PlayerData) => set({ user: data }),
    setIsSocketReady: (ready: boolean) => set({ isSocketReady: ready }),
    updateElo: (elo: number) =>
        set((state) => ({
            user: { ...state.user, elo: state.user.elo + elo },
        })),
    clearUser: () => set({ user: dummyUser }),
}));
