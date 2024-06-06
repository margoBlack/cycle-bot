import { addWeeks, endOfWeek } from 'date-fns'

function getEndOfNextWeek() {
    const today = new Date();
    const nextWeek = addWeeks(today, 1);
    return endOfWeek(nextWeek, { weekStartsOn: 1 }); // Assuming the week starts on Monday
}

export default getEndOfNextWeek;
