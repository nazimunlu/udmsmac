
import { supabase } from './supabaseClient';

// Generic API client for Supabase
const apiClient = {
    // Fetch all records from a table
    getAll: async (tableName) => {
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) throw error;
        return data;
    },

    // Fetch a single record by ID
    getById: async (tableName, id) => {
        const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    },

    // Create a new record
    create: async (tableName, newData) => {
        const { data, error } = await supabase.from(tableName).insert(newData).single();
        if (error) throw error;
        return data;
    },

    // Update a record by ID
    update: async (tableName, id, updatedData) => {
        const { data, error } = await supabase.from(tableName).update(updatedData).eq('id', id).single();
        if (error) throw error;
        return data;
    },

    // Delete a record by ID
    delete: async (tableName, id) => {
        const { data, error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) throw error;
        return data;
    },

    // Fetch students with their group information
    getStudentsWithGroups: async () => {
        const { data, error } = await supabase.from('students').select(`
            *,
            group:groups(*)
        `);
        if (error) throw error;
        return data;
    },

    // Fetch groups with their student count
    getGroupsWithStudentCount: async () => {
        const { data, error } = await supabase.rpc('get_groups_with_student_count');
        if (error) throw error;
        return data;
    },
};

export default apiClient;
