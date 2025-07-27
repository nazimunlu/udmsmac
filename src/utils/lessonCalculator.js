import { eachDayOfInterval, getDay, parseISO, differenceInMonths, addMonths, format, addDays, addWeeks, differenceInDays, differenceInWeeks, startOfWeek, endOfWeek, isSameWeek } from 'date-fns';

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
 * Calculates the number of weeks that have lessons scheduled within a date range.
 * @param {string} startDate - The start date in 'YYYY-MM-DD' format.
 * @param {string} endDate - The end date in 'YYYY-MM-DD' format.
 * @param {string[]} scheduledDays - An array of weekday names (e.g., ['Mon', 'Wed']).
 * @returns {number} The number of weeks with lessons.
 */
export const calculateWeeksWithLessons = (startDate, endDate, scheduledDays) => {
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
        const lessonDays = allDays.filter(day => scheduledDayIndexes.includes(getDay(day)));
        
        // Count unique weeks that have lessons
        const weeksWithLessons = new Set();
        lessonDays.forEach(day => {
            const weekKey = format(startOfWeek(day, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            weeksWithLessons.add(weekKey);
        });
        
        return weeksWithLessons.size;

    } catch (error) {
        console.error("Error calculating weeks with lessons:", error);
        return 0;
    }
};

/**
 * Generates installments based on frequency (daily, weekly, monthly) and lesson schedule.
 * @param {number} pricePerLesson - The price per individual lesson.
 * @param {string} enrollmentDate - The start date for the first installment in 'YYYY-MM-DD' format.
 * @param {string} endDate - The end date to determine the number of periods.
 * @param {string} frequency - The frequency of installments ('daily', 'weekly', 'monthly').
 * @param {string[]} scheduledDays - Array of scheduled days for calculation.
 * @returns {Array} An array of installment objects.
 */
export const generateInstallments = (pricePerLesson, enrollmentDate, endDate, frequency = 'monthly', scheduledDays = []) => {
    if (pricePerLesson <= 0 || !enrollmentDate || !endDate || !scheduledDays || scheduledDays.length === 0) return [];

    try {
        const start = parseISO(enrollmentDate);
        const end = parseISO(endDate);
        
        if (start > end) return [];
        
        const scheduledDayIndexes = scheduledDays.map(day => dayNameToIndex[day]).filter(d => d !== undefined);
        if (scheduledDayIndexes.length === 0) return [];

        switch (frequency) {
            case 'daily':
                return generateDailyInstallments(pricePerLesson, start, end, scheduledDayIndexes);
            case 'weekly':
                return generateWeeklyInstallments(pricePerLesson, start, end, scheduledDayIndexes);
            case 'monthly':
                return generateMonthlyInstallments(pricePerLesson, start, end, scheduledDayIndexes);
            default:
                return generateMonthlyInstallments(pricePerLesson, start, end, scheduledDayIndexes);
        }
    } catch (error) {
        console.error("Error generating installments:", error);
        return [];
    }
};

/**
 * Generates daily installments - one payment per lesson day.
 */
const generateDailyInstallments = (pricePerLesson, start, end, scheduledDayIndexes) => {
    const allDays = eachDayOfInterval({ start, end });
    const lessonDays = allDays.filter(day => scheduledDayIndexes.includes(getDay(day)));
    
    return lessonDays.map((day, index) => ({
        number: index + 1,
        amount: pricePerLesson,
        dueDate: format(day, 'yyyy-MM-dd'),
        status: 'Unpaid',
        frequency: 'daily'
    }));
};

/**
 * Generates weekly installments - one payment per week for all lessons in that week.
 */
const generateWeeklyInstallments = (pricePerLesson, start, end, scheduledDayIndexes) => {
    const allDays = eachDayOfInterval({ start, end });
    const lessonDays = allDays.filter(day => scheduledDayIndexes.includes(getDay(day)));
    
    // Group lesson days by week
    const weeksWithLessons = new Map();
    lessonDays.forEach(day => {
        const weekKey = format(startOfWeek(day, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        if (!weeksWithLessons.has(weekKey)) {
            weeksWithLessons.set(weekKey, []);
        }
        weeksWithLessons.get(weekKey).push(day);
    });
    
    // Create installments for each week
    const installments = [];
    let installmentNumber = 1;
    
    for (const [weekStart, weekLessonDays] of weeksWithLessons) {
        const lastLessonDay = weekLessonDays[weekLessonDays.length - 1]; // Last lesson day of the week
        const weeklyAmount = weekLessonDays.length * pricePerLesson;
        
        installments.push({
            number: installmentNumber,
            amount: weeklyAmount,
            dueDate: format(lastLessonDay, 'yyyy-MM-dd'),
            status: 'Unpaid',
            frequency: 'weekly'
        });
        installmentNumber++;
    }
    
    return installments;
};

/**
 * Generates monthly installments - one payment per 4 weeks for all lessons in that period.
 */
const generateMonthlyInstallments = (pricePerLesson, start, end, scheduledDayIndexes) => {
    const allDays = eachDayOfInterval({ start, end });
    const lessonDays = allDays.filter(day => scheduledDayIndexes.includes(getDay(day)));
    
    // Group lesson days by 4-week periods starting from the enrollment date
    const fourWeekPeriods = new Map();
    lessonDays.forEach(day => {
        // Calculate weeks from the actual enrollment date, not from start of week
        const weeksFromEnrollment = Math.floor(differenceInWeeks(day, start) / 4);
        const periodKey = weeksFromEnrollment.toString();
        
        if (!fourWeekPeriods.has(periodKey)) {
            fourWeekPeriods.set(periodKey, []);
        }
        fourWeekPeriods.get(periodKey).push(day);
    });
    
    // Create installments for each 4-week period
    const installments = [];
    let installmentNumber = 1;
    
    for (const [periodKey, periodLessonDays] of fourWeekPeriods) {
        if (periodLessonDays.length === 0) continue;
        
        const lastLessonDay = periodLessonDays[periodLessonDays.length - 1]; // Last lesson day of the period
        const periodAmount = periodLessonDays.length * pricePerLesson;
        
        installments.push({
            number: installmentNumber,
            amount: periodAmount,
            dueDate: format(lastLessonDay, 'yyyy-MM-dd'),
            status: 'Unpaid',
            frequency: 'monthly'
        });
        installmentNumber++;
    }
    
    return installments;
};

/**
 * Generates lessons automatically for a group based on its schedule.
 * @param {Object} group - The group object with schedule information.
 * @param {string} startDate - The start date in 'YYYY-MM-DD' format.
 * @param {string} endDate - The end date in 'YYYY-MM-DD' format.
 * @param {string} defaultStartTime - Default start time for lessons (e.g., '09:00').
 * @param {string} defaultEndTime - Default end time for lessons (e.g., '10:00').
 * @returns {Array} Array of lesson objects to be created.
 */
export const generateGroupLessons = (group, startDate, endDate, defaultStartTime = '09:00', defaultEndTime = '10:00') => {
    if (!group || !group.schedule || !group.schedule.days || group.schedule.days.length === 0) {
        return [];
    }

    try {
        const start = parseISO(startDate);
        const end = parseISO(endDate);

        if (start > end) return [];

        const scheduledDayIndexes = group.schedule.days.map(day => dayNameToIndex[day]).filter(d => d !== undefined);
        if (scheduledDayIndexes.length === 0) return [];

        const allDays = eachDayOfInterval({ start, end });
        const lessonDays = allDays.filter(day => scheduledDayIndexes.includes(getDay(day)));

        return lessonDays.map((day, index) => ({
            groupId: group.id,
            lessonDate: format(day, 'yyyy-MM-dd'),
            topic: `Lesson ${index + 1}`,
            startTime: group.schedule.startTime || defaultStartTime,
            endTime: group.schedule.endTime || defaultEndTime,
            status: 'Incomplete',
            attendance: {}
        }));

    } catch (error) {
        console.error("Error generating group lessons:", error);
        return [];
    }
};

/**
 * Generates lessons automatically for a tutoring student based on their schedule.
 * @param {Object} student - The student object with tutoring details.
 * @param {string} startDate - The start date in 'YYYY-MM-DD' format.
 * @param {string} endDate - The end date in 'YYYY-MM-DD' format.
 * @param {string} defaultStartTime - Default start time for lessons (e.g., '09:00').
 * @param {string} defaultEndTime - Default end time for lessons (e.g., '10:00').
 * @returns {Array} Array of lesson objects to be created.
 */
export const generateTutoringLessons = (student, startDate, endDate, defaultStartTime = '09:00', defaultEndTime = '10:00') => {
    if (!student || !student.tutoringDetails || !student.tutoringDetails.schedule || !student.tutoringDetails.schedule.days || student.tutoringDetails.schedule.days.length === 0) {
        console.warn('Tutoring student missing schedule details:', student?.fullName, student?.tutoringDetails);
        return [];
    }

    try {
        const start = parseISO(startDate);
        const end = parseISO(endDate);

        if (start > end) return [];

        const scheduledDayIndexes = student.tutoringDetails.schedule.days.map(day => dayNameToIndex[day]).filter(d => d !== undefined);
        if (scheduledDayIndexes.length === 0) {
            console.warn('No valid scheduled days found for student:', student.fullName, student.tutoringDetails.schedule.days);
            return [];
        }

        const allDays = eachDayOfInterval({ start, end });
        const lessonDays = allDays.filter(day => scheduledDayIndexes.includes(getDay(day)));

        // Use the student's schedule times, fallback to defaults
        const scheduleStartTime = student.tutoringDetails.schedule.startTime || defaultStartTime;
        const scheduleEndTime = student.tutoringDetails.schedule.endTime || defaultEndTime;

        console.log(`Generating lessons for ${student.fullName}:`, {
            scheduleDays: student.tutoringDetails.schedule.days,
            scheduleStartTime,
            scheduleEndTime,
            lessonDaysCount: lessonDays.length
        });

        return lessonDays.map((day, index) => ({
            studentId: student.id,
            lessonDate: format(day, 'yyyy-MM-dd'),
            topic: `Tutoring Session ${index + 1}`,
            startTime: scheduleStartTime,
            endTime: scheduleEndTime,
            status: 'Incomplete',
            attendance: {}
        }));

    } catch (error) {
        console.error("Error generating tutoring lessons:", error);
        return [];
    }
};

/**
 * Generates lessons for all groups and tutoring students within a date range.
 * @param {Array} groups - Array of group objects.
 * @param {Array} students - Array of student objects.
 * @param {string} startDate - The start date in 'YYYY-MM-DD' format.
 * @param {string} endDate - The end date in 'YYYY-MM-DD' format.
 * @param {string} defaultStartTime - Default start time for lessons.
 * @param {string} defaultEndTime - Default end time for lessons.
 * @returns {Object} Object containing group lessons and tutoring lessons.
 */
export const generateAllLessons = (groups, students, startDate, endDate, defaultStartTime = '09:00', defaultEndTime = '10:00') => {
    const groupLessons = [];
    const tutoringLessons = [];

    // Generate lessons for groups
    groups.forEach(group => {
        if (!group.isArchived) {
            const lessons = generateGroupLessons(group, startDate, endDate, defaultStartTime, defaultEndTime);
            groupLessons.push(...lessons);
        }
    });

    // Generate lessons for tutoring students
    students.forEach(student => {
        if (student.isTutoring && !student.isArchived) {
            const lessons = generateTutoringLessons(student, startDate, endDate, defaultStartTime, defaultEndTime);
            tutoringLessons.push(...lessons);
        }
    });

    return {
        groupLessons,
        tutoringLessons,
        totalLessons: groupLessons.length + tutoringLessons.length
    };
};
