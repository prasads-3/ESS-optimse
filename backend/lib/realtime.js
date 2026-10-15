// Singleton hub for emitting realtime events. Server.js initializes `io` after
// the HTTP server is created and calls setIO(); feature controllers import
// `emitTaskEvent()` to broadcast without taking a direct dependency on io.

let ioRef = null;

export const setIO = (io) => {
    ioRef = io;
};

// Room naming:
//   user:<email>    — every connected client with that email joins
//   admins:<orgId>  — every admin/super-admin in the org joins
export const userRoom = (email) => `user:${String(email).toLowerCase()}`;
export const adminsRoom = (orgId) => `admins:${orgId || 'global'}`;

/**
 * Broadcast a task-related event to relevant rooms.
 * @param {string} event   e.g. 'task:created', 'task:dailyUpdated'
 * @param {object} payload arbitrary JSON
 * @param {object} targets { assignedTo?, orgId?, broadcastAll? }
 */
export const emitTaskEvent = (event, payload, targets = {}) => {
    if (!ioRef) return;
    const { assignedTo, orgId, broadcastAll } = targets;
    try {
        if (broadcastAll) {
            ioRef.emit(event, payload);
            return;
        }
        if (assignedTo) ioRef.to(userRoom(assignedTo)).emit(event, payload);
        ioRef.to(adminsRoom(orgId)).emit(event, payload);
    } catch (err) {
        console.error('[realtime] emit failed:', err);
    }
};
