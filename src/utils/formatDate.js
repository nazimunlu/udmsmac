export const formatDate = (dateString, options = {}) => {
    const { format = 'long' } = options;
    const date = new Date(dateString);

    const formatterOptions = {
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    if (format === 'short') {
        const day = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit' }).format(date);
        const month = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', month: '2-digit' }).format(date);
        return `${day}/${month}`;
    }
    
    return new Intl.DateTimeFormat('tr-TR', formatterOptions).format(date);
};
