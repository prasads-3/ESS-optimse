import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "@/config";

const TASK_EVENTS = [
    "task:created",
    "task:weekAdded",
    "task:dailyAdded",
    "task:dailyUpdated",
] as const;

type TaskEvent = (typeof TASK_EVENTS)[number];

let sharedSocket: Socket | null = null;

const getSocket = (): Socket => {
    if (sharedSocket && sharedSocket.connected) return sharedSocket;
    if (sharedSocket) return sharedSocket;
    sharedSocket = io(API_BASE_URL, {
        withCredentials: true,
        transports: ["websocket", "polling"],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
    });
    sharedSocket.on("connect_error", err => {
        console.warn("[socket] connect_error:", err.message);
    });
    return sharedSocket;
};

/**
 * Subscribe to task-related realtime events. Pass a handler that re-runs
 * whenever any task changes. Handler is debounced via the consumer's
 * fetch logic — this hook just calls it for every event.
 */
export function useTaskSocket(onChange: (event: TaskEvent, payload: unknown) => void) {
    const handlerRef = useRef(onChange);
    useEffect(() => {
        handlerRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        const socket = getSocket();
        const listeners: Array<[TaskEvent, (p: unknown) => void]> = TASK_EVENTS.map(
            evt => {
                const fn = (payload: unknown) => handlerRef.current(evt, payload);
                socket.on(evt, fn);
                return [evt, fn];
            }
        );
        return () => {
            listeners.forEach(([evt, fn]) => socket.off(evt, fn));
        };
    }, []);
}
