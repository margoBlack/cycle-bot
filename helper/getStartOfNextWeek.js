import { addWeeks, startOfWeek } from 'date-fns'

function getStartOfNextWeek() {
    const today = new Date();
    const nextWeek = addWeeks(today, 1);
    return startOfWeek(nextWeek, { weekStartsOn: 1 }); // Default week starts on Sunday
}

export default getStartOfNextWeek;
