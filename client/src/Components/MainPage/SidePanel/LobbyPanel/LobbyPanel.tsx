import { useState } from "react";
import useLobby from "../../../../hooks/useLobby";
import { useUserStore } from "../../../../stores/useUserStore";

export default function LobbyPanel() {
    const [inQueue, setInQueue] = useState(false);
    const { joinQueue, leaveQueue } = useLobby();
    const isSocketReady = useUserStore((state) => state.isSocketReady);
    const user = useUserStore((state) => state.user);

    function handlePlayRanked(): void {
        if (!user.isProfileComplete) return;
        setInQueue(true);
        joinQueue();
    }

    function handleCancelQueue(): void {
        setInQueue(false);
        leaveQueue();
    }

    const isActionDisabled = !isSocketReady || user.id === "-1" || !user.isProfileComplete;

    return (
        <div id="lobby-panel" className="flex flex-col space-y-4 h-full">
            <h3 className="text-xl font-bold text-center text-blue-400 border-b border-gray-700 pb-3 mb-2">
                Welcome, Commander!
            </h3>
            <p className="text-center text-gray-400">
                Select a game mode to start
            </p>
            <button
                id="play-ranked-btn"
                className="w-full py-4 text-lg font-bold rounded-xl bg-green-600 hover:bg-green-700 transition shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                onClick={inQueue ? handleCancelQueue : handlePlayRanked}
                disabled={isActionDisabled}
            >
                {inQueue
                    ? "⏳ Searching for Opponent..."
                    : "▶️ Play Ranked Match"}
            </button>
            <button
                className="w-full py-4 text-lg font-bold rounded-xl bg-blue-600 hover:bg-blue-700 transition shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isActionDisabled}
            >
                🤝 Invite Friend
            </button>
            <button
                className="w-full py-4 text-lg font-bold rounded-xl bg-orange-600 hover:bg-orange-700 transition shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isActionDisabled}
            >
                🤖 VS AI
            </button>
            <div className="grow"></div>
            <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-700">
                Current Online Players: 1234
            </div>
        </div>
    );
}
