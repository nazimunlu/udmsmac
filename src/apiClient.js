
import { supabase } from './supabaseClient';
import { convertKeysToCamelCase, convertKeysToSnakeCase } from './utils/caseConverter';

// Generic API client for Supabase
const apiClient = {
    // Fetch all records from a table
    getAll: async (tableName) => {
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) throw error;
        return convertKeysToCamelCase(data);
    },

    // Fetch a single record by ID
    getById: async (tableName, id) => {
        const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
        if (error) throw error;
        return convertKeysToCamelCase(data);
    },

    // Create a new record
    create: async (tableName, newData) => {
        console.log('apiClient.create called with:', { tableName, newData: JSON.stringify(newData, null, 2) });
        const snakeCaseData = convertKeysToSnakeCase(newData);
        console.log('Converted to snake_case:', JSON.stringify(snakeCaseData, null, 2));
        const { data, error } = await supabase.from(tableName).insert(snakeCaseData).select().single();
        console.log('Supabase response:', { data, error });
        if (error) throw error;
        const result = convertKeysToCamelCase(data);
        console.log('Final result:', result);
        return result;
    },

    // Update a record by ID
    update: async (tableName, id, updatedData) => {
        const snakeCaseData = convertKeysToSnakeCase(updatedData);
        const { data, error } = await supabase.from(tableName).update(snakeCaseData).eq('id', id).single();
        if (error) throw error;
        return convertKeysToCamelCase(data);
    },

    // Delete a record by ID
    delete: async (tableName, id) => {
        const { data, error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) throw error;
        return convertKeysToCamelCase(data);
    },

    // Fetch students with their group information
    getStudentsWithGroups: async () => {
        const { data, error } = await supabase.from('students').select(`
            *,
            group:groups(*)
        `);
        if (error) throw error;
        return convertKeysToCamelCase(data);
    },

    // Fetch groups with their student count
    getGroupsWithStudentCount: async () => {
        const { data, error } = await supabase.rpc('get_groups_with_student_count');
        if (error) throw error;
        return convertKeysToCamelCase(data);
    },
};

export default apiClient;
