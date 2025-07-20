const formatPhoneNumber = (value) => {
    if (!value) return value;

    let cleaned = value.replace(/[^\d]/g, '');

    // If it starts with 0, remove it (common for Turkish numbers)
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }

    // Prepend 90 if not already present and it's a valid length for a Turkish number
    if (!cleaned.startsWith('90') && cleaned.length >= 10) {
        cleaned = '90' + cleaned;
    }

    // If it's a Turkish number (starts with 90 and has 12 digits total including 90)
    if (cleaned.startsWith('90') && cleaned.length === 12) {
        const countryCode = cleaned.slice(0, 2);
        const areaCode = cleaned.slice(2, 5);
        const part1 = cleaned.slice(5, 8);
        const part2 = cleaned.slice(8, 10);
        const part3 = cleaned.slice(10, 12);
        return `+${countryCode} (${areaCode}) ${part1} ${part2} ${part3}`;
    } else if (cleaned.length > 0) {
        // For other numbers or incomplete numbers, just return the cleaned version
        return value;
    }

    return '';
};

export default formatPhoneNumber;
