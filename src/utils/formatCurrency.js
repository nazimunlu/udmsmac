// Currency formatting utility that removes decimal places
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

// Simple currency formatting without currency symbol
export const formatAmount = (amount) => {
    return Math.round(amount).toLocaleString('tr-TR');
}; 