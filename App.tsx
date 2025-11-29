
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, ClientRole, Project, Task, ProjectStats, ChatMessage, BroadcastMessage, CalendarEvent, ChatChannel, ClientChannel, AppFile, AppNotification, SearchResult } from './types';
import { Auth } from './components/Auth';
import { InternalDashboard } from './components/InternalDashboard';
import { ClientPortal } from './components/ClientPortal';
import { Bell, CheckCircle, MessageCircle, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { 
    getProjectStats, 
    saveProjectStats, 
    fetchAllProjects, 
    fetchAllTasks, 
    addTaskToDB, 
    createProject, 
    fetchUserProfile, 
    fetchAllUsers, // Vi lägger till denna också för admins
    updateUserInDB, // Ny funktion för att uppdatera användarprofil
    deleteUserFromDB // Ny funktion för att ta bort användare
} from './services/databaseService';

// --- INITIAL MOCK DATA ---
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

// --- TOAST COMPONENT ---
const NotificationToast: React.FC<{ notifications: AppNotification[], onDismiss: (id: string) => void }> = ({ notifications, onDismiss }) => {
    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
            {notifications.map(n => (
                <div key={n.id} className="pointer-events-auto bg-black/80 backdrop-blur-xl text-white p-4 rounded-2xl shadow-2xl border border-white/10 animate-slide-up flex gap-3 items-start relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                    <div className="p-2 bg-white/10 rounded-full shrink-0">
                        {n.type === 'MESSAGE' ? <MessageCircle size={18}/> : n.type === 'TASK' ? <CheckCircle size={18}/> : <Bell size={18}/>}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm">{n.title}</h4>
                        <p className="text-xs text-gray-300 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                    </div>
                    <button onClick={() => onDismiss(n.id)} className="text-gray-400 hover:text-white transition-colors p-1"><X size={14}/></button>
                </div>
            ))}
        </div>
    )
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]); // In real app, fetch from DB
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [stats, setStats] = useState<ProjectStats[]>([]);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>(INITIAL_BROADCASTS);
  const [chatChannels, setChatChannels] = useState<ChatChannel[]>(INITIAL_CHANNELS);
  const [clientChannels, setClientChannels] = useState<ClientChannel[]>(INITIAL_CLIENT_CHANNELS);
  const [files, setFiles] = useState<AppFile[]>(INITIAL_FILES);
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  
  const [adminViewProject, setAdminViewProject] = useState<Project | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // --- SUPABASE AUTH LISTENER ---
  useEffect(() => {
    if (!isSupabaseConfigured) {
        setIsLoadingAuth(false);
        return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        
        // 1. Fetch Profile from DB
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profile) {
            // Transform DB profile to App User
            const mappedUser: User = {
                id: session.user.id,
                email: session.user.email!,
                name: profile.name || session.user.user_metadata?.full_name || 'Användare',
                role: (profile.role as UserRole) || UserRole.CLIENT,
                clientRole: profile.client_role as ClientRole,
                projectId: profile.project_id,
                avatar: profile.avatar || '',
                // Other fields would also be mapped from DB
            };
            setCurrentUser(mappedUser);
            // Optionally fetch global users list if Admin
        } else {
            // Fallback for first time login if trigger hasn't run or manual insertion needed
             const fallbackUser: User = {
                id: session.user.id,
                email: session.user.email!,
                name: session.user.user_metadata?.full_name || 'Användare',
                role: UserRole.CLIENT, // Default to lowest priv
                avatar: '',
            };
            setCurrentUser(fallbackUser);
        }

      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setAdminViewProject(null);
      }
      setIsLoadingAuth(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // --- FETCH STATS ON LOAD ---
  useEffect(() => {
      if (!isSupabaseConfigured) return;

      // In a real scenario, we would loop through visible projects and fetch their stats
      // For this demo/code update, we check if the user has a project and fetch it
      if (currentUser?.projectId) {
          getProjectStats(currentUser.projectId).then(data => {
              if (data) {
                  setStats(prev => {
                      // replace or add
                      const existing = prev.filter(s => s.projectId !== data.projectId);
                      return [...existing, data];
                  });
              }
          });
      }
  }, [currentUser]);

    // --- FETCH ALL INITIAL DATA (PROJECTS, TASKS, USERS) ---
useEffect(() => {
    if (!isSupabaseConfigured) return;

    const loadInitialData = async () => {
        // Kör alla hämtningar parallellt för snabb laddning
        const [projectsData, tasksData, usersData] = await Promise.all([
            fetchAllProjects(),
            fetchAllTasks(),
            fetchAllUsers(), // Hämta alla användare/profiler
            // Lägg till fetchAllEvents(), fetchAllMessages(), etc. här senare
        ]);
        
        setProjects(projectsData);
        setTasks(tasksData);
        setUsers(usersData); // Sätt den globala användarlistan
    };

    if (currentUser && currentUser.role !== UserRole.CLIENT) {
        // Endast admin/manager hämtar all data initialt
        loadInitialData();
    }
    // För klienter hämtas data baserat på deras projectId (gjort senare)
}, [currentUser]);

  useEffect(() => {
      if (toasts.length > 0) {
          const timer = setTimeout(() => {
              setToasts(prev => prev.slice(1));
          }, 4000);
          return () => clearTimeout(timer);
      }
  }, [toasts]);

  const addNotification = (type: 'MESSAGE' | 'TASK' | 'SYSTEM', title: string, message: string, linkTo?: string) => {
      const newNotif: AppNotification = {
          id: Date.now().toString(),
          type, title, message, timestamp: new Date().toISOString(), linkTo
      };
      setNotifications(prev => [...prev, newNotif]);
      setToasts(prev => [...prev, newNotif]);
  };

  const handleClearChannelNotifications = (linkTo: string) => {
      setNotifications(prev => prev.filter(n => n.linkTo !== linkTo));
  }

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
        // Supabase auth listener kommer att hantera rensningen av currentUser och AdminViewProject.
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Logout Error:", error);
            // Fallback: rensa state manuellt om Supabase failar
            setCurrentUser(null);
            setAdminViewProject(null);
        }
    } else {
        // Om Supabase inte är konfigurerad (Mock-läge)
        setCurrentUser(null);
        setAdminViewProject(null);
    }
};

  // --- FILTERED DATA FOR MANAGERS ---
  const visibleProjects = useMemo(() => {
      if (!currentUser) return [];
      if (currentUser.role === UserRole.OWNER) return projects;
      if (currentUser.role === UserRole.MANAGER) {
          return projects.filter(p => currentUser.assignedProjects?.includes(p.id));
      }
      return []; 
  }, [currentUser, projects]);

  const visibleProjectIds = useMemo(() => visibleProjects.map(p => p.id), [visibleProjects]);

  const visibleStats = useMemo(() => {
      return stats.filter(s => visibleProjectIds.includes(s.projectId));
  }, [stats, visibleProjectIds]);

  const visibleUsers = useMemo(() => {
    if (!currentUser || currentUser.role === UserRole.OWNER) return users;
    if (currentUser.role === UserRole.MANAGER) {
        return users.filter(u => 
            u.role === UserRole.OWNER || u.role === UserRole.MANAGER || 
            (u.projectId && visibleProjectIds.includes(u.projectId))
        );
    }
    return [];
  }, [users, currentUser, visibleProjectIds]);

  const visibleTasks = useMemo(() => {
      return tasks.filter(t => t.projectId === 'internal' || visibleProjectIds.includes(t.projectId));
  }, [tasks, visibleProjectIds]);

  const visibleFiles = useMemo(() => {
      return files.filter(f => f.projectId === 'internal' || visibleProjectIds.includes(f.projectId));
  }, [files, visibleProjectIds]);

  const visibleEvents = useMemo(() => {
      return events.filter(e => e.projectId === 'internal' || visibleProjectIds.includes(e.projectId));
  }, [events, visibleProjectIds]);

  // --- SEARCH LOGIC ---
  const handleGlobalSearch = (query: string): SearchResult[] => {
      if (!query.trim() || !currentUser) return [];
      const q = query.toLowerCase();
      const results: SearchResult[] = [];

      const isOwner = currentUser.role === UserRole.OWNER;
      const isManager = currentUser.role === UserRole.MANAGER;
      const isClient = currentUser.role === UserRole.CLIENT;
      const isGuest = currentUser.clientRole === ClientRole.GUEST;

      if (isOwner || isManager) {
          visibleProjects.forEach(p => {
              if (p.name.toLowerCase().includes(q)) {
                  results.push({ id: p.id, type: 'PROJECT', title: p.name, subtitle: 'Projekt', data: p, linkTo: p.id });
              }
          });
      }

      const tasksToSearch = isClient 
        ? tasks.filter(t => t.projectId === currentUser.projectId)
        : visibleTasks;
      
      tasksToSearch.forEach(t => {
          if (t.title.toLowerCase().includes(q)) {
              results.push({ id: t.id, type: 'TASK', title: t.title, subtitle: `Status: ${t.status}`, data: t, linkTo: t.projectId });
          }
      });

      const filesToSearch = isClient 
        ? files.filter(f => f.projectId === currentUser.projectId)
        : visibleFiles;
      
      filesToSearch.forEach(f => {
          if (f.name.toLowerCase().includes(q)) {
              results.push({ id: f.id, type: 'FILE', title: f.name, subtitle: f.type.toUpperCase(), data: f });
          }
      });

      let msgsToSearch: ChatMessage[] = [];
      if (isClient) {
          msgsToSearch = messages.filter(m => m.projectId === currentUser.projectId);
          if (isGuest && currentUser.allowedChannels) {
              msgsToSearch = msgsToSearch.filter(m => currentUser.allowedChannels!.includes(m.room));
          }
      } else {
          msgsToSearch = messages.filter(m => m.projectId === 'internal' || visibleProjectIds.includes(m.projectId));
      }

      msgsToSearch.forEach(m => {
          if (m.content.toLowerCase().includes(q)) {
              results.push({ id: m.id, type: 'MESSAGE', title: m.userName, subtitle: m.content, data: m, linkTo: m.room });
          }
      });
      
       const eventsToSearch = isClient 
        ? events.filter(e => e.projectId === currentUser.projectId)
        : visibleEvents;
        
       eventsToSearch.forEach(e => {
           if (e.title.toLowerCase().includes(q)) {
               results.push({ id: e.id, type: 'EVENT', title: e.title, subtitle: e.startDate, data: e });
           }
       });

      return results.slice(0, 10);
  };

  const handleUpdateStats = async (projectId: string, type: 'revenue' | 'streams' | 'followers', value: any, dateOrPlatform?: string) => {
    if (currentUser?.role !== UserRole.OWNER && currentUser?.role !== UserRole.MANAGER) return;

    // We need to clone the stats state to update locally, then save to DB
    const currentProjectStatsIndex = stats.findIndex(s => s.projectId === projectId);
    let updatedStats: ProjectStats;

    if (currentProjectStatsIndex === -1) {
        // Create new stats object if doesn't exist (edge case)
        updatedStats = {
            projectId,
            projectName: projects.find(p => p.id === projectId)?.name || 'Unknown',
            revenue: [],
            streams: [],
            followers: [],
            mentions: []
        };
    } else {
        updatedStats = { ...stats[currentProjectStatsIndex] };
    }

    // Apply updates locally
    if (type === 'revenue') {
        const exists = updatedStats.revenue.find(r => r.month === dateOrPlatform);
        updatedStats.revenue = exists 
            ? updatedStats.revenue.map(r => r.month === dateOrPlatform ? { ...r, value: Number(value) } : r)
            : [...updatedStats.revenue, { month: dateOrPlatform || 'Unknown', value: Number(value) }];
    } 
    else if (type === 'streams') {
        const exists = updatedStats.streams.find(st => st.date === dateOrPlatform);
            updatedStats.streams = exists 
            ? updatedStats.streams.map(st => st.date === dateOrPlatform ? { ...st, value: Number(value) } : st)
            : [...updatedStats.streams, { date: dateOrPlatform || 'Unknown', value: Number(value) }];
    }
    else if (type === 'followers') {
            const exists = updatedStats.followers.find(f => f.platform === dateOrPlatform);
            updatedStats.followers = exists 
            ? updatedStats.followers.map(f => f.platform === dateOrPlatform ? { ...f, count: Number(value) } : f)
            : [...updatedStats.followers, { platform: dateOrPlatform || 'Unknown', count: Number(value) }];
    }

    // Save to State
    setStats(prev => {
        if (currentProjectStatsIndex === -1) return [...prev, updatedStats];
        const newArr = [...prev];
        newArr[currentProjectStatsIndex] = updatedStats;
        return newArr;
    });

    // Save to Database
    if (isSupabaseConfigured) {
        await saveProjectStats(updatedStats);
    }
  }

  // ... (Other handlers like handleAddTask, handleSendMessage, etc. remain similar but would eventually need their own DB calls) ...
  // For brevity in this specific update, only ProjectStats persistence is fully implemented in DB as requested.
  // The rest rely on React State for the session duration.

 const handleAddTask = async (newTask: Task) => {
    if (currentUser?.role !== UserRole.OWNER && currentUser?.role !== UserRole.MANAGER) return;
    
    // 1. Spara uppgiften i Supabase och få tillbaka det sparade objektet
    const savedTask = await addTaskToDB(newTask);

    if (savedTask) {
        // 2. Uppdatera lokalt state med den sparade versionen
        setTasks(prev => [savedTask, ...prev]);
        
        // 3. Lägg till notifikation
        if (savedTask.assigneeId === currentUser?.id) {
            addNotification('TASK', 'Ny uppgift', `Du har tilldelats: ${savedTask.title}`);
        } 
    }
};

  const handleUpdateTask = (updatedTask: Task) => setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  const handleDeleteTask = (taskId: string) => (currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER) && setTasks(prev => prev.filter(t => t.id !== taskId));
  const handleCompleteTask = (taskId: string) => setTasks(prev => prev.map(t => t.id === taskId ? {...t, status: 'DONE'} : t));

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser && currentUser.id === updatedUser.id) setCurrentUser(updatedUser);
  };
  const handleChangePassword = (userId: string, newPass: string) => setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPass } : u));
  const handleAdminUpdateUser = (updatedUser: User) => {
      if (currentUser?.role !== UserRole.OWNER && currentUser?.role !== UserRole.MANAGER) return;
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };
  const handleDeleteUser = (userId: string) => {
      if (currentUser?.role !== UserRole.OWNER) return;
      setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleCreateProject = async (projectName: string) => {
    if (currentUser?.role !== UserRole.OWNER && currentUser?.role !== UserRole.MANAGER) return;
    
    // Använd UUID för att garantera unikt ID och gör funktionen async
    const newProjectId = crypto.randomUUID(); 
    // Skapa ett objekt som matchar din databasstruktur
    const newProject: Project = { id: newProjectId, name: projectName, members: [] }; 
    
    // 1. Spara projektet i Supabase och få tillbaka det sparade objektet
    const savedProject = await createProject(newProject); 

    if (savedProject) {
        // 2. Uppdatera lokalt state med den sparade versionen
        setProjects(prev => [...prev, savedProject]);
        
        // 3. Skapa och spara initial statistik för det nya projektet
        const newStats: ProjectStats = { projectId: newProjectId, projectName: projectName, streams: [], revenue: [], followers: [], mentions: [] };
        setStats(prev => [...prev, newStats]);
        await saveProjectStats(newStats); 
        
        // 4. Skapa en allmän kanal för projektet (ej permanent än)
        setClientChannels(prev => [...prev, { id: 'general', name: 'General', projectId: newProjectId, icon: 'MessageSquare' }]);
    }
};

  const handleDeleteProject = (projectId: string) => {
      if (currentUser?.role !== UserRole.OWNER) return;
      setProjects(prev => prev.filter(p => p.id !== projectId));
      // In real app, delete from DB
  };

  const handleAddUser = (newUser: any) => {
    if (currentUser?.role !== UserRole.OWNER && currentUser?.role !== UserRole.MANAGER) return;
    const id = `u-${Date.now()}`;
    setUsers(prev => [...prev, { id, ...newUser, avatar: '', lastSeen: new Date().toISOString() }]);
  };

  const handleMarkAllAsRead = () => {
    setNotifications([]);
    if (!currentUser) return;
    handleUpdateUser({ ...currentUser, lastSeen: new Date().toISOString() });
  };

  const handleAddEvent = (event: CalendarEvent) => (currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER) && setEvents(prev => [...prev, event]);
  const handleDeleteEvent = (eventId: string) => (currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER) && setEvents(prev => prev.filter(e => e.id !== eventId));

  const handleUploadFile = (file: File, projectId: string) => {
      if (!currentUser) return;
      const type = file.type.startsWith('image') ? 'image' : file.type.startsWith('audio') ? 'audio' : file.type.startsWith('video') ? 'video' : 'document';
      const newFile: AppFile = { id: Date.now().toString(), name: file.name, type, url: URL.createObjectURL(file), size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, uploadedBy: currentUser.id, projectId, createdAt: new Date().toISOString() };
      setFiles(prev => [newFile, ...prev]);
      return newFile;
  }
  const handleDeleteFile = (fileId: string) => {
      if (!currentUser) return;
      const file = files.find(f => f.id === fileId);
      if (!file) return;
      if (currentUser.role === UserRole.OWNER || currentUser.role === UserRole.MANAGER || (currentUser.role === UserRole.CLIENT && file.uploadedBy === currentUser.id)) {
          setFiles(prev => prev.filter(f => f.id !== fileId));
      }
  }

  const handleSendMessage = (text: string, room: string, attachment?: AppFile) => {
    if (!currentUser) return;
    const projectId = currentUser.role === UserRole.CLIENT ? currentUser.projectId || 'p1' : (adminViewProject ? adminViewProject.id : 'internal');
    const newMsg: ChatMessage = { id: Date.now().toString(), userId: currentUser.id, userName: currentUser.name, content: text, timestamp: new Date().toISOString(), room, projectId, attachment };
    setMessages(prev => [...prev, newMsg]);
  };

  const handleSendBroadcast = (message: string, targetProjectId: string) => {
    if (currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER) {
        setBroadcasts(prev => [{ id: Date.now().toString(), message, targetProjectId, createdAt: new Date().toISOString(), authorName: currentUser.name }, ...prev]);
    }
  }

  const handleCreateChannel = (c: ChatChannel) => (currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER) && setChatChannels(prev => [...prev, c]);
  const handleCreateClientChannel = (name: string, pid: string) => setClientChannels(prev => [...prev, { id: name.toLowerCase().replace(/\s/g, '-'), name, projectId: pid, icon: 'MessageSquare' }]);
  const handleUpdateClientChannel = (cid: string, name: string) => setClientChannels(prev => prev.map(c => c.id === cid ? { ...c, name } : c));
  const handleDeleteClientChannel = (cid: string) => setClientChannels(prev => prev.filter(c => c.id !== cid));

  if (isLoadingAuth) {
      return <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]"><div className="animate-spin text-gray-400"><svg className="h-8 w-8" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg></div></div>;
  }

  if (!currentUser) {
    return <Auth />;
  }

  return (
      <>
        <NotificationToast notifications={toasts} onDismiss={(id) => setToasts(prev => prev.filter(n => n.id !== id))} />
        
        {(currentUser.role === UserRole.OWNER || currentUser.role === UserRole.MANAGER) ? (
            (adminViewProject) ? (
                <ClientPortal 
                    currentUser={currentUser}
                    project={adminViewProject}
                    stats={stats.find(s => s.projectId === adminViewProject.id)}
                    tasks={tasks}
                    events={events}
                    messages={messages}
                    broadcasts={broadcasts}
                    files={files}
                    clientChannels={clientChannels}
                    notifications={notifications}
                    onSendMessage={handleSendMessage}
                    onLogout={handleLogout}
                    onCompleteTask={handleCompleteTask}
                    onUpdateUser={handleUpdateUser}
                    onUploadFile={(f) => handleUploadFile(f, adminViewProject.id)}
                    onDeleteFile={handleDeleteFile}
                    onBackToDashboard={() => setAdminViewProject(null)} 
                    onCreateChannel={handleCreateClientChannel}
                    onUpdateChannel={handleUpdateClientChannel}
                    onDeleteChannel={handleDeleteClientChannel}
                    onClearChannelNotifications={handleClearChannelNotifications}
                    onChangePassword={handleChangePassword}
                    onSearch={handleGlobalSearch}
                />
            ) : (
                <InternalDashboard 
                    currentUser={currentUser}
                    stats={visibleStats}
                    tasks={visibleTasks}
                    projects={visibleProjects}
                    users={visibleUsers}
                    events={visibleEvents}
                    messages={messages}
                    chatChannels={chatChannels}
                    clientChannels={clientChannels}
                    files={visibleFiles}
                    notifications={notifications}
                    onLogout={handleLogout}
                    onUpdateTask={handleUpdateTask}
                    onAddTask={handleAddTask}
                    onDeleteTask={handleDeleteTask}
                    onSendMessage={handleSendMessage}
                    onUpdateUser={handleUpdateUser}
                    onSendBroadcast={handleSendBroadcast}
                    onAddEvent={handleAddEvent}
                    onDeleteEvent={handleDeleteEvent}
                    onOpenProject={setAdminViewProject}
                    onMarkAsRead={handleMarkAllAsRead}
                    onCreateChannel={handleCreateChannel}
                    onUploadFile={(f) => handleUploadFile(f, 'internal')}
                    onDeleteFile={handleDeleteFile}
                    onAddUser={handleAddUser}
                    onAdminUpdateUser={handleAdminUpdateUser}
                    onDeleteUser={handleDeleteUser}
                    onCreateProject={handleCreateProject}
                    onDeleteProject={handleDeleteProject}
                    onClearChannelNotifications={handleClearChannelNotifications}
                    onUpdateStats={handleUpdateStats}
                    onChangePassword={handleChangePassword}
                    onSearch={handleGlobalSearch}
                />
            )
        ) : (
            <ClientPortal 
                currentUser={currentUser}
                project={projects.find(p => p.id === currentUser.projectId)!}
                stats={stats.find(s => s.projectId === currentUser.projectId)}
                tasks={tasks}
                events={events}
                messages={messages}
                broadcasts={broadcasts}
                files={files}
                clientChannels={clientChannels}
                notifications={notifications}
                onSendMessage={handleSendMessage}
                onLogout={handleLogout}
                onCompleteTask={handleCompleteTask}
                onUpdateUser={handleUpdateUser}
                onUploadFile={(f) => handleUploadFile(f, currentUser.projectId!)}
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
