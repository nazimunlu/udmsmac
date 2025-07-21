import { eachDayOfInterval, getDay, parseISO, differenceInMonths, addMonths, format } from 'date-fns';

const dayNameToIndex = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
};

/**
 * Calculates the number of lessons that occur on specific weekdays within a date range.
 * @param {string} startDate - The start date in 'YYYY-MM-DD' format.
 * @param {string} endDate - The end date in 'YYYY-MM-DD' format.
 * @param {string[]} scheduledDays - An array of weekday names (e.g., ['Mon', 'Wed']).
 * @returns {number} The total count of lessons.
 */
export const calculateLessonsWithinRange = (startDate, endDate, scheduledDays) => {
    if (!startDate || !endDate || !scheduledDays || scheduledDays.length === 0) {
        return 0;
    }
    try {
        const start = parseISO(startDate);
        const end = parseISO(endDate);

        if (start > end) return 0;

        const scheduledDayIndexes = scheduledDays.map(day => dayNameToIndex[day]).filter(d => d !== undefined);
        if (scheduledDayIndexes.length === 0) return 0;

        const allDays = eachDayOfInterval({ start, end });
        return allDays.filter(day => scheduledDayIndexes.includes(getDay(day))).length;

    } catch (error) {
        console.error("Error calculating lessons:", error);
        return 0;
    }
};

/**
 * Generates a monthly installment plan based on a total fee and date range.
 * @param {number} totalFee - The total fee to be divided into installments.
 * @param {string} enrollmentDate - The start date for the first installment in 'YYYY-MM-DD' format.
 * @param {string} endDate - The end date to determine the number of months.
 * @returns {Array} An array of installment objects.
 */
export const generateMonthlyInstallments = (totalFee, enrollmentDate, endDate) => {
    if (totalFee <= 0 || !enrollmentDate || !endDate) return [];

    try {
        const start = parseISO(enrollmentDate);
        const end = parseISO(endDate);
        
        const numInstallments = differenceInMonths(end, start) + 1;
        if (numInstallments <= 0) return [];

        const installmentAmount = totalFee / numInstallments;

        return Array.from({ length: numInstallments }, (_, i) => {
            const dueDate = addMonths(start, i);
            return {
                number: i + 1,
                amount: installmentAmount,
                dueDate: format(dueDate, 'yyyy-MM-dd'),
                status: 'Unpaid'
            };
        });
    } catch (error) {
        console.error("Error generating installments:", error);
        return [];
    }
};
