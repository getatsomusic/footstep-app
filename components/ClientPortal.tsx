
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Task, Project, ChatMessage, ProjectStats, BroadcastMessage, CalendarEvent, EventType, AppFile, UserRole, ClientRole, ClientChannel, AppNotification, SearchResult } from '../types';
import { suggestNextSteps } from '../services/geminiService';
import { Button } from './Button';
import { Avatar } from './Avatar';
import { MessageSquare, CheckCircle, DollarSign, Music, Lightbulb, Send, LogOut, Menu, X, Settings, LayoutDashboard, ArrowRight, Bell, Calendar as CalendarIcon, ChevronLeft, ChevronRight, MapPin, Clock, ArrowLeft, FolderOpen, Film, FileText, Download, Paperclip, Plus, Trash2, Hash, Pencil, Check, Loader2, Search, CheckSquare, MessageCircle } from 'lucide-react';

interface ClientPortalProps {
  currentUser: User;
  project: Project;
  stats?: ProjectStats;
  tasks: Task[];
  messages: ChatMessage[];
  events: CalendarEvent[];
  broadcasts: BroadcastMessage[];
  files: AppFile[];
  clientChannels: ClientChannel[];
  notifications: AppNotification[];
  onSendMessage: (text: string, room: string, attachment?: AppFile) => void;
  onLogout: () => void;
  onCompleteTask: (taskId: string) => void;
  onUpdateUser: (user: User) => void;
  onBackToDashboard?: () => void;
  onUploadFile: (file: File) => AppFile | undefined;
  onDeleteFile: (fileId: string) => void;
  onCreateChannel: (name: string, projectId: string) => void;
  onUpdateChannel: (channelId: string, newName: string) => void;
  onDeleteChannel: (channelId: string) => void;
  onClearChannelNotifications?: (channelId: string) => void;
  onChangePassword: (userId: string, newPass: string) => void;
  onSearch: (query: string) => SearchResult[];
}

const EVENT_COLORS: Record<EventType, string> = {
    GIG: 'bg-purple-100 text-purple-800 border-purple-200',
    STUDIO: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    MEETING: 'bg-blue-100 text-blue-800 border-blue-200',
    RELEASE: 'bg-green-100 text-green-800 border-green-200',
    PR: 'bg-pink-100 text-pink-800 border-pink-200',
    DEADLINE: 'bg-red-100 text-red-800 border-red-200',
    OTHER: 'bg-gray-100 text-gray-800 border-gray-200',
};

// Helper to resolve icon string to component
const getIcon = (iconName: string) => {
    switch(iconName) {
        case 'Music': return Music;
        case 'DollarSign': return DollarSign;
        case 'Lightbulb': return Lightbulb;
        default: return MessageSquare;
    }
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ 
  currentUser, project, stats, tasks, messages, events, broadcasts, files, clientChannels, notifications, onSendMessage, onLogout, onCompleteTask, onUpdateUser, onBackToDashboard, onUploadFile, onDeleteFile, onCreateChannel, onUpdateChannel, onDeleteChannel, onClearChannelNotifications, onChangePassword, onSearch
}) => {
  const isGuest = currentUser.clientRole === ClientRole.GUEST;
  
  // Filter rooms for guests
  const rooms = useMemo(() => {
    const allProjectRooms = clientChannels.filter(c => c.projectId === project.id);
    if (isGuest && currentUser.allowedChannels) {
        return allProjectRooms.filter(c => currentUser.allowedChannels?.includes(c.id));
    }
    return allProjectRooms;
  }, [clientChannels, project.id, isGuest, currentUser.allowedChannels]);

  const [activeView, setActiveView] = useState<'overview' | 'workspace' | 'calendar' | 'files'>(isGuest ? 'workspace' : 'overview');
  const [activeRoom, setActiveRoom] = useState<string>(rooms.length > 0 ? rooms[0].id : '');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [suggestedTasks, setSuggestedTasks] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editChannelName, setEditChannelName] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setIsSearchOpen(true);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const roomMessages = messages.filter(m => m.room === activeRoom && m.projectId === project.id);
  const allProjectMessages = messages.filter(m => m.projectId === project.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const myTasks = tasks.filter(t => t.projectId === project.id && t.status !== 'DONE');
  const urgentTask = myTasks.length > 0 ? myTasks.sort((a,b) => (a.dueDate || '').localeCompare(b.dueDate || ''))[0] : null;
  const projectFiles = files.filter(f => f.projectId === project.id);

  const canManageChannels = currentUser.role === UserRole.OWNER || currentUser.role === UserRole.MANAGER || (currentUser.role === UserRole.CLIENT && currentUser.clientRole === ClientRole.TEAMLEADER);
  const canDeleteChannels = currentUser.role === UserRole.OWNER || currentUser.role === UserRole.MANAGER;

  const combinedEvents = useMemo(() => {
    const projEvents = events.filter(e => e.projectId === project.id);
    const taskEvents = tasks
        .filter(t => t.projectId === project.id && t.dueDate && t.status !== 'DONE')
        .map(t => ({
            id: `task-${t.id}`,
            title: t.title,
            startDate: t.dueDate!,
            type: 'DEADLINE' as EventType,
            projectId: project.id,
            description: 'Deadline'
        } as CalendarEvent));
    return [...projEvents, ...taskEvents];
  }, [events, tasks, project.id]);

  const latestBroadcast = broadcasts.filter(b => b.targetProjectId === 'all' || b.targetProjectId === project.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  
  // Notification check
  const hasNotification = (roomId: string) => notifications.some(n => n.type === 'MESSAGE' && n.linkTo === roomId);
  const unreadCount = notifications.length;

  useEffect(() => { 
      if (!rooms.find(r => r.id === activeRoom) && rooms.length > 0) {
          setActiveRoom(rooms[0].id);
      }
      if (activeView === 'workspace' && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; 
  }, [roomMessages, activeView, rooms, activeRoom]);

  const handleRoomClick = (id: string) => {
      setActiveRoom(id);
      setActiveView('workspace');
      setMobileMenuOpen(false);
      if (onClearChannelNotifications) onClearChannelNotifications(id);
  }

  const handleSend = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      if (newMessage.trim()) { 
          setIsSending(true);
          await new Promise(r => setTimeout(r, 600)); // Simulate delay
          onSendMessage(newMessage, activeRoom); 
          setNewMessage(''); 
          setIsSending(false);
      } 
  };
  const generateSuggestions = async () => { setLoadingSuggestions(true); const suggestions = await suggestNextSteps(project.name, roomMessages.slice(-10).map(m => `${m.userName}: ${m.content}`)); setSuggestedTasks(suggestions); setLoadingSuggestions(false); };
  const getTimeGreeting = () => { const h = new Date().getHours(); return h < 10 ? 'God morgon' : h < 18 ? 'Tjena' : 'God kväll'; };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files && e.target.files[0]) {
          setIsUploading(true);
          const file = e.target.files[0];
          await new Promise(r => setTimeout(r, 1000)); // Simulate upload
          const uploaded = onUploadFile(file);
          if(uploaded) {
              onSendMessage(`Delade en fil: ${uploaded.name}`, activeRoom, uploaded);
          }
          setIsUploading(false);
          if(fileInputRef.current) fileInputRef.current.value = '';
      }
  }

  const handleAddChannelSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(newChannelName.trim()) {
          onCreateChannel(newChannelName, project.id);
          setIsAddChannelOpen(false);
          setNewChannelName('');
      }
  }
  
  const handleStartEditChannel = (channel: ClientChannel, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingChannelId(channel.id);
      setEditChannelName(channel.name);
  }

  const handleSaveChannelName = (channelId: string) => {
      if (editChannelName.trim()) {
          onUpdateChannel(channelId, editChannelName.trim());
          setEditingChannelId(null);
          setEditChannelName('');
      }
  }

  const handleCancelEdit = () => {
      setEditingChannelId(null);
      setEditChannelName('');
  }

  const handleLogoutClick = async () => {
      setIsLoggingOut(true);
      await new Promise(r => setTimeout(r, 800)); // Simulate delay
      onLogout();
  }

  const NavContent = () => (
      <>
         {!isGuest && (
             <>
                <button onClick={() => setActiveView('overview')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeView === 'overview' ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><LayoutDashboard size={18} /> Översikt</button>
                <button onClick={() => setActiveView('calendar')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeView === 'calendar' ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><CalendarIcon size={18} /> Kalender</button>
                <button onClick={() => setActiveView('files')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeView === 'files' ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><FolderOpen size={18} /> Filer</button>
             </>
         )}
         
         <div className="pt-8 pb-3 flex justify-between items-center px-4">
             <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Rum</h3>
             {canManageChannels && (
                 <button onClick={() => setIsAddChannelOpen(true)} className="text-gray-400 hover:text-white"><Plus size={14}/></button>
             )}
         </div>
         {rooms.map(room => {
             const Icon = getIcon(room.icon || 'MessageSquare');
             const isEditing = editingChannelId === room.id;
             
             if (isEditing) {
                 return (
                     <div key={room.id} className="px-4 py-2 flex items-center gap-2">
                        <input 
                            className="w-full bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none" 
                            value={editChannelName} 
                            onChange={(e) => setEditChannelName(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveChannelName(room.id);
                                if (e.key === 'Escape') handleCancelEdit();
                            }}
                            onBlur={() => handleSaveChannelName(room.id)}
                        />
                        <button onClick={() => handleSaveChannelName(room.id)} className="text-green-500 hover:text-green-400"><Check size={16}/></button>
                        <button onClick={handleCancelEdit} className="text-gray-500 hover:text-gray-400"><X size={16}/></button>
                     </div>
                 )
             }
             
             return (
               <div key={room.id} className="relative group">
                   <button onClick={() => handleRoomClick(room.id)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeView === 'workspace' && activeRoom === room.id ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                       <span className="flex items-center gap-4"><Icon size={18} /> {room.name}</span>
                       {hasNotification(room.id) && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                   </button>
                   
                   {canManageChannels && (
                       <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {room.id !== 'general' && (
                                <button onClick={(e) => handleStartEditChannel(room, e)} className="p-1 text-gray-600 hover:text-blue-500 transition-colors">
                                    <Pencil size={14}/>
                                </button>
                            )}
                            {canDeleteChannels && room.id !== 'general' && (
                                <button onClick={(e) => { e.stopPropagation(); onDeleteChannel(room.id); }} className="p-1 text-gray-600 hover:text-red-500 transition-colors">
                                    <X size={14}/>
                                </button>
                            )}
                       </div>
                   )}
               </div>
             )
         })}
      </>
  );

  return (
    <div className="flex h-screen bg-[#f5f5f7] font-sans text-gray-900">
      {/* ... Mobile Menu ... */}
      <div className={`fixed inset-0 z-50 flex md:hidden transition-all duration-300 ${mobileMenuOpen ? 'visible' : 'invisible delay-300'}`}>
             <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setMobileMenuOpen(false)}></div>
             <div className={`relative w-72 bg-[#111] text-white h-full shadow-2xl flex flex-col border-r border-gray-800 transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-8 pb-4 flex justify-between items-center">
                    <div>
                         <h1 className="font-bold text-xl tracking-tighter">FOOTSTEP</h1>
                         <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">{project.name}</p>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                
                <div className="flex-1 flex flex-col px-4 pb-8 overflow-y-auto">
                    <nav className="space-y-2 flex-1">
                        <NavContent />
                    </nav>

                    <div className="border-t border-gray-800 pt-6 mt-6 px-4">
                        <div className="flex items-center gap-3 mb-4" onClick={() => { setIsProfileModalOpen(true); setMobileMenuOpen(false); }}>
                            <Avatar name={currentUser.name} src={currentUser.avatar} size="sm" className="ring-2 ring-gray-700" />
                            <div>
                                <p className="text-sm font-bold">{currentUser.name}</p>
                                <p className="text-xs text-gray-500">{currentUser.clientRole || 'Artist'}</p>
                            </div>
                        </div>
                        <button className="w-full flex items-center gap-3 px-4 py-2 text-red-500/70 hover:text-red-400 text-xs font-medium transition-colors" onClick={() => setIsLogoutModalOpen(true)}><LogOut size={14} /> Logga ut</button>
                    </div>
                </div>
             </div>
      </div>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-72 bg-[#111] text-white shrink-0 border-r border-gray-800">
        <div className="p-8 flex flex-col h-full">
          <div className="mb-10">
             <h1 className="font-bold text-xl tracking-tighter">FOOTSTEP</h1>
             <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1">{project.name}</p>
          </div>
          {onBackToDashboard && (
             <button onClick={onBackToDashboard} className="w-full flex items-center gap-2 px-4 py-3 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-xl text-xs font-bold uppercase tracking-wide transition-all mb-8">
                <ArrowLeft size={14} /> Back to Mgmt
             </button>
          )}
          <nav className="space-y-2 flex-1 overflow-y-auto pr-2">
             <NavContent />
          </nav>
          <div className="mt-auto pt-8 border-t border-gray-800">
             <div className="flex items-center gap-4 cursor-pointer hover:bg-white/5 p-3 rounded-xl transition-colors group" onClick={() => setIsProfileModalOpen(true)}>
               <Avatar name={currentUser.name} src={currentUser.avatar} size="sm" className="ring-2 ring-gray-700 group-hover:ring-white transition-all" />
               <div className="overflow-hidden flex-1">
                   <p className="text-sm font-medium truncate text-gray-200 group-hover:text-white">{currentUser.name}</p>
                   <p className="text-xs text-gray-500 truncate">{currentUser.clientRole}</p>
               </div>
               <Settings size={16} className="text-gray-500 group-hover:text-white transition-colors" />
             </div>
             <button className="w-full flex items-center gap-3 px-4 py-2 mt-2 text-red-500/70 hover:text-red-400 text-xs font-medium transition-colors" onClick={() => setIsLogoutModalOpen(true)}><LogOut size={14} /> Logga ut</button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="md:hidden h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-20 sticky top-0">
          <button onClick={() => setMobileMenuOpen(true)} className="text-black relative">
              <Menu size={24} />
              {unreadCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
          </button>
          <span className="font-bold text-sm uppercase tracking-wider">{activeView === 'overview' ? 'Översikt' : activeView === 'calendar' ? 'Kalender' : activeView === 'files' ? 'Filer' : rooms.find(r => r.id === activeRoom)?.name}</span>
          <button onClick={() => setIsSearchOpen(true)} className="text-black"><Search size={22}/></button>
        </header>
        
        {/* ... Overview, Calendar, Files, Workspace views remain same ... */}
        {/* Only duplicating the Profile Modal logic here */}
        
        {/* View: Overview (Hidden for Guests) */}
        {!isGuest && activeView === 'overview' && (
            <div className="flex-1 overflow-y-auto bg-[#f5f5f7]">
                 <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-12 animate-fade-in pb-24">
                    <div className="flex justify-between items-start">
                         <div className="flex flex-col gap-1">
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-gray-900">{getTimeGreeting()}, {currentUser.name.split(' ')[0]}.</h1>
                            <p className="text-gray-500 text-lg font-medium">Låt oss skapa något fantastiskt idag.</p>
                        </div>
                        <button onClick={() => setIsSearchOpen(true)} className="hidden md:flex p-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-400 hover:text-black hover:shadow-md transition-all">
                            <Search size={24}/>
                        </button>
                    </div>
                    {/* ... Rest of Overview ... */}
                    {/* ... Omitted for brevity, logic identical to previous ... */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Hero Card and rest... */}
                        {/* Assuming this part is unchanged */}
                        <div className="lg:col-span-2 space-y-8">
                             {/* ... */}
                             <div className="bg-black text-white rounded-[2rem] p-8 md:p-12 shadow-2xl shadow-black/20 relative overflow-hidden group hover:scale-[1.01] transition-transform duration-500">
                                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-blue-600 to-purple-600 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2 group-hover:opacity-30 transition-opacity duration-700"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Ditt Fokus</span>
                                    </div>
                                    {urgentTask ? (
                                        <>
                                            <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-4">{urgentTask.title}</h2>
                                            {urgentTask.dueDate && <p className="text-lg text-gray-400 mb-8">Deadline: <span className="text-white font-semibold">{urgentTask.dueDate}</span></p>}
                                            <Button className="bg-white text-black hover:bg-gray-200 border-none px-8 py-4 text-base shadow-xl" onClick={() => onCompleteTask(urgentTask.id)}>Markera som klar</Button>
                                        </>
                                    ) : (
                                        <>
                                            <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-4">Inget brådskande.</h2>
                                            <p className="text-lg text-gray-400 mb-8">Passa på att vara kreativ.</p>
                                            <Button className="bg-white text-black hover:bg-gray-200 border-none px-8 py-4 text-base shadow-xl" onClick={() => setActiveView('workspace')}>Gå till chatten</Button>
                                        </>
                                    )}
                                </div>
                             </div>
                             {/* ... */}
                             {latestBroadcast && (
                                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-3xl p-8 border border-orange-100 flex items-start gap-4 shadow-sm relative overflow-hidden">
                                     <div className="bg-orange-100 p-3 rounded-full text-orange-600 z-10">
                                         <Bell size={24}/>
                                     </div>
                                     <div className="z-10">
                                         <p className="text-orange-900 font-bold text-lg mb-1">Meddelande från {latestBroadcast.authorName}</p>
                                         <p className="text-orange-800 leading-relaxed">"{latestBroadcast.message}"</p>
                                         <p className="text-xs text-orange-400 font-bold mt-2 uppercase tracking-wide">{new Date(latestBroadcast.createdAt).toLocaleDateString()}</p>
                                     </div>
                                </div>
                             )}
                        </div>
                        {/* ... */}
                        <div className="space-y-8">
                             <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                 <h3 className="font-bold text-xl mb-6 flex items-center gap-2"><CheckCircle size={24} className="text-black"/> Aktuella Tasks</h3>
                                 <div className="space-y-4">
                                     {myTasks.slice(0, 4).map(task => (
                                         <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => onCompleteTask(task.id)}>
                                             <div className="mt-1 w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-green-500 group-hover:bg-green-500 transition-all"></div>
                                             <div>
                                                 <p className="font-bold text-sm text-gray-900 group-hover:line-through transition-all">{task.title}</p>
                                                 {task.dueDate && <p className="text-xs text-red-500 font-bold">{task.dueDate}</p>}
                                             </div>
                                         </div>
                                     ))}
                                     {myTasks.length === 0 && <p className="text-gray-400 text-sm">Inga tasks just nu.</p>}
                                 </div>
                             </div>

                             {stats && (
                                 <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                     <h3 className="font-bold text-xl mb-6 flex items-center gap-2"><ArrowRight size={24} className="text-black"/> Snabbstatistik</h3>
                                     <div className="grid grid-cols-2 gap-4">
                                         <div className="p-4 bg-gray-50 rounded-2xl">
                                             <p className="text-xs text-gray-400 font-bold uppercase mb-1">Följare</p>
                                             <p className="text-2xl font-bold text-gray-900">{stats.followers.reduce((a,b)=>a+b.count,0).toLocaleString()}</p>
                                         </div>
                                          <div className="p-4 bg-gray-50 rounded-2xl">
                                             <p className="text-xs text-gray-400 font-bold uppercase mb-1">Streams (30d)</p>
                                             <p className="text-2xl font-bold text-gray-900">{stats.streams.slice(-30).reduce((a,b)=>a+b.value,0).toLocaleString()}</p>
                                         </div>
                                     </div>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* View: Calendar (Hidden for Guests) */}
        {!isGuest && activeView === 'calendar' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#f5f5f7]">
                <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden min-h-[800px]">
                     <ClientCalendar events={combinedEvents} />
                </div>
            </div>
        )}

        {/* View: Files (Hidden for Guests) */}
        {!isGuest && activeView === 'files' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#f5f5f7]">
                <FileGrid files={projectFiles} onDelete={onDeleteFile} currentUser={currentUser} />
            </div>
        )}

        {/* View: Workspace */}
        {activeView === 'workspace' && (
            <div className="flex-1 flex flex-col h-full bg-white">
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                        <div className="h-20 border-b border-gray-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">#{rooms.find(r=>r.id===activeRoom)?.name || 'Välj rum'}</h2>
                                <p className="text-xs text-gray-400 uppercase tracking-widest mt-0.5 font-semibold">Workspace</p>
                            </div>
                            <button onClick={() => setIsSearchOpen(true)} className="hidden md:block text-gray-400 hover:text-black"><Search size={20}/></button>
                        </div>
                        {rooms.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                <p>Du har inte tillgång till några kanaler än.</p>
                            </div>
                        ) : (
                        <>
                            <div className="flex-1 overflow-y-auto p-8 space-y-8" ref={scrollRef}>
                                {roomMessages.map(msg => {
                                    const isMe = msg.userId === currentUser.id;
                                    return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] md:max-w-[60%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-center gap-2 mb-2 px-1">
                                                {!isMe && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{msg.userName}</span>}
                                                <span className="text-[10px] text-gray-300">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <div className={`px-6 py-4 rounded-3xl text-sm leading-relaxed shadow-sm font-medium ${isMe ? 'bg-black text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'}`}>
                                                {msg.content}
                                                {msg.attachment && (
                                                    <div className="mt-4 bg-white/10 p-3 rounded-xl border border-white/20 flex items-center gap-3 overflow-hidden cursor-pointer hover:bg-white/20 transition-colors" onClick={() => window.open(msg.attachment?.url, '_blank')}>
                                                        {msg.attachment.type === 'image' ? (
                                                            <img src={msg.attachment.url} alt="attachment" className="w-12 h-12 rounded-lg object-cover bg-white"/>
                                                        ) : (
                                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isMe ? 'bg-white/20' : 'bg-gray-200'}`}>
                                                                {msg.attachment.type === 'audio' ? <Music size={20}/> : msg.attachment.type === 'video' ? <Film size={20}/> : <FileText size={20}/>}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-xs truncate">{msg.attachment.name}</p>
                                                            <p className="text-[10px] opacity-70">{msg.attachment.size}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    )
                                })}
                            </div>
                            <div className="p-6 bg-white border-t border-gray-50">
                                <form onSubmit={handleSend} className="relative">
                                    <input type="text" className="w-full bg-gray-50 border-transparent rounded-full py-4 pl-6 pr-24 text-sm font-medium focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-100 transition-all placeholder-gray-400" placeholder={`Skriv något i #${rooms.find(r=>r.id===activeRoom)?.name}...`} value={newMessage} onChange={e => setNewMessage(e.target.value)} />
                                    <div className="absolute right-2 top-2 flex items-center gap-2">
                                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                                        <button type="button" disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all">
                                            {isUploading ? <Loader2 className="animate-spin" size={20}/> : <Paperclip size={20}/>}
                                        </button>
                                        <button type="submit" disabled={!newMessage.trim() || isSending} className="p-2 bg-black text-white rounded-full hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100">
                                            {isSending ? <Loader2 className="animate-spin" size={20}/> : <ArrowRight size={20} />}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </>
                        )}
                    </div>
                    {/* ... Right Info Panel (Tasks + AI) ... */}
                    <div className="hidden xl:flex flex-col w-96 border-l border-gray-100 bg-gray-50/50 p-8">
                        <h3 className="font-bold text-lg mb-6">Att Göra</h3>
                        <div className="space-y-4">
                            {myTasks.length === 0 ? <p className="text-gray-400 text-sm italic">Tomt bord.</p> : myTasks.map(task => (
                                <div key={task.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3 group hover:border-black/10 transition-colors">
                                    <button disabled={isGuest} onClick={() => !isGuest && onCompleteTask(task.id)} className={`mt-1 transition-colors ${isGuest ? 'text-gray-300 cursor-not-allowed' : 'text-gray-300 hover:text-black'}`}><CheckCircle size={20}/></button>
                                    <div>
                                        <p className="font-bold text-sm text-gray-900 leading-tight">{task.title}</p>
                                        {task.dueDate && <p className="text-xs text-red-500 font-bold mt-1 uppercase tracking-wide">{task.dueDate}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* ... AI suggestions ... */}
                        {currentUser.role !== UserRole.OWNER && (
                             <div className="mt-8">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Lightbulb size={20} className="text-yellow-500"/> Förslag</h3>
                                <Button onClick={generateSuggestions} disabled={loadingSuggestions} variant="secondary" className="w-full text-xs">
                                    {loadingSuggestions ? <Loader2 className="animate-spin mr-2" size={14}/> : 'Få förslag på åtgärder'}
                                </Button>
                                {suggestedTasks.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        {suggestedTasks.map((t, i) => (
                                            <div key={i} className="p-3 bg-white rounded-xl border border-gray-100 text-sm text-gray-600 shadow-sm animate-fade-in">
                                                {t}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>
      
       {isSearchOpen && (
        <SearchPalette 
            onClose={() => setIsSearchOpen(false)} 
            onSearch={onSearch} 
            onNavigate={(tab, id) => {
                setActiveView(tab as any);
                setIsSearchOpen(false);
                if (tab === 'workspace') handleRoomClick(id);
            }}
        />
      )}

       {isProfileModalOpen && (
        <ProfileModal user={currentUser} onClose={() => setIsProfileModalOpen(false)} onSave={onUpdateUser} onChangePassword={onChangePassword} />
      )}
      
      {/* ... Add Channel Modal ... */}
      {isAddChannelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-[#111] text-white rounded-3xl p-8 max-w-sm w-full relative animate-scale shadow-2xl border border-gray-800">
                 <button onClick={() => setIsAddChannelOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><X size={24}/></button>
                 <h2 className="text-xl font-bold mb-6">Ny Kanal</h2>
                 <form onSubmit={handleAddChannelSubmit}>
                     <input 
                        className="w-full bg-gray-900 border-none rounded-xl p-4 text-white placeholder-gray-600 mb-4 focus:ring-1 focus:ring-white" 
                        placeholder="Kanalnamn..." 
                        value={newChannelName}
                        onChange={e => setNewChannelName(e.target.value)}
                        autoFocus
                    />
                    <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200">Skapa</Button>
                 </form>
             </div>
        </div>
      )}

      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-white rounded-3xl p-8 max-w-sm w-full relative animate-scale shadow-2xl">
                 <h3 className="text-xl font-bold mb-2 text-gray-900">Logga ut?</h3>
                 <p className="text-gray-500 mb-6 text-sm">Är du säker på att du vill lämna plattformen?</p>
                 <div className="flex gap-3">
                     <Button variant="secondary" className="w-full" onClick={() => setIsLogoutModalOpen(false)}>Avbryt</Button>
                     <Button variant="primary" className="w-full bg-red-600 hover:bg-red-700 text-white border-none" onClick={handleLogoutClick} isLoading={isLoggingOut}>Logga ut</Button>
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};

const SearchPalette: React.FC<{ onClose: () => void; onSearch: (q: string) => SearchResult[]; onNavigate: (tab: string, id: string) => void }> = ({ onClose, onSearch, onNavigate }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if(inputRef.current) inputRef.current.focus();
    }, []);

    useEffect(() => {
        if (query.trim()) {
            setResults(onSearch(query));
        } else {
            setResults([]);
        }
    }, [query, onSearch]);

    const handleSelect = (res: SearchResult) => {
        if (res.type === 'TASK') onNavigate('workspace', ''); // Tasks are in workspace sidebar
        if (res.type === 'FILE') onNavigate('files', res.id);
        if (res.type === 'MESSAGE') onNavigate('workspace', res.linkTo || '');
        if (res.type === 'EVENT') onNavigate('calendar', res.id);
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-[#111] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-scale border border-gray-800" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-800 flex items-center gap-3">
                    <Search className="text-gray-400" size={20}/>
                    <input 
                        ref={inputRef}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-lg placeholder-gray-600 text-white" 
                        placeholder="Sök..." 
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <button onClick={onClose} className="p-1 bg-gray-800 rounded text-xs text-gray-400 font-bold px-2">ESC</button>
                </div>
                {query && results.length === 0 && (
                    <div className="p-8 text-center text-gray-500">Inga resultat hittades.</div>
                )}
                {results.length > 0 && (
                    <div className="max-h-[400px] overflow-y-auto p-2">
                        {results.map(res => (
                            <button 
                                key={res.id} 
                                onClick={() => handleSelect(res)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-left group"
                            >
                                <div className={`p-2 rounded-lg bg-gray-800 text-gray-300`}>
                                    {res.type === 'TASK' && <CheckSquare size={16}/>}
                                    {res.type === 'FILE' && <FileText size={16}/>}
                                    {res.type === 'PROJECT' && <LayoutDashboard size={16}/>}
                                    {res.type === 'MESSAGE' && <MessageCircle size={16}/>}
                                    {res.type === 'EVENT' && <CalendarIcon size={16}/>}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-200 group-hover:text-white">{res.title}</p>
                                    <p className="text-xs text-gray-500">{res.subtitle}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

const ModalBackdrop: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div className="fixed inset-0" onClick={onClose}></div>
        {children}
    </div>
);

const ProfileModal: React.FC<{ user: User; onClose: () => void; onSave: (u: User) => void; onChangePassword: (id: string, pass: string) => void }> = ({ user, onClose, onSave, onChangePassword }) => {
    const [name, setName] = useState(user.name);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [view, setView] = useState<'info' | 'security'>('info');

    const handlePasswordChange = () => {
        if (currentPassword === user.password) {
            if (newPassword === confirmPassword && newPassword.length >= 6) {
                onChangePassword(user.id, newPassword);
                alert('Lösenord uppdaterat!');
                setNewPassword('');
                setConfirmPassword('');
                setCurrentPassword('');
            } else {
                alert('Nya lösenorden matchar inte eller är för korta (min 6 tecken).');
            }
        } else {
            alert('Fel nuvarande lösenord.');
        }
    }

    return (
        <ModalBackdrop onClose={onClose}>
            <div className="bg-white rounded-3xl p-8 max-w-md w-full relative z-10 animate-scale">
                <h2 className="text-2xl font-bold mb-6">Profil</h2>
                
                <div className="flex gap-4 mb-6 border-b border-gray-100">
                    <button onClick={() => setView('info')} className={`pb-2 text-sm font-medium ${view === 'info' ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}>Information</button>
                    <button onClick={() => setView('security')} className={`pb-2 text-sm font-medium ${view === 'security' ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}>Säkerhet</button>
                </div>

                {view === 'info' ? (
                    <>
                        <input className="w-full bg-gray-50 border-transparent rounded-xl p-3 mb-4" value={name} onChange={e => setName(e.target.value)} />
                        <Button className="w-full" onClick={() => { onSave({...user, name}); onClose(); }}>Spara</Button>
                    </>
                ) : (
                    <div className="space-y-4">
                        <input type="password" placeholder="Nuvarande lösenord" className="w-full bg-gray-50 border-transparent rounded-xl p-3" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                        <input type="password" placeholder="Nytt lösenord" className="w-full bg-gray-50 border-transparent rounded-xl p-3" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        <input type="password" placeholder="Bekräfta nytt lösenord" className="w-full bg-gray-50 border-transparent rounded-xl p-3" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        <Button className="w-full" onClick={handlePasswordChange}>Uppdatera Lösenord</Button>
                    </div>
                )}
                
                 <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-black"><X size={24}/></button>
            </div>
        </ModalBackdrop>
    );
};

const ClientCalendar: React.FC<{ events: CalendarEvent[] }> = ({ events }) => {
    // ... logic same ...
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today);
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const startDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay(); 
    const adjustedStartDay = startDay === 0 ? 6 : startDay - 1; 
    const days = [];
    for (let i = 0; i < adjustedStartDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
        <div className="flex flex-col h-full">
            {/* ... Calendar UI ... */}
             <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                        {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                         <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth()-1))} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronLeft size={16}/></button>
                         <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1))} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronRight size={16}/></button>
                    </div>
                </div>
            </div>
            <div className="flex-1 grid grid-cols-7 grid-rows-[auto_1fr] overflow-y-auto">
                {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(d => (
                    <div key={d} className="p-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">{d}</div>
                ))}
                {days.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} className="bg-gray-50/20 border-b border-r border-gray-50 min-h-[120px]"></div>;
                    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    const dayEvents = events.filter(e => e.startDate === dateStr);
                    const isToday = dateStr === new Date().toISOString().split('T')[0];

                    return (
                        <div key={day} className={`border-b border-r border-gray-100 p-2 min-h-[120px] relative hover:bg-gray-50 transition-colors flex flex-col gap-1 ${isToday ? 'bg-blue-50/30' : ''}`}>
                            <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'text-gray-500'}`}>{day}</span>
                            {dayEvents.map(ev => (
                                <div key={ev.id} className={`text-[10px] px-2 py-1 rounded-md font-semibold truncate border ${EVENT_COLORS[ev.type] || EVENT_COLORS.OTHER} shadow-sm`}>
                                    {ev.startTime && <span className="opacity-70 mr-1">{ev.startTime}</span>}
                                    {ev.title}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    )
}

const FileGrid: React.FC<{ files: AppFile[], onDelete: (id: string) => void, currentUser: User }> = ({ files, onDelete, currentUser }) => {
    // ... logic same ...
    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 min-h-[600px]">
             {/* ... UI ... */}
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold flex items-center gap-3"><FolderOpen size={24}/> Delade Filer</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {files.map(file => {
                    const canDelete = currentUser.role === UserRole.OWNER || currentUser.role === UserRole.MANAGER || (currentUser.role === UserRole.CLIENT && file.uploadedBy === currentUser.id);
                    return (
                        <div key={file.id} className="group relative bg-gray-50 rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:bg-white hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden">
                             {/* ... */}
                             <div className="aspect-square bg-white rounded-xl mb-4 flex items-center justify-center overflow-hidden border border-gray-100 relative">
                                {file.type === 'image' ? (
                                    <img src={file.url} alt={file.name} className="w-full h-full object-cover"/>
                                ) : (
                                    <div className={`p-4 rounded-full ${file.type === 'audio' ? 'bg-purple-50 text-purple-600' : file.type === 'video' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                                        {file.type === 'audio' ? <Music size={32}/> : file.type === 'video' ? <Film size={32}/> : <FileText size={32}/>}
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm gap-2">
                                    <a href={file.url} target="_blank" rel="noreferrer" className="p-2 bg-white rounded-full text-black hover:scale-110 transition-transform"><Download size={20}/></a>
                                    {canDelete && (
                                        <button onClick={(e) => { e.stopPropagation(); onDelete(file.id); }} className="p-2 bg-red-500 rounded-full text-white hover:scale-110 transition-transform"><Trash2 size={20}/></button>
                                    )}
                                </div>
                            </div>
                             <h4 className="font-bold text-gray-900 text-sm truncate" title={file.name}>{file.name}</h4>
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{file.type}</span>
                                <span className="text-[10px] text-gray-400">{file.size}</span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
