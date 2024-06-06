import {nextDay, setHours, setMinutes, format, setSeconds, setMilliseconds} from 'date-fns'

function getNextTrainingDates(schedule) {
    const nextWeekDates = [];

    const daysOfWeek = {
        'Sunday': 0,
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5,
        'Saturday': 6,
    };

    const now = new Date();

    schedule.forEach(({ day, time }) => {
        const [hours, minutes] = time.split(':').map(Number);
        const targetDay = daysOfWeek[day];

        let nextOccurrence = nextDay(now, targetDay);
        nextOccurrence = setHours(nextOccurrence, hours);
        nextOccurrence = setMinutes(nextOccurrence, minutes);
        nextOccurrence = setSeconds(nextOccurrence, 0);
        nextOccurrence = setMilliseconds(nextOccurrence, 0);

        // format(nextOccurrence, 'yyyy-MM-dd HH:mm')
        nextWeekDates.push(nextOccurrence);
    });

    return nextWeekDates;
}

export default getNextTrainingDates