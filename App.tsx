import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, ClientRole, Project, Task, ProjectStats, ChatMessage, BroadcastMessage, CalendarEvent, ChatChannel, ClientChannel, AppFile, AppNotification, SearchResult } from './types';
import { Auth } from './components/Auth';
@@ -14,9 +13,9 @@
    addTaskToDB, 
    createProject, 
    fetchUserProfile, 
    fetchAllUsers,
    updateUserInDB,
    deleteUserFromDB
} from './services/databaseService';

// --- INITIAL MOCK DATA ---
@@ -31,12 +30,12 @@
const INITIAL_CLIENT_CHANNELS: ClientChannel[] = [];
const INITIAL_FILES: AppFile[] = [];

// --- TOAST COMPONENT (FIXED) ---
const NotificationToast: React.FC<{ notifications: AppNotification[], onDismiss: (id: string) => void }> = ({ notifications, onDismiss }) => {
    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
            {notifications.map(n => (
                <div key={n.id} className="pointer-events-auto bg-black/80 backdrop-blur-xl text-white p-4 rounded-2xl shadow-2xl border border-white/10 flex gap-3 items-start relative overflow-hidden group" style={{animation: 'slideUp 0.3s ease-out'}}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                    <div className="p-2 bg-white/10 rounded-full shrink-0">
                        {n.type === 'MESSAGE' ? <MessageCircle size={18}/> : n.type === 'TASK' ? <CheckCircle size={18}/> : <Bell size={18}/>}
@@ -54,7 +53,7 @@

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [stats, setStats] = useState<ProjectStats[]>([]);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
@@ -81,15 +80,13 @@
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {


        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profile) {

            const mappedUser: User = {
                id: session.user.id,
                email: session.user.email!,
@@ -98,17 +95,14 @@
                clientRole: profile.client_role as ClientRole,
                projectId: profile.project_id,
                avatar: profile.avatar || '',

            };
            setCurrentUser(mappedUser);

        } else {

             const fallbackUser: User = {
                id: session.user.id,
                email: session.user.email!,
                name: session.user.user_metadata?.full_name || 'Användare',
                role: UserRole.CLIENT,
                avatar: '',
            };
            setCurrentUser(fallbackUser);
@@ -128,56 +122,49 @@

  // --- FETCH STATS ON LOAD ---
  useEffect(() => {
      if (!isSupabaseConfigured || !currentUser?.projectId) return;

      getProjectStats(currentUser.projectId).then(data => {
          if (data) {
              setStats(prev => {
                  const existing = prev.filter(s => s.projectId !== data.projectId);
                  return [...existing, data];
              });
          }
      });
  }, [currentUser?.projectId]);






  // --- FETCH ALL INITIAL DATA ---
  useEffect(() => {
    if (!isSupabaseConfigured || !currentUser) return;

    const loadInitialData = async () => {

        const [projectsData, tasksData, usersData] = await Promise.all([
            fetchAllProjects(),
            fetchAllTasks(),
            fetchAllUsers(),

        ]);

        setProjects(projectsData);
        setTasks(tasksData);
        setUsers(usersData);
    };

    if (currentUser.role !== UserRole.CLIENT) {

        loadInitialData();
    }
  }, [currentUser]);


  // --- TOAST AUTO-DISMISS (FIXED) ---
  useEffect(() => {
      if (toasts.length === 0) return;
      
      const timer = setTimeout(() => {
          setToasts(prev => prev.slice(1));
      }, 4000);
      
      return () => clearTimeout(timer);
  }, [toasts.length]); // Changed dependency to toasts.length instead of toasts

  const addNotification = (type: 'MESSAGE' | 'TASK' | 'SYSTEM', title: string, message: string, linkTo?: string) => {
      const newNotif: AppNotification = {
@@ -194,20 +181,17 @@

  const handleLogout = async () => {
    if (isSupabaseConfigured) {

        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Logout Error:", error);

            setCurrentUser(null);
            setAdminViewProject(null);
        }
    } else {

        setCurrentUser(null);
        setAdminViewProject(null);
    }
  };

  // --- FILTERED DATA FOR MANAGERS ---
  const visibleProjects = useMemo(() => {
@@ -303,28 +287,26 @@
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


    const currentProjectStatsIndex = stats.findIndex(s => s.projectId === projectId);
    let updatedStats: ProjectStats;

    if (currentProjectStatsIndex === -1) {

        updatedStats = {
            projectId,
            projectName: projects.find(p => p.id === projectId)?.name || 'Unknown',
@@ -337,7 +319,6 @@
        updatedStats = { ...stats[currentProjectStatsIndex] };
    }


    if (type === 'revenue') {
        const exists = updatedStats.revenue.find(r => r.month === dateOrPlatform);
        updatedStats.revenue = exists 
@@ -346,51 +327,42 @@
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


    setStats(prev => {
        if (currentProjectStatsIndex === -1) return [...prev, updatedStats];
        const newArr = [...prev];
        newArr[currentProjectStatsIndex] = updatedStats;
        return newArr;
    });


    if (isSupabaseConfigured) {
        await saveProjectStats(updatedStats);
    }
  }

  const handleAddTask = async (newTask: Task) => {




    if (currentUser?.role !== UserRole.OWNER && currentUser?.role !== UserRole.MANAGER) return;


    const savedTask = await addTaskToDB(newTask);

    if (savedTask) {

        setTasks(prev => [savedTask, ...prev]);


        if (savedTask.assigneeId === currentUser?.id) {
            addNotification('TASK', 'Ny uppgift', `Du har tilldelats: ${savedTask.title}`);
        } 
    }
  };

  const handleUpdateTask = (updatedTask: Task) => setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  const handleDeleteTask = (taskId: string) => (currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER) && setTasks(prev => prev.filter(t => t.id !== taskId));
@@ -413,188 +385,181 @@
  const handleCreateProject = async (projectName: string) => {
    if (currentUser?.role !== UserRole.OWNER && currentUser?.role !== UserRole.MANAGER) return;


    const newProjectId = crypto.randomUUID(); 

    const newProject: Project = { id: newProjectId, name: projectName, members: [] }; 


    const savedProject = await createProject(newProject); 

    if (savedProject) {

        setProjects(prev => [...prev, savedProject]);


        const newStats: ProjectStats = { projectId: newProjectId, projectName: projectName, streams: [], revenue: [], followers: [], mentions: [] };
        setStats(prev => [...prev, newStats]);
        await saveProjectStats(newStats); 


        setClientChannels(prev => [...prev, { id: 'general', name: 'General', projectId: newProjectId, icon: 'MessageSquare' }]);
    }
  };

  const handleDeleteProject = (projectId: string) => {
      if (currentUser?.role !== UserRole.OWNER) return;
      setProjects(prev => prev.filter(p => p.id !== projectId));

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
