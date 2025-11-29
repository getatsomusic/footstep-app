import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Project, ProjectStats, Task, User, UserRole, ClientRole, AppFile } from '../types';
import { PostgrestError } from '@supabase/supabase-js';

// --- SERVICE FUNCTIONS ---

// 1. PROJECT STATS
export const getProjectStats = async (projectId: string): Promise<ProjectStats | null> => {
    if (!isSupabaseConfigured) return null;
    try {
        const { data, error } = await supabase!
            .from('project_stats')
            .select('*')
            .eq('project_id', projectId) // Måste matcha Supabase kolumnnamn
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }

        // Map database fields (snake_case) tillbaka till TypeScript interface (camelCase)
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
        
        const { error, status } = await supabase!
            .from('project_stats')
            .upsert(dbPayload, { onConflict: 'project_id' }); // Använd upsert för att skapa/uppdatera

        if (error) throw error;
        return status === 201 || status === 204; // 201 Created, 204 No Content (Success)
    } catch (error) {
        console.error('Error saving project stats:', error);
        return false;
    }
};

// 2. USER FUNCTIONS
export async function fetchUserProfile(uid: string): Promise<User | null> {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase!
        .from('users')
        .select('*')
        .eq('id', uid)
        .single();
    
    if (error && (error as PostgrestError).code !== 'PGRST116') {
        console.error('Kunde inte hämta användarprofil:', error);
        return null;
    }
    
    // Map data from Supabase (assuming same column names)
    return data ? (data as User) : null;
}

export async function fetchAllUsers(): Promise<User[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase!
        .from('users')
        .select('*');
    if (error) {
        console.error('Kunde inte hämta alla användare:', error);
        return [];
    }
    return (data as User[]) || [];
}

export async function updateUserInDB(updatedUser: Partial<User>): Promise<boolean> {
    if (!isSupabaseConfigured || !updatedUser.id) return false;
    try {
        const { error, status } = await supabase!
            .from('users')
            .update(updatedUser)
            .eq('id', updatedUser.id);
        
        if (error) throw error;
        return status === 204;
    } catch (error) {
        console.error('Kunde inte uppdatera användare:', error);
        return false;
    }
}

export async function deleteUserFromDB(userId: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
        const { error, status } = await supabase!
            .from('users')
            .delete()
            .eq('id', userId);
        
        if (error) throw error;
        return status === 204;
    } catch (error) {
        console.error('Kunde inte ta bort användare:', error);
        return false;
    }
}

// 3. PROJECT FUNCTIONS
export async function fetchAllProjects(): Promise<Project[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase!
        .from('projects')
        .select('*');
    if (error) {
        console.error('Kunde inte hämta projekt:', error);
        return [];
    }
    return (data as Project[]) || []; 
}

export async function createProject(newProject: Omit<Project, 'id'>): Promise<Project | null> {
    if (!isSupabaseConfigured) return null;
    // Låt Supabase generera ID:et om inte ett skickas med.
    const { data, error } = await supabase!
        .from('projects')
        .insert(newProject) 
        .select()
        .single();
        
    if (error) {
        console.error('Kunde inte skapa projekt:', error);
        return null;
    }
    return data as Project;
}

// 4. TASK FUNCTIONS
export async function fetchAllTasks(): Promise<Task[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase!
        .from('tasks')
        .select('*');
    if (error) {
        console.error('Kunde inte hämta uppgifter:', error);
        return [];
    }
    return (data as Task[]) || [];
}

export async function addTaskToDB(task: Omit<Task, 'id'>): Promise<Task | null> {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase!
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

export async function updateTaskInDB(task: Partial<Task> & { id: string }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
        const { error, status } = await supabase!
            .from('tasks')
            .update(task)
            .eq('id', task.id);
        
        if (error) throw error;
        return status === 204;
    } catch (error) {
        console.error('Kunde inte uppdatera uppgift:', error);
        return false;
    }
}

// 5. FILE HANDLING (Supabase Storage)
// OBS: Denna funktion kräver att du har en Supabase Storage Bucket!
export const handleUploadFile = async (file: File, projectId: string, userId: string): Promise<AppFile | null> => {
    if (!isSupabaseConfigured) return null;
    const filePath = `${projectId}/${userId}/${Date.now()}-${file.name}`;
    
    try {
        // Ladda upp filen till Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase!.storage
            .from('app-files') // Byt ut 'app-files' mot ditt Bucket-namn
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Få den publika URL:en (eller signerad URL om du använder RLS)
        const { data: urlData } = supabase!.storage
            .from('app-files')
            .getPublicUrl(filePath);

        // Spara filmetadata i databasen (t.ex. i en 'files'-tabell)
        const newFile: Omit<AppFile, 'id'> = {
            name: file.name,
            projectId: projectId,
            uploadedBy: userId,
            url: urlData.publicUrl,
            mimeType: file.type,
            timestamp: new Date().toISOString()
        };

        const { data: fileData, error: fileError } = await supabase!
            .from('files') // Byt ut 'files' mot ditt tabellnamn för filmetadata
            .insert(newFile)
            .select()
            .single();

        if (fileError) throw fileError;

        return fileData as AppFile;

    } catch (error) {
        console.error("Fel vid filuppladdning eller metadata-lagring:", error);
        return null;
    }
};

export const handleDeleteFile = async (fileId: string, filePath: string): Promise<boolean> => {
    if (!isSupabaseConfigured) return false;
    try {
        // 1. Ta bort från databasen (metadata)
        const { error: dbError } = await supabase!
            .from('files') // Ditt metadata-tabellnamn
            .delete()
            .eq('id', fileId);

        if (dbError) throw dbError;

        // 2. Ta bort från Storage
        const { error: storageError } = await supabase!.storage
            .from('app-files') // Ditt Bucket-namn
            .remove([filePath]); // filePath måste vara sökvägen till filen i storage

        if (storageError) throw storageError;

        return true;
    } catch (error) {
        console.error("Fel vid filborttagning:", error);
        return false;
    }
};
