import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle, MessageCircle, X } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';

// =================================================================
// 1. TYPDEFINITIONER (Hämtade från den tidigare './types' filen)
// =================================================================

export enum UserRole {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    CLIENT = 'CLIENT',
}

export enum ClientRole {
    PRIMARY = 'PRIMARY',
    GUEST = 'GUEST',
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    clientRole: ClientRole;
    projectId: string | null;
    avatar: string; // URL or identifier
}

export interface Project {
    id: string;
    name: string;
    clientIds: string[];
}

export interface Task {
    id: string;
    projectId: string;
    title: string;
    description: string;
    dueDate: string;
    isCompleted: boolean;
    completedAt: string | null;
}

export interface ProjectStats {
    projectId: string;
    projectName: string;
    streams: { date: string; value: number }[];
    revenue: { date: string; value: number }[];
    followers: { date: string; value: number }[];
    mentions: { date: string; value: number }[];
}

export interface ChatMessage {
    id: string;
    channelId: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: string;
}

export interface BroadcastMessage {
    id: string;
    text: string;
    timestamp: string;
}

export interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
}

export interface ChatChannel {
    id: string;
    name: string;
    type: 'GENERAL' | 'PROJECT';
}

export interface ClientChannel {
    id: string;
    name: string;
    projectId: string;
    memberIds: string[];
}

export interface AppFile {
    id: string;
    name: string;
    url: string;
    projectId: string;
    uploadedBy: string;
    uploadedAt: string;
    size: number;
    type: string;
}

export interface AppNotification {
    id: string;
    userId: string;
    message: string;
    isRead: boolean;
    timestamp: string;
    channelId?: string;
}

export interface SearchResult {
    id: string;
    type: 'User' | 'Project' | 'Task';
    title: string;
    description: string;
}

// =================================================================
// 2. SUPABASE KLIENT (Mockad/Förenklad från './lib/supabaseClient')
// =================================================================

// Vi antar att Supabase inte är konfigurerat för att undvika beroende av externa variabler.
export const isSupabaseConfigured = false; 
export const supabase = {
    auth: {
        // Mock-implementationer för auth-funktioner
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => ({ error: null }),
        resetPasswordForEmail: async (_email: string, _options?: any) => ({ error: null }),
    },
};


// =================================================================
// 3. DATABASSÄKERHET (Mockad/Förenklad från './services/databaseService')
// =================================================================

// Mock-data för databasfunktioner
const MOCK_USER: User = { 
    id: 'mock-admin', 
    email: 'admin@mock.com', 
    name: 'Mock Admin', 
    role: UserRole.ADMIN, 
    clientRole: ClientRole.GUEST, 
    projectId: null, 
    avatar: ''
};

const MOCK_PROJECTS: Project[] = [
    { id: 'proj-1', name: 'Alpha Launch', clientIds: ['client-1'] },
    { id: 'proj-2', name: 'Beta Expansion', clientIds: ['client-2'] },
];

const MOCK_TASKS: Task[] = [
    { id: 't1', projectId: 'proj-1', title: 'Start Campaign', description: 'Launch social media campaign.', dueDate: '2025-12-15', isCompleted: false, completedAt: null },
    { id: 't2', projectId: 'proj-2', title: 'Review Budget', description: 'Final sign-off on Q4 budget.', dueDate: '2025-12-01', isCompleted: true, completedAt: '2025-11-20' },
];


export async function fetchUserProfile(userId: string): Promise<User | null> {
    if (userId === 'mock-admin') return MOCK_USER;
    // Simulerar att hitta en klientprofil vid uppdatering
    if (userId === 'client-1') {
         return { ...MOCK_USER, id: 'client-1', name: 'Mock Client 1', role: UserRole.CLIENT, clientRole: ClientRole.PRIMARY, projectId: 'proj-1' };
    }
    return null;
}

export async function fetchAllProjects(): Promise<Project[]> {
    return MOCK_PROJECTS;
}

export async function fetchAllUsers(): Promise<User[]> {
    return [
        MOCK_USER, 
        { ...MOCK_USER, id: 'client-1', name: 'Mock Client 1', role: UserRole.CLIENT, clientRole: ClientRole.PRIMARY, projectId: 'proj-1' },
    ];
}

export async function fetchAllTasks(): Promise<Task[]> {
    return MOCK_TASKS;
}

export async function getProjectStats(projectId: string): Promise<ProjectStats | null> {
    if (projectId === 'proj-1') {
        return {
            projectId: 'proj-1',
            projectName: 'Alpha Launch',
            streams: [], revenue: [], followers: [], mentions: []
        };
    }
    return null;
}

export async function saveProjectStats(stats: ProjectStats): Promise<boolean> {
    return true; // Mock success
}

export async function addTaskToDB(task: Task): Promise<Task | null> {
    return { ...task, id: crypto.randomUUID() }; // Mock return with ID
}

export async function createProject(newProject: Project): Promise<Project | null> {
    return { ...newProject, id: newProject.id || crypto.randomUUID() };
}

export async function updateUserInDB(updatedUser: Partial<User>): Promise<User | null> {
    return { ...MOCK_USER, ...updatedUser } as User; // Mock update
}

export async function deleteUserFromDB(userId: string): Promise<boolean> {
    return true; // Mock success
}


// =================================================================
// 4. PLATHÅLLARKOMPONENTER (Hämtade från de tidigare importerade filerna)
// =================================================================

// --- Auth Component ---
const Auth: React.FC<{ onLogin: (user: any, profile: User) => void }> = ({ onLogin }) => {
    const mockLogin = () => {
        // Simulerar en inloggad admin
        const mockProfile: User = { 
            id: 'mock-admin', 
            email: 'admin@mock.com', 
            name: 'Mock Admin', 
            role: UserRole.ADMIN, 
            clientRole: ClientRole.GUEST, 
            projectId: null, 
            avatar: '' 
        };
        onLogin({ id: mockProfile.id }, mockProfile);
    };

    const mockClientLogin = () => {
        // Simulerar en inloggad klient (används för att testa klientvyn och kraschfixen)
        const mockProfile: User = { 
            id: 'client-1', 
            email: 'client@mock.com', 
            name: 'Mock Client 1', 
            role: UserRole.CLIENT, 
            clientRole: ClientRole.PRIMARY, 
            projectId: 'proj-1', // Viktigt att ha ett projekt-ID
            avatar: '' 
        };
        onLogin({ id: mockProfile.id }, mockProfile);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-blue-600 mb-6">Logga in</h2>
                <p className="text-center text-gray-500 mb-8">Simulerar inloggning då Supabase inte är konfigurerat.</p>
                <div className="space-y-4">
                    <button 
                        onClick={mockLogin} 
                        className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition duration-150"
                    >
                        Logga in (Simulera som Admin)
                    </button>
                    <button 
                        onClick={mockClientLogin} 
                        className="w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition duration-150"
                    >
                        Logga in (Simulera som Klient)
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- InternalDashboard Component ---
const InternalDashboard: React.FC<any> = ({ currentUser, onLogout }) => {
    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <header className="p-4 bg-white shadow-md flex justify-between items-center">
                <h1 className="text-xl font-bold text-blue-600">Intern Kontrollpanel</h1>
                <div className="flex items-center space-x-4">
                    <span className="text-gray-700">Välkommen, {currentUser.name} ({currentUser.role})</span>
                    <button onClick={onLogout} className="text-red-500 hover:text-red-700 font-semibold">Logga ut</button>
                </div>
            </header>
            <main className="p-6 overflow-y-auto">
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-lg" role="alert">
                    <p className="font-bold">Platshållare</p>
                    <p>Detta är InternalDashboard-komponenten. Fullständig logik är ej implementerad här. Appen kompilerar nu!</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-5 rounded-lg shadow">Aktiva Projekt: {MOCK_PROJECTS.length}</div>
                    <div className="bg-white p-5 rounded-lg shadow">Användare Totalt: 2+</div>
                    <div className="bg-white p-5 rounded-lg shadow">Oavslutade Uppgifter: 1</div>
                </div>
            </main>
        </div>
    );
};

// --- ClientPortal Component ---
const ClientPortal: React.FC<{ currentUser: User, project?: Project, onLogout: () => void }> = ({ currentUser, project, onLogout }) => {
    return (
        <div className="flex flex-col h-screen bg-gray-100">
            <header className="p-4 bg-blue-600 shadow-md flex justify-between items-center text-white">
                <h1 className="text-xl font-bold">Klientportal: {project?.name || 'Laddar Projekt...'}</h1>
                <div className="flex items-center space-x-4">
                    <span className="font-light">Välkommen, {currentUser.name}</span>
                    <button onClick={onLogout} className="py-1 px-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold transition duration-150">Logga ut</button>
                </div>
            </header>
            <main className="p-6 overflow-y-auto">
                <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-900 p-4 mb-6 rounded-lg" role="alert">
                    <p className="font-bold">Platshållare</p>
                    <p>Detta är ClientPortal-komponenten. Den är nu säker att ladda även utan projektdata. Appen kompilerar!</p>
                </div>
                
                {project ? (
                    <div className="text-center p-10 bg-white rounded-lg shadow">
                        <p className="text-lg font-semibold text-blue-600">Ditt Projekt: {project.name}</p>
                        <p className="text-gray-600 mt-2">Du kan nu uppdatera sidan utan att appen kraschar.</p>
                    </div>
                ) : (
                    <div className="text-center p-10 bg-white rounded-lg shadow">
                        <p className="text-red-500 font-semibold">Väntar på projektinformation. Vänligen kontakta support om detta kvarstår efter siduppdatering.</p>
                    </div>
                )}
            </main>
        </div>
    );
};


// =================================================================
// 5. HUVUDAPPLIKATIONEN (App.tsx)
// =================================================================


// --- TOAST COMPONENT ---
const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

    return (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-xl text-white ${bgColor} flex items-center space-x-3 z-[1000]`}>
            {type === 'success' ? <CheckCircle size={20} /> : <X size={20} />}
            <span className="font-semibold">{message}</span>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
                <X size={16} />
            </button>
        </div>
    );
};

// --- LOADING SPINNER COMPONENT ---
const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);


// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS); // Startar med mock-projekt för att minimera kraschrisk
    const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
    const [stats, setStats] = useState<ProjectStats[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
    const [channels, setChannels] = useState<ChatChannel[]>([{ id: 'general', name: 'Allmämt', type: 'GENERAL' }]);
    const [clientChannels, setClientChannels] = useState<ClientChannel[]>([]);
    const [files, setFiles] = useState<AppFile[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false); 

    // Helper functions for Toast
    const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });
    const closeToast = () => setToast(null);

    // --- AUTH HANDLERS ---
    const handleLogout = useCallback(async () => {
        setIsLoading(true);
        if (isSupabaseConfigured) {
            await supabase.auth.signOut();
        }
        setCurrentUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        showToast('Du har loggats ut.', 'success');
        // Nollställ all app-state vid utloggning
        setUsers([]);
        setProjects(MOCK_PROJECTS);
        setTasks(MOCK_TASKS);
        setStats([]);
        setEvents([]);
        setMessages([]);
        setBroadcasts([]);
        setChannels([{ id: 'general', name: 'Allmämt', type: 'GENERAL' }]);
        setClientChannels([]);
        setFiles([]);
        setNotifications([]);
        setIsDataLoaded(false);
    }, []);

    const handleLogin = useCallback((user: SupabaseUser, profile: User) => {
        setCurrentUser(profile);
        setIsAuthenticated(true);
        showToast(`Välkommen, ${profile.name}!`, 'success');
        // loadInitialData kommer att köras via onAuthStateChange
    }, []);

    const handleChangePassword = async (email: string) => {
        if (!isSupabaseConfigured) {
            showToast('Databas ej konfigurerad.', 'error');
            return;
        }
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });

            if (error) throw error;
            showToast('Lösenordsåterställningslänk skickad till din e-post.', 'success');
        } catch (error) {
            console.error('Lösenordsåterställningsfel:', error);
            showToast('Kunde inte skicka återställningslänk. Kontrollera e-postadressen.', 'error');
        }
    };


    // --- DATA FETCHING ---
    const loadInitialData = useCallback(async (user: SupabaseUser) => {
        // Hoppa över databas-hämtning om Supabase inte är konfigurerat.
        if (!isSupabaseConfigured) {
             // Simulerar att en klient-användare loggar in vid uppdatering
             const mockClientProfile: User = { 
                id: 'client-1', 
                email: 'client@mock.com', 
                name: 'Mock Client 1', 
                role: UserRole.CLIENT, 
                clientRole: ClientRole.PRIMARY, 
                projectId: 'proj-1', 
                avatar: ''
            };
            setCurrentUser(mockClientProfile);
            setProjects(MOCK_PROJECTS);
            setUsers(await fetchAllUsers());
            setTasks(MOCK_TASKS);
            setIsDataLoaded(true);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        
        const profile = await fetchUserProfile(user.id);
        if (profile) {
            setCurrentUser(profile);
            
            const [allProjects, allUsers] = await Promise.all([
                fetchAllProjects(),
                fetchAllUsers(),
            ]);

            setProjects(allProjects);
            setUsers(allUsers);

            if (profile.role === UserRole.ADMIN || profile.role === UserRole.MANAGER) {
                const [allTasks] = await Promise.all([
                    fetchAllTasks(),
                ]);
                setTasks(allTasks);
            } else if (profile.projectId) {
                const clientStats = await getProjectStats(profile.projectId);
                if (clientStats) {
                    setStats([clientStats]);
                }
                const allTasks = await fetchAllTasks();
                setTasks(allTasks.filter(t => t.projectId === profile.projectId));
            }
            
            setIsDataLoaded(true); 
        } else {
            console.warn("Profil kunde inte hittas. Loggar ut.");
            handleLogout();
        }

        setIsLoading(false);
    }, [handleLogout]);

    // --- AUTH STATE LISTENER (Huvudflödet) ---
    useEffect(() => {
        if (!isSupabaseConfigured) {
            setIsLoading(false);
            showToast('OBS: Supabase är inte konfigurerat. Appen körs i Mock-läge. Klicka på "Logga in" för att simulera.', 'error');
            return;
        }

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                loadInitialData(session.user);
            } else if (event === 'SIGNED_OUT') {
                setCurrentUser(null);
                setIsAuthenticated(false);
                setIsLoading(false);
            } else if (event === 'INITIAL_SESSION' && session?.user) {
                // Detta hanterar siduppdateringar.
                loadInitialData(session.user);
            } else {
                setIsLoading(false);
            }
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [loadInitialData]);


    // --- CRUD AND LOGIC HANDLERS (Simulerade) ---
    const handleUpdateUser = async (updatedUser: Partial<User>) => { const result = await updateUserInDB(updatedUser); if (result) { setUsers(prev => prev.map(u => u.id === result.id ? result : u)); if (currentUser && currentUser.id === result.id) { setCurrentUser(result); } showToast('Användarprofil uppdaterad!', 'success'); return true; } showToast('Kunde inte uppdatera användaren.', 'error'); return false; };
    const handleCreateUser = async (profile: Partial<User>) => { showToast('Användaren skapades (simulerat).', 'success'); return true; };
    const handleDeleteUser = async (userId: string) => { const success = await deleteUserFromDB(userId); if (success) { setUsers(prev => prev.filter(u => u.id !== userId)); showToast('Användaren har tagits bort.', 'success'); return true; } showToast('Kunde inte ta bort användaren.', 'error'); return false; };
    const handleCreateProject = async (name: string) => { const newProject: Project = { id: crypto.randomUUID(), name, clientIds: [] }; const result = await createProject(newProject); if (result) { setProjects(prev => [...prev, result]); showToast('Projekt skapat!', 'success'); return result; } showToast('Kunde inte skapa projekt.', 'error'); return null; };
    const handleUpdateStats = async (newStats: ProjectStats) => { const success = await saveProjectStats(newStats); if (success) { setStats(prev => { const index = prev.findIndex(s => s.projectId === newStats.projectId); if (index > -1) { return prev.map((s, i) => i === index ? newStats : s); } return [...prev, newStats]; }); showToast('Statistik uppdaterad!', 'success'); return true; } showToast('Kunde inte spara statistik.', 'error'); return false; };
    const handleCreateTask = async (task: Task) => { const result = await addTaskToDB(task); if (result) { setTasks(prev => [...prev, result]); showToast('Uppgift skapad!', 'success'); return true; } showToast('Kunde inte skapa uppgift.', 'error'); return false; };
    const handleCompleteTask = async (taskId: string) => { setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted: true, completedAt: new Date().toISOString() } : t)); showToast('Uppgift slutförd!', 'success'); return true; };
    const handleSendMessage = (message: ChatMessage) => { setMessages(prev => [...prev, message]); showToast('Meddelande skickat!', 'success'); };
    const handleCreateClientChannel = (channel: ClientChannel) => { setClientChannels(prev => [...prev, channel]); showToast(`Kanalen "${channel.name}" skapad.`, 'success'); };
    const handleUpdateClientChannel = (channel: ClientChannel) => { setClientChannels(prev => prev.map(c => c.id === channel.id ? channel : c)); showToast('Kanal uppdaterad.', 'success'); };
    const handleDeleteClientChannel = (channelId: string) => { setClientChannels(prev => prev.filter(c => c.id !== channelId)); showToast('Kanal borttagen.', 'success'); };
    const handleClearChannelNotifications = (channelId: string) => { setNotifications(prev => prev.filter(n => n.channelId !== channelId)); };
    const handleUploadFile = (file: File, projectId: string) => { const newFile: AppFile = { id: crypto.randomUUID(), name: file.name, url: `mock-url/${file.name}`, projectId: projectId, uploadedBy: currentUser?.id || 'unknown', uploadedAt: new Date().toISOString(), size: file.size, type: file.type, }; setFiles(prev => [...prev, newFile]); showToast('Fil uppladdad (simulerat).', 'success'); };
    const handleDeleteFile = (fileId: string) => { setFiles(prev => prev.filter(f => f.id !== fileId)); showToast('Fil borttagen.', 'success'); };
    const handleGlobalSearch = (query: string): SearchResult[] => { if (!query) return []; const lowerQuery = query.toLowerCase(); const userResults = users.filter(u => u.name.toLowerCase().includes(lowerQuery) || u.email.toLowerCase().includes(lowerQuery)).map(u => ({ id: u.id, type: 'User', title: u.name, description: u.email })); const taskResults = tasks.filter(t => t.title.toLowerCase().includes(lowerQuery) || t.description.toLowerCase().includes(lowerQuery)).map(t => ({ id: t.id, type: 'Task', title: t.title, description: t.description })); return [...userResults, ...taskResults]; };


    // --- RENDER LOGIC ---

    // Vänta tills vi vet autentiseringsstatus OCH data har laddats
    if (isLoading || (isAuthenticated && !isDataLoaded)) {
        return <LoadingSpinner />;
    }

    if (!currentUser) {
        return <Auth onLogin={handleLogin} />;
    }
    
    const isClient = currentUser.role === UserRole.CLIENT;
    
    // Klienter som inte har ett projectId (t.ex. vid fel i profilregistrering)
    if (isClient && !currentUser.projectId) {
        return <div className="p-8 text-center text-red-600">
            <h1 className="text-2xl font-bold">Felaktig Användarprofil</h1>
            <p>Din användarprofil saknar kopplat projekt-ID. Vänligen kontakta en administratör.</p>
        </div>;
    }

    // FIX: Denna hittar projektet säkert och kan vara 'undefined' utan att krascha
    const clientProject = isClient ? projects.find(p => p.id === currentUser.projectId) : undefined;

    return (
        <>
            {toast && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={closeToast} 
                />
            )}
            
            {currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER ? (
                <InternalDashboard 
                    currentUser={currentUser}
                    users={users}
                    projects={projects}
                    tasks={tasks}
                    stats={stats}
                    events={events}
                    messages={messages}
                    broadcasts={broadcasts}
                    channels={channels}
                    clientChannels={clientChannels}
                    files={files}
                    notifications={notifications}
                    onCreateProject={handleCreateProject}
                    onCreateTask={handleCreateTask}
                    onUpdateTask={handleCompleteTask} 
                    onUpdateUser={handleUpdateUser}
                    onDeleteUser={handleDeleteUser}
                    onCreateUser={handleCreateUser} 
                    onLogout={handleLogout}
                    onSendMessage={handleSendMessage}
                    onUploadFile={(f, pId) => handleUploadFile(f, pId)}
                    onDeleteFile={handleDeleteFile}
                    onCreateChannel={handleCreateClientChannel}
                    onUpdateChannel={handleUpdateClientChannel}
                    onDeleteChannel={handleDeleteClientChannel}
                    onClearChannelNotifications={handleClearChannelNotifications}
                    onUpdateStats={handleUpdateStats}
                    onChangePassword={handleChangePassword}
                    onSearch={handleGlobalSearch}
                />
            ) : (
                // Klientvy
                <ClientPortal 
                    currentUser={currentUser}
                    project={clientProject} // Säkert värde, undefined om projektet inte laddats än
                    stats={stats.find(s => s.projectId === currentUser.projectId)}
                    tasks={tasks.filter(t => t.projectId === currentUser.projectId)}
                    events={events}
                    messages={messages}
                    broadcasts={broadcasts}
                    files={files.filter(f => f.projectId === currentUser.projectId)}
                    clientChannels={clientChannels}
                    notifications={notifications}
                    onSendMessage={handleSendMessage}
                    onLogout={handleLogout}
                    onCompleteTask={handleCompleteTask}
                    onUpdateUser={handleUpdateUser}
                    onUploadFile={(f) => handleUploadFile(f, currentUser.projectId as string)} 
                    onDeleteFile={handleDeleteFile}
                    onCreateChannel={handleCreateClientChannel}
                    onUpdateChannel={handleUpdateClientChannel}
                    onDeleteChannel={handleDeleteClientChannel}
                    onClearChannelNotifications={handleClearChannelNotifications}
                    onChangePassword={handleChangePassword}
                    onSearch={handleGlobalSearch}
                />
            )}
        </>
    );
};

export default App;
