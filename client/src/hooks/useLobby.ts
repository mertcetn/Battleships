import { useEffect } from "react";
import { lobbySocket } from "../lib/socket";
import { useGameStore } from "../stores/useGameStore";
import { useUserStore } from "../stores/useUserStore";

export default function useLobby(onMatchFound?: () => void) {
    const joinQueue = () => {
        const user = useUserStore.getState().user;
        if (!user.isProfileComplete) return;
        lobbySocket.emit("join_queue");
    };
    const leaveQueue = () => lobbySocket.emit("leave_queue");

    const {
        setCurrentTurn,
        setGameStatus,
        setGameId,
        setOpponentData,
        resetGame,
        setEnemyHits,
        setHitBoard,
        setShipBoard,
    } = useGameStore();

    useEffect(() => {
        lobbySocket.on("match_found", ({ gameId, turn, opponent }) => {
            const user = useUserStore.getState().user;
            resetGame();

            console.log(
                `Match found! Game ID: ${gameId}, Turn: ${turn}, user Id: ${user.id}`,
            );

            setGameId(gameId);
            setCurrentTurn(turn === user.id ? "player" : "opponent");
            setOpponentData(opponent);
            setGameStatus("placement");

            if (onMatchFound) onMatchFound();
        });

        lobbySocket.on(
            "rejoin_game",
            ({
                gameId,
                turn,
                opponent,
                gameStatus,
                hitBoard,
                enemyHitBoard,
                shipBoard,
            }) => {
                const user = useUserStore.getState().user;
                resetGame();

                console.log(
                    `Reconnected to match! Game ID: ${gameId}, Turn: ${turn}, user Id: ${user.id}`,
                );

                setGameId(gameId);
                setCurrentTurn(turn === user.id ? "player" : "opponent");
                setOpponentData(opponent);
                setGameStatus(gameStatus);
                setHitBoard(hitBoard);
                setEnemyHits(enemyHitBoard);
                setShipBoard(shipBoard);
            },
        );

        return () => {
            lobbySocket.off("match_found");
            lobbySocket.off("rejoin_game");
        };
    }, [onMatchFound]);

    return { joinQueue, leaveQueue };
}
