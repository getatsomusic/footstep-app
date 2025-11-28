
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ProjectStats, Task, User, Project, ChatMessage, CalendarEvent, EventType, ChatChannel, UserRole, ClientRole, AppFile, ClientChannel, AppNotification, SearchResult } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { getStrategicInsight } from '../services/geminiService';
import { Button } from './Button';
import { Avatar } from './Avatar';
import { 
  BarChart3, Users, CheckSquare, TrendingUp, Plus, ChevronDown, ChevronRight, Sparkles, LayoutDashboard, LogOut, MessageCircle, Send, Settings, X, Calendar as CalendarIcon, ArrowUpRight, Menu, MessageSquare, ArrowRight, PanelLeftClose, PanelLeftOpen, DollarSign, Newspaper, ExternalLink, Megaphone, ChevronLeft, MapPin, Clock, DoorOpen, Coffee, Check, Hash, Lock, Filter, StickyNote, Trash2, FolderOpen, FileText, Image as ImageIcon, Music, Film, Download, Paperclip, Edit, Edit2, Pencil, Loader2, Key, Search
} from 'lucide-react';

interface InternalDashboardProps {
  currentUser: User;
  stats: ProjectStats[];
  tasks: Task[];
  projects: Project[];
  users: User[];
  messages: ChatMessage[];
  events: CalendarEvent[];
  chatChannels: ChatChannel[];
  clientChannels: ClientChannel[];
  files: AppFile[];
  notifications: AppNotification[];
  onLogout: () => void;
  onUpdateTask: (task: Task) => void;
  onAddTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onSendMessage: (text: string, room: string, attachment?: AppFile) => void;
  onUpdateUser: (user: User) => void;
  onSendBroadcast: (message: string, targetProjectId: string) => void;
  onAddEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onOpenProject: (project: Project) => void;
  onMarkAsRead?: () => void;
  onCreateChannel: (channel: ChatChannel) => void;
  onUploadFile: (file: File) => AppFile | undefined;
  onDeleteFile: (fileId: string) => void;
  onAddUser: (user: { name: string; email: string; password?: string; role: UserRole; clientRole?: ClientRole; projectId?: string; allowedChannels?: string[]; assignedProjects?: string[] }) => void;
  onAdminUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onCreateProject: (name: string) => void;
  onDeleteProject?: (id: string) => void;
  onClearChannelNotifications?: (channelId: string) => void;
  onUpdateStats?: (projectId: string, type: 'revenue' | 'streams' | 'followers', value: any, dateOrPlatform?: string) => void;
  onChangePassword: (userId: string, newPass: string) => void;
  onSearch: (query: string) => SearchResult[];
}

type TimeRange = 'day' | 'week' | 'month' | 'year';
type DetailModalType = 'streams' | 'revenue' | 'followers' | 'mentions' | null;

const EVENT_COLORS: Record<EventType, string> = {
  GIG: 'bg-purple-50 text-purple-700 border-purple-100',
  STUDIO: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  MEETING: 'bg-blue-50 text-blue-700 border-blue-100',
  RELEASE: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  PR: 'bg-pink-50 text-pink-700 border-pink-100',
  DEADLINE: 'bg-rose-50 text-rose-700 border-rose-100',
  OTHER: 'bg-gray-50 text-gray-700 border-gray-100',
};

export const InternalDashboard: React.FC<InternalDashboardProps> = ({ 
  currentUser, stats, tasks, projects, users, messages, events, chatChannels, clientChannels, files, notifications, onLogout, onUpdateTask, onAddTask, onDeleteTask, onSendMessage, onUpdateUser, onSendBroadcast, onAddEvent, onDeleteEvent, onOpenProject, onMarkAsRead, onCreateChannel, onUploadFile, onDeleteFile, onAddUser, onAdminUpdateUser, onDeleteUser, onCreateProject, onDeleteProject, onClearChannelNotifications, onUpdateStats, onChangePassword, onSearch
}) => {
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'clients' | 'tasks' | 'chat' | 'files'>('overview');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [detailModal, setDetailModal] = useState<DetailModalType>(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isStickyOpen, setIsStickyOpen] = useState(false);
  const [noteContent, setNoteContent] = useState(currentUser.personalNotes || '');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isManageUsersModalOpen, setIsManageUsersModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    setNoteContent(currentUser.personalNotes || '');
  }, [currentUser.id, currentUser.personalNotes]);

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

  const handleNoteBlur = () => {
    if (noteContent !== currentUser.personalNotes) {
        onUpdateUser({...currentUser, personalNotes: noteContent});
    }
  }

  const handleLogoutClick = async () => {
      setIsLoggingOut(true);
      await new Promise(r => setTimeout(r, 800)); // Simulate delay
      onLogout();
  }

  const filteredStats = useMemo(() => selectedProject === 'all' ? stats : stats.filter(s => s.projectId === selectedProject), [selectedProject, stats]);
  const filteredFiles = useMemo(() => selectedProject === 'all' ? files : files.filter(f => f.projectId === selectedProject), [selectedProject, files]);
  
  const metrics = useMemo(() => {
    let currentStreams = 0, prevStreams = 0, currentRevenue = 0, prevRevenue = 0, currentMentions = 0, totalFollowers = 0, followersTrend = 0;
    let aggregatedRevenue: any[] = [], aggregatedStreams: any[] = [], allMentions: any[] = [], aggregatedFollowers: any[] = [];
    const followerMap = new Map<string, number>();

    filteredStats.forEach(stat => {
        allMentions = [...allMentions, ...stat.mentions];
        const multiplier = timeRange === 'day' ? 0.03 : timeRange === 'week' ? 0.25 : timeRange === 'month' ? 1 : 12;
        
        stat.followers.forEach(f => followerMap.set(f.platform, (followerMap.get(f.platform) || 0) + f.count));
        totalFollowers += stat.followers.reduce((a,c) => a+c.count, 0);
        
        const revVals = stat.revenue.map(r => r.value);
        currentRevenue += (revVals[revVals.length-1] || 0) * multiplier;
        prevRevenue += (revVals[revVals.length-2] || 0) * multiplier;
        
        const strVals = stat.streams.map(s => s.value);
        currentStreams += strVals.slice(-30).reduce((a,b)=>a+b,0) * multiplier;
        prevStreams += strVals.slice(0,30).reduce((a,b)=>a+b,0) * multiplier;
        
        currentMentions += Math.ceil(stat.mentions.length * multiplier);
    });
    
    if (filteredStats.length > 0) {
        aggregatedRevenue = filteredStats[0].revenue.map((item, idx) => ({
            month: item.month,
            value: filteredStats.reduce((acc, curr) => acc + (curr.revenue[idx]?.value || 0), 0)
        }));
        aggregatedStreams = filteredStats[0].streams.slice(-30).map((item, idx) => ({
            date: item.date,
            value: filteredStats.reduce((acc, curr) => acc + (curr.streams.slice(-30)[idx]?.value || 0), 0)
        }));
    }
    followerMap.forEach((v, k) => aggregatedFollowers.push({platform: k, count: v}));

    return {
        totalStreams: currentStreams, streamsTrend: prevStreams ? ((currentStreams - prevStreams)/prevStreams)*100 : 0,
        totalRevenue: currentRevenue, revenueTrend: prevRevenue ? ((currentRevenue - prevRevenue)/prevRevenue)*100 : 0,
        totalMentions: currentMentions, mentionsTrend: 0, 
        totalFollowers, followersTrend,
        aggregatedRevenue, aggregatedStreams, allMentions, aggregatedFollowers
    };
  }, [filteredStats, timeRange]);

  const filteredTasks = selectedProject === 'all' ? tasks : tasks.filter(t => t.projectId === selectedProject);
  const myTasks = tasks.filter(t => t.assigneeId === currentUser.id && t.status !== 'DONE').slice(0, 5);
  const lastSeenDate = new Date(currentUser.lastSeen || 0);
  const unreadMessages = messages.filter(m => m.userId !== currentUser.id && new Date(m.timestamp) > lastSeenDate).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  const unreadNotifsCount = notifications.length;

  const handleAiInsight = async () => {
    if (filteredStats.length === 0) return;
    setLoadingAi(true);
    const insight = await getStrategicInsight({ ...filteredStats[0], followers: [{count: metrics.totalFollowers, platform: 'All'}], revenue: [{value: metrics.totalRevenue, month: 'Curr'}] } as any, "tillväxt");
    setAiInsight(insight);
    setLoadingAi(false);
  };

  const getTimeGreeting = () => {
    const h = new Date().getHours();
    return h < 10 ? 'God morgon' : h < 18 ? 'God dag' : 'God kväll';
  };

  const NavItem = ({ id, label, icon: Icon, badge }: any) => (
    <button 
      onClick={() => { setActiveTab(id); setMobileMenuOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${
        activeTab === id 
        ? 'bg-black text-white shadow-lg shadow-gray-900/10' 
        : 'text-gray-500 hover:text-black hover:bg-white/60'
      } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
    >
      <div className="relative">
        <Icon size={20} strokeWidth={activeTab === id ? 2.5 : 2} className="relative z-10 transition-transform duration-300 group-hover:scale-110" />
        {badge && !isSidebarCollapsed && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </div>
      {!isSidebarCollapsed && <span className="relative z-10 font-medium text-sm tracking-wide">{label}</span>}
      {isSidebarCollapsed && badge && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
      )}
    </button>
  );

  return (
    <div className="flex h-screen bg-[#f5f5f7] font-sans text-gray-900 overflow-hidden selection:bg-black selection:text-white">
      <button 
        className="md:hidden fixed top-5 right-5 z-50 bg-black text-white p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
        onClick={() => setMobileMenuOpen(true)}
      >
        <Menu size={20} />
        {unreadNotifsCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
      </button>

      {/* Mobile Menu Drawer */}
       <div className={`fixed inset-0 z-50 flex md:hidden transition-all duration-500 ${mobileMenuOpen ? 'visible' : 'invisible'}`}>
            <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setMobileMenuOpen(false)}></div>
            <div className={`relative w-80 bg-white h-full shadow-2xl flex flex-col transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Meny</h2>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Management</p>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    <NavItem id="overview" label="Översikt" icon={LayoutDashboard} />
                    <NavItem id="calendar" label="Kalender" icon={CalendarIcon} />
                    <NavItem id="clients" label="Klienter" icon={Users} />
                    <NavItem id="tasks" label="Uppgifter" icon={CheckSquare} />
                    <NavItem id="chat" label="Internchatt" icon={MessageCircle} badge={unreadNotifsCount > 0} />
                    <NavItem id="files" label="Filer" icon={FolderOpen} />
                    
                    <div className="mt-8 mb-2 px-4"><h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Verktyg</h3></div>
                    <button onClick={() => { setIsStickyOpen(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:text-black hover:bg-gray-50 transition-colors">
                        <StickyNote size={20} /> <span className="font-medium text-sm">Anteckningar</span>
                    </button>
                    <button onClick={() => { setIsBroadcastModalOpen(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:text-black hover:bg-gray-50 transition-colors">
                        <Megaphone size={20} /> <span className="font-medium text-sm">Skapa Utrop</span>
                    </button>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                     <div className="flex items-center gap-3 mb-4 p-2 rounded-xl bg-white border border-gray-100 shadow-sm active:scale-95 transition-transform" onClick={() => { setIsProfileModalOpen(true); setMobileMenuOpen(false); }}>
                        <Avatar name={currentUser.name} src={currentUser.avatar} size="sm" />
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{currentUser.name}</p>
                            <p className="text-xs text-gray-400">Inställningar</p>
                        </div>
                        <Settings size={16} className="text-gray-300"/>
                     </div>
                     <Button className="w-full bg-red-50 text-red-500 hover:bg-red-100 border-none shadow-none" onClick={() => setIsLogoutModalOpen(true)}>Logga ut</Button>
                </div>
            </div>
      </div>

      <aside className={`hidden md:flex flex-col bg-white/80 backdrop-blur-xl border-r border-gray-200/50 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] z-20 ${isSidebarCollapsed ? 'w-24' : 'w-72'}`}>
        <div className="p-8 flex items-center justify-between">
            <div className={`flex items-center gap-4 transition-all duration-500 ${isSidebarCollapsed ? 'flex-col gap-6 w-full' : ''}`}>
                <div className="w-10 h-10 bg-black text-white rounded-xl shadow-lg flex items-center justify-center text-lg font-bold shrink-0">F</div>
                {!isSidebarCollapsed && (
                    <div className="animate-fade-in">
                        <h1 className="font-bold text-lg tracking-tight leading-none">FOOTSTEP</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Management</p>
                    </div>
                )}
                {isSidebarCollapsed && (
                     <button onClick={() => setIsSidebarCollapsed(false)} className="text-gray-300 hover:text-black transition-colors">
                        <PanelLeftOpen size={20}/>
                     </button>
                )}
            </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 py-4">
            <NavItem id="overview" label="Översikt" icon={LayoutDashboard} />
            <NavItem id="calendar" label="Kalender" icon={CalendarIcon} />
            <NavItem id="clients" label="Klienter" icon={Users} />
            <NavItem id="tasks" label="Uppgifter" icon={CheckSquare} />
            <NavItem id="chat" label="Internchatt" icon={MessageCircle} badge={unreadNotifsCount > 0} />
            <NavItem id="files" label="Filer" icon={FolderOpen} />
        </nav>

        <div className="p-6 border-t border-gray-100/50 relative">
             <div className={`flex items-center gap-3 p-3 rounded-2xl hover:bg-white transition-all cursor-pointer group ${isSidebarCollapsed ? 'justify-center' : ''}`} onClick={() => setIsProfileModalOpen(true)}>
                <Avatar name={currentUser.name} src={currentUser.avatar} size="sm" className="ring-2 ring-white shadow-sm"/>
                {!isSidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate group-hover:text-blue-600 transition-colors">{currentUser.name}</p>
                        <p className="text-xs text-gray-400 truncate">{currentUser.role === UserRole.OWNER ? 'Owner' : 'Manager'}</p>
                    </div>
                )}
                {!isSidebarCollapsed && <Settings size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors"/>}
             </div>
             {!isSidebarCollapsed && (
                 <button onClick={() => setIsSidebarCollapsed(true)} className="absolute top-[-15px] right-6 text-gray-300 hover:text-gray-600 transition-colors bg-white rounded-full p-1 border border-gray-100 shadow-sm">
                    <PanelLeftClose size={14}/>
                 </button>
             )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative">
         {isStickyOpen && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:bg-transparent md:backdrop-blur-none md:p-0 md:static md:inset-auto">
                 <div className={`
                    z-50 shadow-2xl shadow-yellow-500/20 transform transition-all duration-300 bg-[#fef3c7]
                    w-full h-full md:fixed md:top-20 md:right-8 md:w-72 md:h-72 md:rounded-lg md:rounded-br-3xl md:origin-top-right md:rotate-1 md:hover:rotate-0
                 `}>
                    <div className="w-full h-full p-6 flex flex-col relative">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-bold text-yellow-800/50 uppercase tracking-widest">Post-it</span>
                            <button onClick={() => setIsStickyOpen(false)} className="text-yellow-800/50 hover:text-yellow-800 md:hidden"><X size={18}/></button>
                            <button onClick={() => setIsStickyOpen(false)} className="hidden md:block text-yellow-800/50 hover:text-yellow-800"><X size={18}/></button>
                        </div>
                        <textarea 
                            className="flex-1 bg-transparent border-none resize-none focus:ring-0 p-0 text-lg md:text-sm font-medium text-gray-800 leading-relaxed placeholder-yellow-800/30"
                            placeholder="Skriv något att komma ihåg..."
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            onBlur={handleNoteBlur}
                            autoFocus
                        />
                    </div>
                </div>
            </div>
        )}

        <header className="h-20 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 glass border-b border-gray-200/50">
            <div className="flex items-center gap-4">
                 <h2 className="text-xl font-bold tracking-tight text-gray-900">
                    {activeTab === 'overview' && 'Dashboard'}
                    {activeTab === 'calendar' && 'Kalender'}
                    {activeTab === 'clients' && 'Klienter & Projekt'}
                    {activeTab === 'chat' && 'Team Chat'}
                    {activeTab === 'tasks' && 'Att Göra'}
                    {activeTab === 'files' && 'Filarkiv'}
                 </h2>
                 {(activeTab === 'overview' || activeTab === 'files') && (
                     <div className="hidden md:flex items-center gap-2 bg-gray-100/50 p-1 rounded-lg">
                        <select 
                            className="bg-transparent border-none text-sm font-semibold py-1 pl-3 pr-8 focus:ring-0 cursor-pointer rounded-md text-gray-600 hover:text-black transition-colors"
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                        >
                            <option value="all">Alla Klienter</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                     </div>
                 )}
            </div>

            <div className="flex items-center gap-4 pr-12 md:pr-0">
                 <button onClick={() => setIsSearchOpen(true)} className="p-2.5 rounded-xl hover:bg-white hover:shadow-sm text-gray-500 transition-all" title="Sök (Cmd+K)">
                    <Search size={20}/>
                 </button>

                 <button onClick={() => setIsStickyOpen(!isStickyOpen)} className={`hidden md:block p-2.5 rounded-xl transition-all ${isStickyOpen ? 'bg-yellow-100 text-yellow-700' : 'hover:bg-white hover:shadow-sm text-gray-500'}`}>
                    <StickyNote size={20} strokeWidth={isStickyOpen ? 2.5 : 2}/>
                 </button>
                 
                 {activeTab === 'overview' && (
                    <div className="hidden lg:flex items-center gap-2 bg-gray-100/50 p-1 rounded-xl">
                        {(['day', 'week', 'month', 'year'] as TimeRange[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTimeRange(t)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize tracking-wide ${
                                    timeRange === t ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                {t === 'day' ? 'Dag' : t === 'week' ? 'Vecka' : t === 'month' ? 'Mån' : 'År'}
                            </button>
                        ))}
                    </div>
                 )}

                 {activeTab === 'overview' && (
                    <Button variant="secondary" size="sm" onClick={() => setIsBroadcastModalOpen(true)} className="hidden md:flex">
                        <Megaphone size={16} className="mr-2 text-blue-600"/> Utrop
                    </Button>
                 )}
                 
                 <Button variant="ghost" className="text-red-500 hover:bg-red-50 hidden md:flex" onClick={() => setIsLogoutModalOpen(true)} title="Logga ut"><LogOut size={18}/></Button>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 scroll-smooth">
            <div className="max-w-7xl mx-auto space-y-8 animate-slide-up pb-20">
                {activeTab === 'overview' && (
                    <div className="md:hidden space-y-4">
                        <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex items-center">
                            <span className="pl-3 text-xs font-bold text-gray-400 uppercase tracking-widest">Projekt:</span>
                            <select 
                                className="w-full bg-transparent border-none text-sm font-bold focus:ring-0"
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                            >
                                <option value="all">Alla Klienter</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="bg-gray-100/50 p-1 rounded-xl flex overflow-x-auto">
                            {(['day', 'week', 'month', 'year'] as TimeRange[]).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTimeRange(t)}
                                    className={`flex-1 px-2 py-2 text-xs font-semibold rounded-lg transition-all capitalize tracking-wide whitespace-nowrap ${
                                        timeRange === t ? 'bg-white text-black shadow-sm' : 'text-gray-400'
                                    }`}
                                >
                                    {t === 'day' ? 'Dag' : t === 'week' ? 'Vecka' : t === 'month' ? 'Mån' : 'År'}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {activeTab === 'overview' && (
                    <>
                        {aiInsight && (
                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-blue-100 p-5 rounded-2xl flex gap-5 items-start shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-12 bg-blue-400/10 rounded-full blur-2xl group-hover:bg-blue-400/20 transition-all duration-500"></div>
                                <div className="bg-white p-3 rounded-xl shadow-sm z-10">
                                    <Sparkles size={24} className="text-blue-600" />
                                </div>
                                <div className="z-10 max-w-3xl">
                                    <h3 className="text-blue-900 font-bold text-sm tracking-wide uppercase mb-1">AI Strategisk Analys</h3>
                                    <p className="text-blue-800 font-medium text-lg leading-relaxed">"{aiInsight}"</p>
                                </div>
                                <button onClick={() => setAiInsight('')} className="absolute top-4 right-4 text-blue-300 hover:text-blue-500"><X size={18}/></button>
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-2">{getTimeGreeting()}, {currentUser.name.split(' ')[0]}.</h1>
                                <div className="flex items-center gap-3">
                                    <div className="h-1 w-12 bg-black rounded-full"></div>
                                    <p className="text-gray-500 font-medium text-sm md:text-base">Här är status för <span className="text-black font-semibold">{selectedProject === 'all' ? 'hela portföljen' : projects.find(p => p.id === selectedProject)?.name}</span>.</p>
                                </div>
                            </div>
                            <Button onClick={handleAiInsight} disabled={loadingAi} className="shadow-xl shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 border-none text-white w-full md:w-auto">
                                <Sparkles size={16} className="mr-2"/> {loadingAi ? 'Analyserar...' : 'Generera AI Analys'}
                            </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                             {[
                                { id: 'streams', label: 'Totala Streams', value: metrics.totalStreams.toLocaleString(), trend: metrics.streamsTrend, icon: TrendingUp, color: 'blue' },
                                { id: 'revenue', label: 'Est. Intäkter', value: `${metrics.totalRevenue.toLocaleString()} kr`, trend: metrics.revenueTrend, icon: DollarSign, color: 'green' },
                                { id: 'followers', label: 'Totala Följare', value: metrics.totalFollowers.toLocaleString(), trend: metrics.followersTrend, icon: Users, color: 'purple' },
                                { id: 'mentions', label: 'Omnämnanden', value: metrics.totalMentions, trend: metrics.mentionsTrend, icon: Newspaper, color: 'orange' }
                             ].map((stat, idx) => (
                                 <div 
                                    key={stat.id} 
                                    onClick={() => setDetailModal(stat.id as any)}
                                    className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden"
                                 >
                                     <div className={`absolute top-0 right-0 p-16 rounded-full bg-${stat.color}-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                                     <div className="flex justify-between items-start mb-8 relative z-10">
                                         <div className={`p-3 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600`}>
                                            <stat.icon size={24} />
                                         </div>
                                         <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${stat.trend >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                             {stat.trend > 0 ? '+' : ''}{stat.trend.toFixed(1)}% <ArrowUpRight size={12}/>
                                         </div>
                                     </div>
                                     <div className="relative z-10">
                                         <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                         <h3 className="text-3xl font-bold text-gray-900 tabular-nums tracking-tight">{stat.value}</h3>
                                     </div>
                                 </div>
                             ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-100 shadow-sm p-8 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold flex items-center gap-3"><CheckSquare size={20} className="text-gray-400"/> Mina Uppgifter</h3>
                                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('tasks')}>Visa Alla</Button>
                                </div>
                                <div className="space-y-3">
                                    {myTasks.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                            Inga uppgifter. Njut av lugnet.
                                        </div>
                                    ) : (
                                        myTasks.map(task => (
                                            <div key={task.id} className="group flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-lg transition-all duration-300">
                                                <div className="flex items-center gap-4">
                                                    <button 
                                                        onClick={() => onUpdateTask({...task, status: 'DONE'})}
                                                        className="w-6 h-6 rounded-lg border-2 border-gray-300 group-hover:border-green-500 group-hover:text-green-500 flex items-center justify-center transition-all"
                                                    >
                                                        <div className="w-3 h-3 bg-current rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    </button>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 line-through-transition">{task.title}</p>
                                                        <p className="text-xs text-gray-500 font-medium">{projects.find(p => p.id === task.projectId)?.name || 'Internt'}</p>
                                                    </div>
                                                </div>
                                                {task.dueDate && (
                                                    <span className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-lg">{task.dueDate}</span>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            
                            <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col hover:shadow-md transition-shadow relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-3xl rounded-full pointer-events-none"></div>
                                <div className="flex justify-between items-center mb-6 relative z-10">
                                    <h3 className="text-lg font-bold flex items-center gap-3"><Coffee size={20} className="text-gray-400"/> Kom ikapp</h3>
                                    {unreadMessages.length > 0 && <button onClick={onMarkAsRead} className="text-xs font-bold text-blue-600 hover:underline">Markera läst</button>}
                                </div>
                                
                                <div className="flex-1 space-y-4 overflow-y-auto max-h-[400px] pr-2 relative z-10">
                                    {unreadMessages.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center py-10">
                                            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4 shadow-sm">
                                                <Check size={32} strokeWidth={3}/>
                                            </div>
                                            <h4 className="font-bold text-gray-900 text-lg">Allt lugnt!</h4>
                                            <p className="text-gray-500 text-sm">Du är helt up to date.</p>
                                        </div>
                                    ) : (
                                        unreadMessages.map(msg => (
                                            <div key={msg.id} onClick={() => setActiveTab('chat')} className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 hover:bg-blue-50 transition-colors cursor-pointer group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar name={msg.userName} size="sm" className="w-6 h-6 text-[10px] ring-2 ring-white"/>
                                                        <span className="font-bold text-sm text-gray-900">{msg.userName}</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-400">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                </div>
                                                <p className="text-sm text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors">"{msg.content}"</p>
                                                {msg.attachment && (
                                                    <div className="mt-2 flex items-center gap-2 bg-white/50 p-2 rounded-lg border border-blue-100">
                                                        <Paperclip size={12} className="text-blue-500"/>
                                                        <span className="text-xs font-medium text-blue-700">{msg.attachment.name}</span>
                                                    </div>
                                                )}
                                                <div className="mt-3 flex gap-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-white px-2 py-1 rounded-md border border-gray-100">{projects.find(p=>p.id===msg.projectId)?.name || 'Internt'}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
                
                {activeTab === 'calendar' && (
                    <div className="h-[800px] animate-fade-in">
                        <CalendarView 
                            currentUser={currentUser} 
                            events={events} 
                            tasks={tasks} 
                            projects={projects} 
                            selectedProject={selectedProject} 
                            onDateClick={(d: string) => { setSelectedDate(d); setIsEventModalOpen(true); }}
                            onDeleteEvent={onDeleteEvent}
                        />
                    </div>
                )}
                
                {activeTab === 'clients' && (
                    <ClientsList 
                        projects={projects} 
                        users={users} 
                        currentUser={currentUser}
                        onOpenProject={onOpenProject} 
                        onAddUser={() => setIsAddUserModalOpen(true)} 
                        onCreateProject={() => setIsCreateProjectModalOpen(true)}
                        onDeleteProject={onDeleteProject}
                        onManageUsers={() => setIsManageUsersModalOpen(true)}
                    />
                )}
                {activeTab === 'chat' && <InternalChat messages={messages} onSendMessage={onSendMessage} currentUser={currentUser} users={users} channels={chatChannels} onCreateChannel={onCreateChannel} onUploadFile={onUploadFile} notifications={notifications} onClearChannelNotifications={onClearChannelNotifications} />}
                {activeTab === 'tasks' && <TaskList tasks={filteredTasks} onUpdateTask={onUpdateTask} users={users} onAddTask={onAddTask} onDeleteTask={onDeleteTask} projects={projects} currentUser={currentUser} />}
                {activeTab === 'files' && <FileGrid files={filteredFiles} onUpload={(f: File) => onUploadFile(f)} onDelete={onDeleteFile} projectId={selectedProject}/>}

            </div>
        </div>
      </main>
      
      {isSearchOpen && (
        <SearchPalette 
            onClose={() => setIsSearchOpen(false)} 
            onSearch={onSearch} 
            onNavigate={(tab, id) => {
                setActiveTab(tab as any);
                setIsSearchOpen(false);
                if (tab === 'files' || tab === 'clients') {
                    // Could add logic here to scroll to/highlight item
                }
            }}
        />
      )}

      {isProfileModalOpen && <ProfileModal user={currentUser} onClose={() => setIsProfileModalOpen(false)} onSave={onUpdateUser} onChangePassword={onChangePassword} />}
      {detailModal && (
        <DetailModal 
            type={detailModal} 
            metrics={metrics} 
            onClose={() => setDetailModal(null)} 
            projectName={selectedProject === 'all' ? 'Alla Klienter' : projects.find(p => p.id === selectedProject)?.name || ''}
            onUpdateStats={selectedProject !== 'all' ? (type: any, val: any, date?: string) => onUpdateStats && onUpdateStats(selectedProject, type, val, date) : undefined}
        />
      )}
      {isBroadcastModalOpen && <BroadcastModal onClose={() => setIsBroadcastModalOpen(false)} onSend={onSendBroadcast} projects={projects} currentProjectSelection={selectedProject}/>}
      {isEventModalOpen && <AddEventModal onClose={() => setIsEventModalOpen(false)} onAdd={onAddEvent} initialDate={selectedDate} projects={projects} currentProject={selectedProject}/>}
      {isAddUserModalOpen && <AddUserModal onClose={() => setIsAddUserModalOpen(false)} onAdd={onAddUser} projects={projects} clientChannels={clientChannels} currentUser={currentUser} />}
      {isCreateProjectModalOpen && <CreateProjectModal onClose={() => setIsCreateProjectModalOpen(false)} onCreate={onCreateProject} />}
      {isManageUsersModalOpen && <ManageUsersModal onClose={() => setIsManageUsersModalOpen(false)} users={users} onEditUser={(u) => { setEditingUser(u); setIsManageUsersModalOpen(false); }} currentUser={currentUser} onDeleteUser={onDeleteUser} onChangePassword={onChangePassword} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={onAdminUpdateUser} projects={projects} clientChannels={clientChannels} currentUser={currentUser} />}
      
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
        if (res.type === 'TASK') onNavigate('tasks', res.id);
        if (res.type === 'FILE') onNavigate('files', res.id);
        if (res.type === 'PROJECT') onNavigate('clients', res.id);
        if (res.type === 'MESSAGE') onNavigate('chat', res.linkTo || '');
        if (res.type === 'EVENT') onNavigate('calendar', res.id);
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-scale" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                    <Search className="text-gray-400" size={20}/>
                    <input 
                        ref={inputRef}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-lg placeholder-gray-400" 
                        placeholder="Sök tasks, filer, projekt..." 
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <button onClick={onClose} className="p-1 bg-gray-100 rounded text-xs text-gray-500 font-bold px-2">ESC</button>
                </div>
                {query && results.length === 0 && (
                    <div className="p-8 text-center text-gray-400">Inga resultat hittades.</div>
                )}
                {results.length > 0 && (
                    <div className="max-h-[400px] overflow-y-auto p-2">
                        {results.map(res => (
                            <button 
                                key={res.id} 
                                onClick={() => handleSelect(res)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                            >
                                <div className={`p-2 rounded-lg ${
                                    res.type === 'TASK' ? 'bg-green-50 text-green-600' :
                                    res.type === 'FILE' ? 'bg-blue-50 text-blue-600' :
                                    res.type === 'PROJECT' ? 'bg-purple-50 text-purple-600' :
                                    res.type === 'MESSAGE' ? 'bg-gray-100 text-gray-600' :
                                    'bg-orange-50 text-orange-600'
                                }`}>
                                    {res.type === 'TASK' && <CheckSquare size={16}/>}
                                    {res.type === 'FILE' && <FileText size={16}/>}
                                    {res.type === 'PROJECT' && <LayoutDashboard size={16}/>}
                                    {res.type === 'MESSAGE' && <MessageCircle size={16}/>}
                                    {res.type === 'EVENT' && <CalendarIcon size={16}/>}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-900 group-hover:text-black">{res.title}</p>
                                    <p className="text-xs text-gray-400 group-hover:text-gray-500">{res.subtitle}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
                 {!query && (
                    <div className="p-4 bg-gray-50 text-xs text-gray-400 text-center">
                        Sök efter projekt, uppgifter, filer eller meddelanden.
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
            </div>
        </ModalBackdrop>
    );
};

const DetailModal: React.FC<{ 
    type: any; 
    metrics: any; 
    onClose: () => void; 
    projectName: string;
    onUpdateStats?: (type: any, val: any, date?: string) => void;
}> = ({ type, metrics, onClose, projectName, onUpdateStats }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newValue, setNewValue] = useState('');
    const [newLabel, setNewLabel] = useState('');

    const handleSave = () => {
        if (onUpdateStats && newValue && newLabel) {
            onUpdateStats(type, newValue, newLabel);
            setIsEditing(false);
            setNewValue('');
            setNewLabel('');
        }
    };

    return (
    <ModalBackdrop onClose={onClose}>
        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full relative z-10 animate-scale">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h2 className="text-2xl font-bold capitalize">{type === 'revenue' ? 'Intäkter' : type === 'streams' ? 'Streams' : type === 'followers' ? 'Följare' : type} Detaljer</h2>
                    <p className="text-gray-500">{projectName}</p>
                </div>
                {onUpdateStats && (
                    <Button size="sm" variant="secondary" onClick={() => setIsEditing(!isEditing)}>{isEditing ? 'Avbryt' : 'Registrera Data'}</Button>
                )}
            </div>
            
             {isEditing && (
                <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100 animate-fade-in">
                    <h3 className="text-sm font-bold mb-3 uppercase tracking-wide text-gray-500">Lägg till ny data</h3>
                    <div className="flex gap-3">
                        <input 
                            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" 
                            placeholder={type === 'revenue' ? 'Månad (t.ex. Aug)' : type === 'streams' ? 'Datum (t.ex. Aug 25)' : 'Plattform (t.ex. TikTok)'}
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                        />
                        <input 
                            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" 
                            placeholder={type === 'revenue' ? 'Belopp' : 'Antal'}
                            type="number"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                        />
                        <Button size="sm" onClick={handleSave}>Spara</Button>
                    </div>
                </div>
            )}

            <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 mb-6 relative overflow-hidden">
                <div className="absolute inset-0 flex items-end justify-around px-8 pb-4 opacity-50">
                    {[40, 60, 45, 70, 85, 65, 90, 75, 50, 60, 80, 95].map((h, i) => (
                        <div key={i} className={`w-4 bg-blue-500 rounded-t-sm`} style={{ height: `${h}%` }}></div>
                    ))}
                </div>
                <span className="relative z-10 font-medium">Ingen data tillgänglig än.</span>
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={onClose}>Stäng</Button>
            </div>
        </div>
    </ModalBackdrop>
)};

const BroadcastModal: React.FC<{ onClose: () => void; onSend: (msg: string, target: string) => void; projects: Project[]; currentProjectSelection: string }> = ({ onClose, onSend, projects, currentProjectSelection }) => {
    const [msg, setMsg] = useState('');
    const [target, setTarget] = useState(currentProjectSelection);
    return (
        <ModalBackdrop onClose={onClose}>
             <div className="bg-white rounded-3xl p-8 max-w-md w-full relative z-10 animate-scale">
                <h2 className="text-2xl font-bold mb-4">Skicka Utrop</h2>
                <textarea className="w-full bg-gray-50 border-transparent rounded-xl p-3 mb-4 h-32" placeholder="Meddelande..." value={msg} onChange={e => setMsg(e.target.value)}/>
                <select className="w-full bg-gray-50 border-transparent rounded-xl p-3 mb-4" value={target} onChange={e => setTarget(e.target.value)}>
                    <option value="all">Alla Projekt</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <Button className="w-full" onClick={() => { onSend(msg, target); onClose(); }}>Skicka</Button>
            </div>
        </ModalBackdrop>
    );
};

const AddEventModal: React.FC<{ onClose: () => void; onAdd: (e: CalendarEvent) => void; initialDate: string; projects: Project[]; currentProject: string }> = ({ onClose, onAdd, initialDate, projects, currentProject }) => {
    const [title, setTitle] = useState('');
    const [time, setTime] = useState('12:00');
    const [projectId, setProjectId] = useState(currentProject === 'all' ? 'internal' : currentProject);
    return (
        <ModalBackdrop onClose={onClose}>
             <div className="bg-white rounded-3xl p-8 max-w-md w-full relative z-10 animate-scale">
                <h2 className="text-2xl font-bold mb-4">Ny Händelse</h2>
                <div className="space-y-4 mb-6">
                    <input className="w-full bg-gray-50 border-transparent rounded-xl p-3" placeholder="Titel" value={title} onChange={e => setTitle(e.target.value)}/>
                    <input type="time" className="w-full bg-gray-50 border-transparent rounded-xl p-3" value={time} onChange={e => setTime(e.target.value)}/>
                    <select className="w-full bg-gray-50 border-transparent rounded-xl p-3" value={projectId} onChange={e => setProjectId(e.target.value)}>
                        <option value="internal">Internt</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <Button className="w-full" onClick={() => { 
                    onAdd({ id: Date.now().toString(), title, startDate: initialDate, startTime: time, type: 'OTHER', projectId }); 
                    onClose(); 
                }}>Lägg till</Button>
            </div>
        </ModalBackdrop>
    );
};

const CreateProjectModal: React.FC<{ onClose: () => void; onCreate: (name: string) => void }> = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');
    return (
        <ModalBackdrop onClose={onClose}>
             <div className="bg-white rounded-3xl p-8 max-w-md w-full relative z-10 animate-scale">
                <h2 className="text-2xl font-bold mb-4">Nytt Projekt</h2>
                <input className="w-full bg-gray-50 border-transparent rounded-xl p-3 mb-6" placeholder="Projektnamn" value={name} onChange={e => setName(e.target.value)}/>
                <Button className="w-full" onClick={() => { onCreate(name); onClose(); }}>Skapa</Button>
            </div>
        </ModalBackdrop>
    );
};

const AddUserModal: React.FC<{ onClose: () => void; onAdd: (u: any) => void; projects: Project[]; clientChannels: ClientChannel[]; currentUser: User }> = ({ onClose, onAdd, projects, clientChannels }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.CLIENT);
    const [clientRole, setClientRole] = useState<ClientRole>(ClientRole.USER);
    const [projectId, setProjectId] = useState(projects[0]?.id || '');
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

    const projectChannels = clientChannels.filter(c => c.projectId === projectId);

    const toggleChannel = (id: string) => {
        if (selectedChannels.includes(id)) {
            setSelectedChannels(prev => prev.filter(c => c !== id));
        } else {
            setSelectedChannels(prev => [...prev, id]);
        }
    }

    return (
        <ModalBackdrop onClose={onClose}>
             <div className="bg-white rounded-3xl p-8 max-w-md w-full relative z-10 animate-scale overflow-y-auto max-h-[80vh]">
                <h2 className="text-2xl font-bold mb-4">Ny Användare</h2>
                <div className="space-y-4 mb-6">
                    <input className="w-full bg-gray-50 border-transparent rounded-xl p-3" placeholder="Namn" value={name} onChange={e => setName(e.target.value)}/>
                    <input className="w-full bg-gray-50 border-transparent rounded-xl p-3" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}/>
                    <input className="w-full bg-gray-50 border-transparent rounded-xl p-3" type="password" placeholder="Lösenord" value={password} onChange={e => setPassword(e.target.value)}/>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Roll</label>
                        <select className="w-full bg-gray-50 border-transparent rounded-xl p-3" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                            <option value={UserRole.CLIENT}>Client</option>
                            <option value={UserRole.MANAGER}>Manager</option>
                            <option value={UserRole.OWNER}>Owner</option>
                        </select>
                    </div>

                    {role === UserRole.CLIENT && (
                         <div className="space-y-4 animate-fade-in">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Projekt</label>
                                <select className="w-full bg-gray-50 border-transparent rounded-xl p-3" value={projectId} onChange={e => setProjectId(e.target.value)}>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Klient-roll</label>
                                <select className="w-full bg-gray-50 border-transparent rounded-xl p-3" value={clientRole} onChange={e => setClientRole(e.target.value as ClientRole)}>
                                    <option value={ClientRole.USER}>User</option>
                                    <option value={ClientRole.TEAMLEADER}>Teamleader</option>
                                    <option value={ClientRole.GUEST}>Guest</option>
                                </select>
                            </div>
                            {clientRole === ClientRole.GUEST && (
                                <div className="space-y-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Tillgång till kanaler</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {projectChannels.map(c => (
                                            <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={selectedChannels.includes(c.id)} onChange={() => toggleChannel(c.id)} className="rounded text-black focus:ring-black"/>
                                                <span className="text-sm">{c.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <Button className="w-full" onClick={() => { 
                    onAdd({ 
                        name, 
                        email,
                        password, 
                        role, 
                        projectId: role === UserRole.CLIENT ? projectId : undefined, 
                        clientRole: role === UserRole.CLIENT ? clientRole : undefined,
                        allowedChannels: role === UserRole.CLIENT && clientRole === ClientRole.GUEST ? selectedChannels : undefined
                    }); 
                    onClose(); 
                }}>Skapa</Button>
            </div>
        </ModalBackdrop>
    );
};

const ManageUsersModal: React.FC<{ onClose: () => void; users: User[]; onEditUser: (u: User) => void; currentUser: User; onDeleteUser: (id: string) => void; onChangePassword: (id: string, pass: string) => void }> = ({ onClose, users, onEditUser, currentUser, onDeleteUser, onChangePassword }) => (
    <ModalBackdrop onClose={onClose}>
        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full relative z-10 animate-scale h-[600px] flex flex-col">
            <h2 className="text-2xl font-bold mb-6">Hantera Användare</h2>
            <div className="flex-1 overflow-y-auto space-y-2">
                {users.map(u => (
                    <div key={u.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Avatar name={u.name} size="sm"/>
                            <div>
                                <p className="font-bold text-sm">{u.name}</p>
                                <p className="text-xs text-gray-500">{u.role} {u.clientRole ? `(${u.clientRole})` : ''}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <Button size="sm" variant="secondary" onClick={() => onEditUser(u)}>Redigera</Button>
                             <button onClick={() => {
                                 const newPass = prompt(`Ange nytt lösenord för ${u.name}:`);
                                 if (newPass) {
                                     onChangePassword(u.id, newPass);
                                     alert('Lösenordet har återställts.');
                                 }
                             }} className="p-2 text-gray-400 hover:text-black hover:bg-gray-200 rounded-lg transition-colors" title="Återställ lösenord">
                                 <Key size={18}/>
                             </button>

                             {currentUser.role === UserRole.OWNER && u.id !== currentUser.id && (
                                 <button onClick={() => {
                                     if (confirm(`Är du säker på att du vill radera ${u.name}?`)) onDeleteUser(u.id);
                                 }} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                     <Trash2 size={18}/>
                                 </button>
                             )}
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={onClose}>Stäng</Button>
            </div>
        </div>
    </ModalBackdrop>
);

const EditUserModal: React.FC<{ user: User; onClose: () => void; onSave: (u: User) => void; projects: Project[]; clientChannels: ClientChannel[]; currentUser: User }> = ({ user, onClose, onSave, projects, clientChannels, currentUser }) => {
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [role, setRole] = useState(user.role);
    const [clientRole, setClientRole] = useState<ClientRole>(user.clientRole || ClientRole.USER);
    const [projectId, setProjectId] = useState(user.projectId || '');
    const [selectedChannels, setSelectedChannels] = useState<string[]>(user.allowedChannels || []);
    const [assignedProjects, setAssignedProjects] = useState<string[]>(user.assignedProjects || []);

    const projectChannels = clientChannels.filter(c => c.projectId === projectId);

    const toggleChannel = (id: string) => {
        if (selectedChannels.includes(id)) {
            setSelectedChannels(prev => prev.filter(c => c !== id));
        } else {
            setSelectedChannels(prev => [...prev, id]);
        }
    }

    const toggleAssignedProject = (id: string) => {
        if (assignedProjects.includes(id)) {
            setAssignedProjects(prev => prev.filter(p => p !== id));
        } else {
            setAssignedProjects(prev => [...prev, id]);
        }
    }

    return (
        <ModalBackdrop onClose={onClose}>
             <div className="bg-white rounded-3xl p-8 max-w-md w-full relative z-10 animate-scale overflow-y-auto max-h-[80vh]">
                <h2 className="text-2xl font-bold mb-4">Redigera Användare</h2>
                <div className="space-y-4 mb-6">
                    <input className="w-full bg-gray-50 border-transparent rounded-xl p-3" value={name} onChange={e => setName(e.target.value)}/>
                    <input className="w-full bg-gray-50 border-transparent rounded-xl p-3" value={email} onChange={e => setEmail(e.target.value)}/>
                    
                    <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Roll</label>
                        <select className="w-full bg-gray-50 border-transparent rounded-xl p-3" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                            <option value={UserRole.CLIENT}>Client</option>
                            <option value={UserRole.MANAGER}>Manager</option>
                            <option value={UserRole.OWNER}>Owner</option>
                        </select>
                    </div>

                    {currentUser.role === UserRole.OWNER && role === UserRole.MANAGER && (
                         <div className="space-y-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
                             <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Tilldela Projekt (Management)</label>
                             <div className="grid grid-cols-1 gap-2">
                                 {projects.map(p => (
                                     <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                                         <input type="checkbox" checked={assignedProjects.includes(p.id)} onChange={() => toggleAssignedProject(p.id)} className="rounded text-black focus:ring-black"/>
                                         <span className="text-sm">{p.name}</span>
                                     </label>
                                 ))}
                             </div>
                         </div>
                    )}

                    {role === UserRole.CLIENT && (
                         <div className="space-y-4 animate-fade-in">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Projekt</label>
                                <select className="w-full bg-gray-50 border-transparent rounded-xl p-3" value={projectId} onChange={e => setProjectId(e.target.value)}>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Klient-roll</label>
                                <select className="w-full bg-gray-50 border-transparent rounded-xl p-3" value={clientRole} onChange={e => setClientRole(e.target.value as ClientRole)}>
                                    <option value={ClientRole.USER}>User</option>
                                    <option value={ClientRole.TEAMLEADER}>Teamleader</option>
                                    <option value={ClientRole.GUEST}>Guest</option>
                                </select>
                            </div>
                             {clientRole === ClientRole.GUEST && (
                                <div className="space-y-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Tillgång till kanaler</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {projectChannels.map(c => (
                                            <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={selectedChannels.includes(c.id)} onChange={() => toggleChannel(c.id)} className="rounded text-black focus:ring-black"/>
                                                <span className="text-sm">{c.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="danger" className="flex-1" onClick={onClose}>Avbryt</Button>
                    <Button className="flex-1" onClick={() => { 
                        onSave({
                            ...user, 
                            name, 
                            email, 
                            role, 
                            projectId: role === UserRole.CLIENT ? projectId : undefined,
                            clientRole: role === UserRole.CLIENT ? clientRole : undefined,
                            allowedChannels: role === UserRole.CLIENT && clientRole === ClientRole.GUEST ? selectedChannels : undefined,
                            assignedProjects: role === UserRole.MANAGER ? assignedProjects : undefined
                        }); 
                        onClose(); 
                    }}>Spara</Button>
                </div>
            </div>
        </ModalBackdrop>
    );
};

const InternalChat: React.FC<any> = ({ messages, onSendMessage, currentUser, users, channels, onCreateChannel, onUploadFile, notifications, onClearChannelNotifications }) => {
    const [activeChannel, setActiveChannel] = useState('general');
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const channelMessages = messages.filter((m: ChatMessage) => m.room === activeChannel);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [channelMessages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        setIsSending(true);
        await new Promise(r => setTimeout(r, 500));
        onSendMessage(newMessage, activeChannel);
        setNewMessage('');
        setIsSending(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = onUploadFile(e.target.files[0]);
            if (file) onSendMessage(`Uploaded file: ${file.name}`, activeChannel, file);
        }
    };

    return (
        <div className="flex h-[800px] bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="w-64 border-r border-gray-100 bg-gray-50/50 p-4 flex flex-col">
                <div className="mb-4 flex justify-between items-center">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500">Kanaler</h3>
                    <button onClick={() => {
                        const name = prompt('Kanalnamn:');
                        if (name) onCreateChannel({ id: name.toLowerCase(), name, type: 'GROUP' });
                    }}><Plus size={16} className="text-gray-400 hover:text-black"/></button>
                </div>
                <div className="space-y-1 overflow-y-auto flex-1">
                    {channels.map((c: ChatChannel) => (
                        <button 
                            key={c.id} 
                            onClick={() => { setActiveChannel(c.id); if(onClearChannelNotifications) onClearChannelNotifications(c.id); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${activeChannel === c.id ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            <span># {c.name}</span>
                            {notifications.some((n: any) => n.linkTo === c.id) && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h3 className="font-bold text-lg">#{channels.find((c: ChatChannel) => c.id === activeChannel)?.name}</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30" ref={scrollRef}>
                    {channelMessages.map((msg: ChatMessage) => {
                        const isMe = msg.userId === currentUser.id;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        {!isMe && <span className="text-xs font-bold text-gray-500">{msg.userName}</span>}
                                        <span className="text-[10px] text-gray-300">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <div className={`p-3 rounded-2xl text-sm ${isMe ? 'bg-black text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'}`}>
                                        {msg.content}
                                        {msg.attachment && (
                                            <div className="mt-2 p-2 bg-white/10 rounded border border-white/20 flex items-center gap-2 cursor-pointer" onClick={() => window.open(msg.attachment?.url, '_blank')}>
                                                <Paperclip size={14}/> <span>{msg.attachment.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="p-4 bg-white border-t border-gray-100">
                    <form onSubmit={handleSend} className="relative">
                        <input 
                            className="w-full bg-gray-100 border-none rounded-full py-3 pl-4 pr-24 text-sm focus:ring-2 focus:ring-black/5" 
                            placeholder="Skriv ett meddelande..." 
                            value={newMessage} 
                            onChange={e => setNewMessage(e.target.value)}
                        />
                        <div className="absolute right-2 top-2 flex items-center gap-2">
                             <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                             <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 text-gray-400 hover:text-black"><Paperclip size={18}/></button>
                             <button type="submit" disabled={isSending} className="p-1.5 bg-black text-white rounded-full hover:bg-gray-800 transition-colors">
                                {isSending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                             </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

const CalendarView: React.FC<any> = ({ events, selectedProject, onDateClick, onDeleteEvent }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const startDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const adjustedStartDay = startDay === 0 ? 6 : startDay - 1; 

    const days = Array.from({ length: adjustedStartDay }).fill(null).concat(
        Array.from({ length: daysInMonth }, (_, i) => i + 1)
    );

    const filteredEvents = selectedProject === 'all' ? events : events.filter((e: CalendarEvent) => e.projectId === selectedProject || e.projectId === 'internal');

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                <div className="flex gap-2">
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20}/></button>
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={20}/></button>
                </div>
            </div>
            <div className="grid grid-cols-7 text-center border-b border-gray-100 bg-gray-50">
                {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(d => (
                    <div key={d} className="py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">{d}</div>
                ))}
            </div>
            <div className="flex-1 grid grid-cols-7 grid-rows-5">
                {days.map((day: any, i) => {
                    if (!day) return <div key={i} className="bg-gray-50/30 border-b border-r border-gray-100"></div>;
                    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayEvents = filteredEvents.filter((e: CalendarEvent) => e.startDate === dateStr);
                    
                    return (
                        <div key={i} className="border-b border-r border-gray-100 p-2 min-h-[100px] hover:bg-gray-50 transition-colors cursor-pointer relative group" onClick={() => onDateClick(dateStr)}>
                            <span className="text-sm font-semibold text-gray-700">{day}</span>
                            <div className="mt-1 space-y-1">
                                {dayEvents.map((ev: CalendarEvent) => (
                                    <div key={ev.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate border ${EVENT_COLORS[ev.type] || 'bg-gray-100 text-gray-800'}`}>
                                        {ev.title}
                                        <button onClick={(e) => { e.stopPropagation(); onDeleteEvent(ev.id); }} className="hidden group-hover:inline ml-1 text-red-500 hover:text-red-700">&times;</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ClientsList: React.FC<any> = ({ projects, users, currentUser, onOpenProject, onAddUser, onCreateProject, onDeleteProject, onManageUsers }) => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Klienter & Projekt</h2>
                <div className="flex gap-2">
                     <Button variant="secondary" onClick={onManageUsers}><Users size={16} className="mr-2"/> Användare</Button>
                     <Button onClick={onAddUser}><Plus size={16} className="mr-2"/> Ny Användare</Button>
                     <Button onClick={onCreateProject} variant="outline"><Plus size={16} className="mr-2"/> Nytt Projekt</Button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((p: Project) => (
                    <div key={p.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-all cursor-pointer group relative" onClick={() => onOpenProject(p)}>
                         <div className="flex justify-between items-start mb-4">
                             <div className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center text-xl font-bold">
                                 {p.name.charAt(0)}
                             </div>
                             {currentUser.role === UserRole.OWNER && (
                                 <button onClick={(e) => { e.stopPropagation(); if(confirm('Radera projekt?')) onDeleteProject(p.id); }} className="text-gray-300 hover:text-red-500 p-2">
                                     <Trash2 size={18}/>
                                 </button>
                             )}
                         </div>
                         <h3 className="text-lg font-bold mb-1">{p.name}</h3>
                         <p className="text-sm text-gray-500 mb-4">{p.members.length} medlemmar</p>
                         <div className="flex -space-x-2 overflow-hidden">
                             {p.members.map((mId: string) => {
                                 const u = users.find((user: User) => user.id === mId);
                                 if (!u) return null;
                                 return <Avatar key={mId} name={u.name} size="sm" className="ring-2 ring-white"/>
                             })}
                         </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

const TaskList: React.FC<any> = ({ tasks, onUpdateTask, users, onAddTask, onDeleteTask, projects, currentUser }) => {
    const [filter, setFilter] = useState<'all' | 'mine'>('all');
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [selectedProject, setSelectedProject] = useState(projects[0]?.id || 'internal');

    const filteredTasks = tasks.filter((t: Task) => filter === 'all' ? true : t.assigneeId === currentUser.id);

    const handleAdd = () => {
        if (!newTaskTitle.trim()) return;
        onAddTask({
            id: Date.now().toString(),
            title: newTaskTitle,
            status: 'TODO',
            assigneeId: currentUser.id,
            projectId: selectedProject,
            subtasks: []
        });
        setNewTaskTitle('');
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 min-h-[600px]">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold">Att Göra</h2>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setFilter('all')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filter === 'all' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Alla</button>
                        <button onClick={() => setFilter('mine')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filter === 'mine' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Mina</button>
                    </div>
                </div>
            </div>
            
            <div className="mb-6 flex flex-wrap gap-2">
                <input className="flex-[3] min-w-[200px] bg-gray-50 border-transparent rounded-xl px-4 py-2" placeholder="Ny uppgift..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}/>
                <select className="flex-1 min-w-[130px] bg-gray-50 border-transparent rounded-xl px-4 py-2" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
                    <option value="internal">Internt</option>
                    {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <Button onClick={handleAdd}><Plus size={20}/></Button>
            </div>

            <div className="space-y-2">
                {filteredTasks.map((task: Task) => (
                    <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm transition-all group">
                        <div className="flex items-center gap-4">
                            <button onClick={() => onUpdateTask({...task, status: task.status === 'DONE' ? 'TODO' : 'DONE'})} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.status === 'DONE' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-500'}`}>
                                {task.status === 'DONE' && <Check size={12}/>}
                            </button>
                            <span className={task.status === 'DONE' ? 'line-through text-gray-400' : 'font-medium'}>{task.title}</span>
                             <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-100">
                                {projects.find((p: Project) => p.id === task.projectId)?.name || 'Internt'}
                             </span>
                        </div>
                        <button onClick={() => onDeleteTask(task.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                    </div>
                ))}
            </div>
        </div>
    );
}

const FileGrid: React.FC<any> = ({ files, onUpload, onDelete, projectId }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 min-h-[600px]">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold">Filer & Dokument</h2>
                <div>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
                    <Button onClick={() => fileInputRef.current?.click()}><Plus size={16} className="mr-2"/> Ladda upp</Button>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {files.map((file: AppFile) => (
                    <div key={file.id} className="group relative bg-gray-50 rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:bg-white transition-all">
                        <div className="aspect-square bg-white rounded-xl mb-3 flex items-center justify-center relative overflow-hidden">
                            {file.type === 'image' ? (
                                <img src={file.url} alt={file.name} className="w-full h-full object-cover"/>
                            ) : (
                                <div className="text-gray-400"><FileText size={40}/></div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <a href={file.url} target="_blank" rel="noreferrer" className="p-2 bg-white rounded-full text-black"><Download size={16}/></a>
                                <button onClick={() => onDelete(file.id)} className="p-2 bg-red-500 rounded-full text-white"><Trash2 size={16}/></button>
                            </div>
                        </div>
                        <p className="font-bold text-xs truncate mb-1">{file.name}</p>
                        <p className="text-[10px] text-gray-400">{file.size}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}