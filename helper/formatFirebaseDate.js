import {format} from 'date-fns'
function formatFirebaseDate(firebaseTimestamp) {
    const date = firebaseTimestamp.toDate();
    return format(date, 'dd.MM');
}

export default formatFirebaseDate;