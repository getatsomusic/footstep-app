
import React, { useState } from 'react';
import { Button } from './Button';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface AuthProps {
  onLogin?: (email: string, password: string) => void; 
}

export const Auth: React.FC<AuthProps> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!isSupabaseConfigured) {
        setErrorMsg('Supabase är inte konfigurerat. Lägg till NEXT_PUBLIC_SUPABASE_URL och NEXT_PUBLIC_SUPABASE_ANON_KEY i din .env fil.');
        return;
    }

    setIsLoading(true);

    try {
        // Handle Login Only
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                throw new Error('Felaktig e-post eller lösenord.');
            }
            throw error;
        }
        // Successful login will trigger onAuthStateChange in App.tsx
    } catch (error: any) {
      console.error('Auth error:', error);
      setErrorMsg(error.message || 'Ett fel uppstod vid autentisering.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] px-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black text-white rounded-2xl shadow-xl mb-6 transform transition-transform hover:scale-105 duration-300">
            <span className="font-bold text-2xl tracking-tighter">F</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">FOOTSTEP</h1>
          <p className="text-gray-500 text-sm tracking-wide uppercase">Management Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 p-8 sm:p-12 border border-gray-100 relative overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl break-words animate-fade-in">
                {errorMsg}
              </div>
            )}
            
            {!isSupabaseConfigured && !errorMsg && (
                 <div className="p-3 bg-yellow-50 border border-yellow-100 text-yellow-700 text-xs font-bold rounded-xl break-words">
                    Systemet saknar databaskoppling. Vänligen konfigurera Supabase.
                 </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">
                E-postadress
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="email"
                    id="email"
                    required
                    className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-gray-200 focus:ring-2 focus:ring-black/5 focus:shadow-lg transition-all duration-200 text-sm font-medium"
                    placeholder="namn@footstep.se"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-xs font-semibold text-gray-400 uppercase tracking-widest ml-1">
                Lösenord
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    required
                    className="block w-full pl-12 pr-12 py-3.5 bg-gray-50 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-gray-200 focus:ring-2 focus:ring-black/5 focus:shadow-lg transition-all duration-200 text-sm font-medium"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full py-3.5 text-sm rounded-xl shadow-xl shadow-black/10 hover:shadow-black/20 transform active:scale-95 transition-all duration-200">
              Logga in
            </Button>
          </form>

          <div className="mt-8 text-center px-4">
             <p className="text-[10px] text-gray-400 font-medium">
                Endast inbjudna medlemmar. Kontakta din manager om du saknar inloggningsuppgifter.
             </p>
          </div>
        </div>
        
        <p className="mt-8 text-center text-[10px] text-gray-300 uppercase tracking-widest font-semibold">
          Secured by Supabase & Footstep Tech
        </p>
      </div>
    </div>
  );
};
