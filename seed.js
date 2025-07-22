
const { createClient } = require('@supabase/supabase-js');

// Manually configure Supabase client for the script
const supabaseUrl = 'https://xsukqhvchoknflfqolgy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzdWtxaHZjaG9rbmZsZnFvbGd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjkzODI2MCwiZXhwIjoyMDY4NTE0MjYwfQ.9_x_G4D8t3m1JpS_s-A4a6xJ2H5yO3n3I-y_s-vG2gY'; // Replace with your service_role key
const supabase = createClient(supabaseUrl, supabaseKey);

const seedDatabase = async () => {
    try {
        // Seed Groups
        const { data: groups, error: groupsError } = await supabase.from('groups').insert([
            { group_name: 'Morning Group', color: '#4A90E2', schedule: { days: ['Mon', 'Wed', 'Fri'], startTime: '09:00', endTime: '11:00' } },
            { group_name: 'Afternoon Group', color: '#F5A623', schedule: { days: ['Tue', 'Thu'], startTime: '14:00', endTime: '16:00' } },
        ]).select();

        if (groupsError) throw groupsError;
        console.log('Groups seeded:', groups);

        // Seed Students
        const { data: students, error: studentsError } = await supabase.from('students').insert([
            { full_name: 'John Doe', student_contact: '123-456-7890', group_id: groups[0].id },
            { full_name: 'Jane Smith', student_contact: '098-765-4321', group_id: groups[1].id },
            { full_name: 'Peter Jones', student_contact: '555-555-5555', is_tutoring: true },
        ]).select();

        if (studentsError) throw studentsError;
        console.log('Students seeded:', students);

        console.log('Database seeding completed successfully!');
    } catch (error) {
        console.error('Error seeding database:', error);
    }
};

seedDatabase();
