import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

const socketRefs = new Map<Socket, number>();

export default function useSocket(socket: Socket, enabled: boolean = true) {
    const [isConnected, setConnected] = useState(socket.connected);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled) {
            if (socket.connected) {
                socket.disconnect();
            }
            setConnected(false);
            return;
        }

        const refs = socketRefs.get(socket) || 0;
        socketRefs.set(socket, refs + 1);

        if (refs === 0) {
            socket.connect();
        }

        const onConnect = () => {
            setConnected(true);
            setError(null);
        };
        const onDisconnect = () => {
            setConnected(false);
        };
        const onError = (err: any) => {
            setError(err.message);
        };

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("error", onError);

        return () => {
            const newRefs = (socketRefs.get(socket) || 1) - 1;
            socketRefs.set(socket, newRefs);

            if (newRefs === 0) {
                socket.disconnect();
            }

            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("error", onError);
        };
    }, [socket, enabled]);

    return { isConnected, error };
}
