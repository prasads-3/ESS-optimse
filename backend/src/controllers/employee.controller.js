// Employee controller — request/response only. No Prisma, no business rules.
// Each handler calls the service, sends the returned { status, body } envelope,
// then invokes the optional `afterResponse` thunk for fire-and-forget side
// effects (emails) that must run AFTER the response is flushed — preserving the
// original "respond immediately, email in the background" behavior.
import * as employeeService from '../services/employee.service.js';

function reply(res, result) {
    const { status, body, afterResponse } = result;
    if (status === 204) {
        res.status(204).send();
    } else {
        res.status(status).json(body);
    }
    if (afterResponse) {
        Promise.resolve()
            .then(afterResponse)
            .catch((err) => console.error('[employee.afterResponse]', err));
    }
}

export async function list(req, res) {
    reply(res, await employeeService.list(req.user));
}

export async function getById(req, res) {
    reply(res, await employeeService.getById(req.params.id, req.user));
}

export async function create(req, res) {
    reply(res, await employeeService.create(req.body, req.user, req));
}

export async function update(req, res) {
    reply(res, await employeeService.update(req.params.id, req.body, req));
}

export async function remove(req, res) {
    reply(res, await employeeService.remove(req.params.id));
}
