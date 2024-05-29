export const getRecordsOptions = (options, records) => {
    return options
        .filter(option => records.has(option.value))
        .map(option => ({ value: option.value, label: option.label }));
}