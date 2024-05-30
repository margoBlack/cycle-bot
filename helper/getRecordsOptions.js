export const getRecordsOptions = (options, records, additionalValue) => {
    let result = options
        .filter(option => records.has(option.value))
        .map(option => ({ value: `${option.value}_${additionalValue}`, label: option.label }));
        
    result.push({ value: 'back', label: '📍 Повернутись до меню' });
    return result;
}