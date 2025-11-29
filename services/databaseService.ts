import { supabase, checkSupabaseReady } from '../lib/supabaseClient';
import { Project, ProjectStats, Task, User, UserRole, ClientRole } from '../types';

// Observera: Denna fil antar att du har en databasstruktur med tabeller som:
// - projects
// - project_stats
// - tasks
// - users
// Kolla att dina kolumnnamn i Supabase är snake_case (t.ex. project_id, project_name)

// Funktion för att mappa databasens snake_case till TS camelCase (ProjectStats)
const mapStatsFromDB = (data: any): ProjectStats => ({
    projectId: data.project_id,
    projectName: data.project_name,
    streams: data.streams || [],
    revenue: data.revenue || [],
    followers: data.followers || [],
    mentions: data.mentions || [],
});

// Funktion för att mappa TS camelCase till databasens snake_case (ProjectStats)
const mapStatsToDB = (stats: ProjectStats) => ({
    project_id: stats.projectId,
    project_name: stats.projectName,
    streams: stats.streams,
    revenue: stats.revenue,
    followers: stats.followers,
    mentions: stats.mentions,
});

// Funktion för att mappa databasens snake_case till TS camelCase (User)
// OBS: Måste matcha din faktiska 'users'-tabell i Supabase
const mapUserFromDB = (data: any): User => ({
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role as UserRole,
    clientRole: data.client_role as ClientRole,
    projectId: data.project_id,
});

// Funktion för att mappa TS camelCase till databasens snake_case (User)
const mapUserToDB = (user: Partial<User>) => ({
    // ID och email är ofta primärnycklar/auth-fält som inte uppdateras direkt här
    name: user.name,
    role: user.role,
    client_role: user.clientRole, // Mappar clientRole -> client_role
    project_id: user.projectId, // Mappar projectId -> project_id
});


// 1. PROJECT STATS
export const getProjectStats = async (projectId: string): Promise<ProjectStats | null> => {
    if (!checkSupabaseReady()) return null;
    try {
        const { data, error } = await supabase
            .from('project_stats')
            .select('*')
            .eq('project_id', projectId) // Använder snake_case
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found (PostgREST error code)
            throw error;
        }

        return mapStatsFromDB(data);
    } catch (error) {
        console.error('Fel vid hämtning av projektstatistik:', error);
        return null;
    }
};

export const saveProjectStats = async (stats: ProjectStats): Promise<boolean> => {
    if (!checkSupabaseReady()) return false;
    try {
        const dbPayload = mapStatsToDB(stats);
        
        const { error } = await supabase
            .from('project_stats')
            .upsert(dbPayload, { onConflict: 'project_id' }); // Använd upsert för att antingen uppdatera eller infoga

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Fel vid sparande av projektstatistik:', error);
        return false;
    }
};

// 2. PROJECT FUNCTIONS
export async function fetchAllProjects(): Promise<Project[]> {
    if (!checkSupabaseReady()) return [];
    const { data, error } = await supabase
        .from('projects')
        .select('*');
    if (error) {
        console.error('Kunde inte hämta projekt:', error);
        return [];
    }
    // Antar att 'projects'-tabellen har kolumner som matchar Project-typen direkt (id, name, description, etc.)
    // Om du har snake_case här (t.ex. 'start_date', 'end_date') MÅSTE du lägga till en mappningsfunktion här.
    return (data as Project[]) || []; 
}

export async function createProject(newProject: Project): Promise<Project | null> {
    if (!checkSupabaseReady()) return null;
    const { data, error } = await supabase
        .from('projects')
        .insert(newProject) // Förutsätter att newProject matchar databaskolumnerna
        .select()
        .single();
    if (error) {
        console.error('Kunde inte skapa projekt:', error);
        return null;
    }
    return data as Project;
}

// 3. TASK FUNCTIONS
export async function fetchAllTasks(): Promise<Task[]> {
    if (!checkSupabaseReady()) return [];
    const { data, error } = await supabase
        .from('tasks')
        .select('*');
    if (error) {
        console.error('Kunde inte hämta uppgifter:', error);
        return [];
    }
    // Antar att 'tasks'-tabellen har kolumner som matchar Task-typen
    return (data as Task[]) || [];
}

export async function addTaskToDB(task: Task): Promise<Task | null> {
    if (!checkSupabaseReady()) return null;
    // En uppgift kanske har 'project_id' i databasen men 'projectId' i Task-typen.
    // Lägg till mappning här om nödvändigt.
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

// 4. USER FUNCTIONS (Använder nu mappningsfunktioner)

export async function fetchUserProfile(userId: string): Promise<User | null> {
    if (!checkSupabaseReady()) return null;
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Kunde inte hämta användarprofil:', error);
        return null;
    }
    
    return mapUserFromDB(data);
}

export async function fetchAllUsers(): Promise<User[]> {
    if (!checkSupabaseReady()) return [];
    // Denna funktion ska endast anropas av Admin/Manager för att hämta alla
    const { data, error } = await supabase
        .from('users')
        .select('*');
        
    if (error) {
        console.error('Kunde inte hämta alla användare:', error);
        return [];
    }

    return (data || []).map(mapUserFromDB);
}

export async function updateUserInDB(user: Partial<User>): Promise<boolean> {
    if (!checkSupabaseReady() || !user.id) return false;
    
    // Mappa TS-objektet till DB-format och exkludera 'id' från uppdateringen
    const dbPayload = mapUserToDB(user);
    
    const { error } = await supabase
        .from('users')
        .update(dbPayload)
        .eq('id', user.id);
        
    if (error) {
        console.error('Kunde inte uppdatera användare:', error);
        return false;
    }
    return true;
}

export async function deleteUserFromDB(userId: string): Promise<boolean> {
    if (!checkSupabaseReady()) return false;
    
    // OBS: Det är ofta bättre att mjuka-radera (soft delete) användare i produktion.
    // Denna funktion raderar användaren permanent från 'users'-tabellen.
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
        
    if (error) {
        console.error('Kunde inte ta bort användare:', error);
        return false;
    }
    return true;
}

// Lägg till fler CRUD-funktioner för meddelanden, events, etc. här.
