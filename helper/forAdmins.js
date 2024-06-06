import {ADMINS} from "../constants.js";

export function forAdmins(ctx) {
    return ADMINS.includes(ctx.msg.chat?.username)
}