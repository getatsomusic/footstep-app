
import { supabase } from '../lib/supabaseClient';
import { ProjectStats } from '../types';

/**
 * Fetch project statistics from Supabase
 * @param projectId The ID of the project to fetch stats for
 */
export const getProjectStats = async (projectId: string): Promise<ProjectStats | null> => {
  try {
    const { data, error } = await supabase
      .from('project_stats')
      .select('*')
      .eq('project_id', projectId) // Mapping to snake_case column in DB
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Map database fields back to TypeScript interface (camelCase)
    // Assuming JSONB columns store the arrays directly
    return {
      projectId: data.project_id,
      projectName: data.project_name,
      streams: data.streams || [],
      revenue: data.revenue || [],
      followers: data.followers || [],
      mentions: data.mentions || []
    };
  } catch (error) {
    console.error('Error fetching project stats:', error);
    return null;
  }
};

/**
 * Save or Update project statistics in Supabase
 * @param stats The stats object to save
 */
export const saveProjectStats = async (stats: ProjectStats): Promise<boolean> => {
  try {
    // Map TypeScript interface to database columns (snake_case)
    const dbPayload = {
      project_id: stats.projectId,
      project_name: stats.projectName,
      streams: stats.streams,
      revenue: stats.revenue,
      followers: stats.followers,
      mentions: stats.mentions
    };

    const { error } = await supabase
      .from('project_stats')
      .upsert(dbPayload, { onConflict: 'project_id' });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving project stats:', error);
    return false;
  }
};
