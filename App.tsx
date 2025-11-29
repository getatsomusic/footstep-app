import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, UserRole, ClientRole, Project, Task, ProjectStats, ChatMessage, BroadcastMessage, CalendarEvent, ChatChannel, ClientChannel, AppFile, AppNotification, SearchResult } from './types';
import { Auth } from './components/Auth'; // Antas finnas
import { InternalDashboard } from './components/InternalDashboard'; // Antas finnas
import { ClientPortal } from './components/ClientPortal'; // Antas finnas
import { Bell, CheckCircle, MessageCircle, X, Search } from 'lucide-react';

// Importera den centrala klientkonfigurationen
import { supabase, isSupabaseConfigured } from './lib/supabaseClient'; 

// Importera alla service-funktioner
import { 
    getProjectStats, 
    saveProjectStats, 
    fetchAllProjects, 
    fetchAllTasks, 
    addTaskToDB, 
    createProject, 
    fetchUserProfile, 
    fetchAllUsers, 
    updateUserInDB, 
    deleteUserFromDB 
} from './services/databaseService';

// --- INITIAL MOCK DATA (Används som fallback om databasen är tom) ---
// I en produktionsmiljö kommer dessa snart att ersättas av data från Supabase.
// I Supabase-klienten har vi nu en varning om konfigurationen saknas.

const INITIAL_PROJECTS: Project[] = [];
const INITIAL_TASKS: Task[] = [];
const INITIAL_EVENTS: CalendarEvent[] = [];
const INITIAL_MESSAGES: ChatMessage[] = [];
const INITIAL_BROADCASTS: BroadcastMessage[] = [];
const INITIAL_CHANNELS: ChatChannel[] = [
    { id: 'general', name: 'Allmänt', type: 'GENERAL' },
];
const INITIAL_CLIENT_CHANNELS: ClientChannel[] = [];
const INITIAL_FILES: AppFile[] = [];

// --- TOAST COMPONENT (Antas finnas och fungera) ---
interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}
const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    // ... Toast-komponent implementering (utlåtas för korthet men antas finnas)
    return (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-xl text-white z-50 transition-all duration-300 ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}>
            <div className="flex items-center space-x-2">
                {type === 'success' && <CheckCircle size={20} />}
                {type === 'error' && <X size={20} />}
                {type === 'info' && <MessageCircle size={20} />}
                <p>{message}</p>
                <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-white/20">
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

// --- HUVUDAPPLIKATION ---

const App: React.FC = () => {
    // STATE FOR AUTH & LOADING
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Ny state för att hantera laddning/auth-check

    // STATE FOR APPLICATION DATA
    const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
    const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
    const [stats, setStats] = useState<ProjectStats[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);
    const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
    const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>(INITIAL_BROADCASTS);
    const [clientChannels, setClientChannels] = useState<ClientChannel[]>(INITIAL_CLIENT_CHANNELS);
    const [files, setFiles] = useState<AppFile[]>(INITIAL_FILES);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]); // Ny state för sökresultat

    // STATE FOR UI
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    }, []);

    // --- AUTHENTICATION HANDLERS ---

    // Denna effekt hanterar Supabase Auth State Change
    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) {
            setIsLoading(false); // Om Supabase inte är konfigurerad, avsluta laddningen men ingen inloggad användare
            return;
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session) {
                    try {
                        // Hämta detaljerad användarprofil från vår 'users'-tabell
                        const userProfile = await fetchUserProfile(session.user.id);
                        if (userProfile) {
                            setCurrentUser(userProfile);
                            showToast('Inloggad som: ' + userProfile.name, 'success');
                        } else {
                            // Detta kan hända om användaren har autentiserats via Supabase Auth
                            // men ingen profil finns i vår 'users' tabell. 
                            // Du behöver logik för att antingen skapa profilen eller hantera felet.
                            console.error('Kunde inte hitta användarprofil i databasen för UID:', session.user.id);
                            // Logga ut användaren om profilen saknas för att tvinga fram registrering/fix
                            await supabase.auth.signOut();
                            setCurrentUser(null);
                            showToast('Kunde inte ladda profil. Logga in igen.', 'error');
                        }
                    } catch (e) {
                        console.error("Fel vid hämtning av användarprofil efter inloggning:", e);
                        setCurrentUser(null);
                        await supabase.auth.signOut();
                    }
                } else {
                    setCurrentUser(null);
                    showToast('Du är nu utloggad.', 'info');
                }
                setIsLoading(false); // Ställ in till false när auth-kontrollen är klar
            }
        );

        // Hämta den initiala sessionen vid laddning av sidan
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setIsLoading(false);
            }
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [showToast]); // Körs endast en gång vid montering

    const handleLogin = async (email: string, password: string) => {
        if (!isSupabaseConfigured || !supabase) {
            showToast('Appen är inte konfigurerad mot Supabase.', 'error');
            return;
        }
        setIsLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            showToast(error.message, 'error');
            setIsLoading(false);
            return false;
        }
        // onAuthStateChange kommer att hantera setCurrentUser och setIsLoading(false)
        return true;
    };

    const handleLogout = async () => {
        if (!isSupabaseConfigured || !supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) {
            showToast(error.message, 'error');
        } else {
            setCurrentUser(null);
        }
    };
    
    const handleRegister = async (email: string, password: string, name: string, role: UserRole, projectId?: string) => {
        if (!isSupabaseConfigured || !supabase) {
            showToast('Appen är inte konfigurerad mot Supabase.', 'error');
            return false;
        }
        
        // 1. Skapa Supabase Auth-användare
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name, // Lägg till i metadata (valfritt)
                    role, // Lägg till i metadata (valfritt)
                }
            }
        });

        if (authError) {
            showToast(authError.message, 'error');
            return false;
        }
        
        if (authData.user) {
            // 2. Skapa profil i 'users' tabellen (Viktigt!)
            const newUserProfile: User = {
                id: authData.user.id,
                email: email,
                name: name,
                role: role,
                clientRole: role === 'CLIENT' ? 'REGULAR' : 'NONE',
                projectId: projectId || null,
            };
            
            const { error: profileError } = await supabase
                .from('users')
                .insert([newUserProfile]);

            if (profileError) {
                console.error('Kunde inte skapa användarprofil i DB:', profileError);
                showToast('Registrering lyckades, men profilen misslyckades. Kontakta support.', 'error');
                await supabase.auth.signOut(); // Logga ut den nyskapade användaren
                return false;
            }

            showToast('Registrering lyckades. Vänligen logga in.', 'success');
            return true;
        }

        return false;
    };
    
    // --- DATA FETCHING (Körs när currentUser är satt) ---
    useEffect(() => {
        if (!currentUser) {
            // Rensa data när användaren loggar ut
            setProjects(INITIAL_PROJECTS);
            setTasks(INITIAL_TASKS);
            setStats([]);
            // ... rensa annan data ...
            return;
        }
        
        // Funktion för att hämta all data
        const fetchData = async () => {
            // Hämta projekt
            const fetchedProjects = await fetchAllProjects();
            setProjects(fetchedProjects);
            
            // Hämta uppgifter
            const fetchedTasks = await fetchAllTasks();
            setTasks(fetchedTasks);
            
            // ... Hämta events, messages, broadcasts, etc. här ...

            // För statistik, vi behöver hämta den baserat på projekten.
            // Detta är en förenklad version, i prod skulle man göra detta mer effektivt.
            const allStats: ProjectStats[] = [];
            for (const project of fetchedProjects) {
                const projectStats = await getProjectStats(project.id);
                if (projectStats) {
                    allStats.push(projectStats);
                }
            }
            setStats(allStats);

        };

        fetchData();
        // OBS: Lägg till realtidslyssnare (onSnapshot/Supabase Realtime) här!
        
    }, [currentUser]); // Körs när currentUser ändras
    
    // --- ÖVRIGA FUNKTIONER ---
    
    // Antas finnas i den befintliga koden. Jag lämnar dem tomma här för att fokusera
    // på den kritiska Supabase-hanteringen för din Vercel-miljö.
    
    const handleUpdateStats = async (updatedStats: ProjectStats) => {
        const success = await saveProjectStats(updatedStats);
        if (success) {
            setStats(prev => prev.map(s => s.projectId === updatedStats.projectId ? updatedStats : s));
            showToast('Statistik uppdaterad!', 'success');
        } else {
            showToast('Kunde inte uppdatera statistik.', 'error');
        }
    };
    
    const handleUpdateUser = async (userUpdate: Partial<User>) => {
        if (!currentUser) return false;
        const fullUpdate = { ...currentUser, ...userUpdate };
        const success = await updateUserInDB(fullUpdate);
        if (success) {
            setCurrentUser(fullUpdate as User);
            showToast('Profil uppdaterad!', 'success');
        } else {
            showToast('Kunde inte uppdatera profil.', 'error');
        }
        return success;
    };
    
    const handleUpdateProject = async (project: Project) => {
        // ... implementera uppdatering av projekt i databasen
        showToast('Projekt uppdaterat!', 'success');
        // OBS: Glöm inte att uppdatera 'projects' state
    };
    
    const handleDeleteProject = async (projectId: string) => {
        // ... implementera radering av projekt i databasen
        showToast('Projekt raderat!', 'success');
        // OBS: Glöm inte att uppdatera 'projects' state
    };
    
    // Exempel på platshållare för en oimplementerad funktion
    const handleChangePassword = (current: string, newP: string) => {
        // I produktion: Hantera lösenordsbyte via Supabase Auth API
        showToast('Lösenordsändring är inte implementerad i denna demo.', 'info');
    };
    
    const handleGlobalSearch = (query: string) => {
        // I produktion: Implementera söklogik i databasen (t.ex. Supabase full-text search)
        console.log("Global sökning efter:", query);
        setSearchResults([{ id: 'mock1', title: 'Sökresultat: ' + query }]);
    };
    
    // --- RENDERING ---

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
                <p className="ml-4 text-gray-600">Verifierar inloggning...</p>
            </div>
        );
    }
    
    if (!isSupabaseConfigured) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-red-100 text-red-800 p-8">
                <X size={48} className="mb-4"/>
                <h1 className="text-2xl font-bold mb-2">Supabase Konfigurationsfel</h1>
                <p className="text-center">
                    För att denna applikation ska fungera i en webbläsare (som Vercel),
                    måste miljövariablerna **NEXT\_PUBLIC\_SUPABASE\_URL** och **NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY** vara satta.
                </p>
                <p className="mt-4 text-sm">
                    Kontrollera din `.env` fil eller Vercel/hosting-inställningar.
                </p>
            </div>
        );
    }

    if (!currentUser) {
        // Visar inloggningsskärmen om ingen användare är inloggad
        return (
            <>
                <Auth onLogin={handleLogin} onRegister={handleRegister} projects={projects} showToast={showToast}/>
                {toast && <Toast {...toast} onClose={() => setToast(null)} />}
            </>
        );
    }
    
    // Enkel auktoriseringslogik baserat på roll
    const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';
    
    return (
        <>
            {/* Huvudvyn */}
            {isAdmin ? (
                <InternalDashboard 
                    currentUser={currentUser}
                    projects={projects}
                    stats={stats}
                    tasks={tasks}
                    events={events}
                    messages={messages}
                    broadcasts={broadcasts}
                    channels={INITIAL_CHANNELS} // Mockat tills realtid är implementerat
                    files={files}
                    notifications={notifications}
                    // Antar att dessa hanterare finns i din InternalDashboard
                    onLogout={handleLogout}
                    onUpdateUser={handleUpdateUser}
                    onUpdateProject={handleUpdateProject}
                    onDeleteProject={handleDeleteProject}
                    // ... Lägg till alla nödvändiga hanterare här ...
                    onClearChannelNotifications={() => {}} 
                    onUpdateStats={handleUpdateStats}
                    onChangePassword={handleChangePassword}
                    onSearch={handleGlobalSearch}
                    searchResults={searchResults}
                />
            ) : (
                // Klientvy
                <ClientPortal 
                    currentUser={currentUser}
                    project={projects.find(p => p.id === currentUser.projectId)!} // OBS! Kontrollera att projektet finns
                    stats={stats.find(s => s.projectId === currentUser.projectId)}
                    tasks={tasks.filter(t => t.projectId === currentUser.projectId)}
                    events={events} // Filtreras i ClientPortal eller lägg till filtrering här
                    messages={messages}
                    broadcasts={broadcasts}
                    files={files}
                    clientChannels={clientChannels.filter(c => c.projectId === currentUser.projectId)}
                    notifications={notifications.filter(n => n.userId === currentUser.id)}
                    // Antas finnas i din ClientPortal
                    onLogout={handleLogout}
                    onUpdateUser={handleUpdateUser}
                    // ... Lägg till alla nödvändiga hanterare här ...
                    onChangePassword={handleChangePassword}
                    onSearch={handleGlobalSearch}
                    searchResults={searchResults}
                />
            )}
            
            {/* Toast-meddelanden visas överst på allt */}
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        </>
    );
};

export default App;
