import formatFirebaseDate from "./formatFirebaseDate.js";
import {MAX_PARTICIPANTS, STATUS_EMOJI} from "../constants.js";

function generateOccupancyString(count, maxCount) {
    const participant = '🚴‍♀️';
    const free = '🚲';
    let result = participant.repeat(count);

    if (count < maxCount) {
        result += free.repeat(maxCount - count);
    }

    return result;
}

function generateDayScheduleText(training) {
    let msg = ''
    const count = training.participants.reduce((acc, p) =>
        acc + (p.status === 'signed' ? 1 : 0), 0)

    msg += `<b><u>${formatFirebaseDate(training.date)} ${training.label}</u></b> <i>${count}/${MAX_PARTICIPANTS}</i>\n`
    msg += generateOccupancyString(count, MAX_PARTICIPANTS) + '\n\n'
    msg += training.participants.map((p) => `${STATUS_EMOJI[p.status]} ${p.name} \n\n`)

    return msg
}

export default generateDayScheduleText;