// Opt-in response helpers for NEW code. Legacy handlers keep their own exact
// response shapes — do NOT retrofit these onto existing endpoints, or you risk
// changing a contract the frontend depends on.
export const ok = (res, data) => res.json(data);
export const created = (res, data) => res.status(201).json(data);
export const noContent = (res) => res.status(204).send();
export const fail = (res, status, error, extra = {}) =>
    res.status(status).json({ error, ...extra });
