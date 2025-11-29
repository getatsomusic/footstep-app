import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Project, ProjectStats, Task, User, UserRole, ClientRole } from '../types';
import { PostgrestError } from '@supabase/supabase-js'; // Lägg till denna import för bättre felhantering

// --- SERVICE FUNCTIONS ---

// 1. PROJECT STATS (Din befintliga kod, nu integrerad med isSupabaseConfigured)
export const getProjectStats = async (projectId: string): Promise<ProjectStats | null> => {
    if (!isSupabaseConfigured) return null;
    try {
        const { data, error } = await supabase
            .from('project_stats')
            .select('*')
            .eq('project_id', projectId) // Mapping till snake_case
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }

        // Map database fields tillbaka till TypeScript interface (camelCase)
        return {
            projectId: data.project_id,
            projectName: data.project_name,
            streams: data.streams || [],
            revenue: data.revenue || [],
            followers: data.followers || [],
            mentions: data.mentions || []
        } as ProjectStats;
    } catch (error) {
        console.error('Error fetching project stats:', error);
        return null;
    }
};

export const saveProjectStats = async (stats: ProjectStats): Promise<boolean> => {
    if (!isSupabaseConfigured) return false;
    try {
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

// 2. FETCH USER PROFILE (Ny: Viktig för att ladda User-objektet från profiles-tabellen)
export async function fetchUserProfile(userId: string): Promise<User | null> {
    if (!isSupabaseConfigured) return null;
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, email, name, role, client_role, project_id, avatar') // Välj kolumner du behöver
            .eq('id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Profil hittades ej
            throw error;
        }

        if (profile) {
            // Mappar databasprofilen (snake_case) till din app-User-typ (camelCase)
            return {
                id: profile.id,
                email: profile.email,
                name: profile.name || 'Användare',
                role: (profile.role as UserRole) || UserRole.CLIENT, // Måste kasta till din enum
                clientRole: (profile.client_role as ClientRole) || ClientRole.GUEST, // Måste kasta till din enum
                projectId: profile.project_id,
                avatar: profile.avatar || '',
            } as User;
        }
        return null;
    } catch (error) {
        console.error('Kunde inte hämta profil:', error);
        return null;
    }
}


// 3. PROJECT FUNCTIONS (Ny: För att ladda/spara projekt)
export async function fetchAllProjects(): Promise<Project[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
        .from('projects')
        .select('*');
    if (error) {
        console.error('Kunde inte hämta projekt:', error);
        return [];
    }
    // OBS: Antar att kolumnnamnen i Supabase (t.ex. 'id', 'name') matchar din Project-typ
    return (data as Project[]) || []; 
}

export async function createProject(newProject: Project): Promise<Project | null> {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase
        .from('projects')
        .insert({ id: newProject.id, name: newProject.name }) // Mappa manuellt vid behov
        .select()
        .single();
    if (error) {
        console.error('Kunde inte skapa projekt:', error);
        return null;
    }
    return data as Project;
}

// 4. TASK FUNCTIONS (Ny: För att ladda/spara uppgifter)
export async function fetchAllTasks(): Promise<Task[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
        .from('tasks')
        .select('*');
    if (error) {
        console.error('Kunde inte hämta uppgifter:', error);
        return [];
    }
    // OBS: Antar att kolumnnamnen i Supabase matchar din Task-typ
    return (data as Task[]) || [];
}

export async function addTaskToDB(task: Task): Promise<Task | null> {
    if (!isSupabaseConfigured) return null;
    // Du kanske måste mappa Task-objektet till snake_case här,
    // men vi testar direktinsättning först.
    const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();
    if (error) {
        console.error('Kunde inte lägga till uppgift:', error);
        return null;
    }
    return data as Task;
}
