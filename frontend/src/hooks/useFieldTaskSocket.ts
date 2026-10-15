import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "@/config";

const FIELD_TASK_EVENTS = [
    "fieldTask:created",
    "fieldTask:updated",
    "fieldTask:deleted",
] as const;

type FieldTaskEvent = (typeof FIELD_TASK_EVENTS)[number];

let sharedSocket: Socket | null = null;

const getSocket = (): Socket => {
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

/** Subscribe to field-task realtime events; handler runs on every event. */
export function useFieldTaskSocket(
    onChange: (event: FieldTaskEvent, payload: unknown) => void
) {
    const handlerRef = useRef(onChange);
    useEffect(() => {
        handlerRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        const socket = getSocket();
        const listeners: Array<[FieldTaskEvent, (p: unknown) => void]> =
            FIELD_TASK_EVENTS.map(evt => {
                const fn = (payload: unknown) => handlerRef.current(evt, payload);
                socket.on(evt, fn);
                return [evt, fn];
            });
        return () => {
            listeners.forEach(([evt, fn]) => socket.off(evt, fn));
        };
    }, []);
}
