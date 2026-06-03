'use client';

import { useEffect, useState } from 'react';
import { 
  ShieldCheck, UserPlus, Loader2, Mail, Key, User, LockKeyhole
} from 'lucide-react';

interface HRUser {
  id: string;
  name: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export default function TeamPage() {
  const [users, setUsers] = useState<HRUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Invite Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [teamError, setTeamError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Status updating ID
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchMe();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMe() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUserId(data.user.id);
      }
    } catch (e) {}
  }

  const handleToggleStatus = async (id: string) => {
    setUpdatingId(id);
    setTeamError('');
    try {
      const res = await fetch(`/api/users/${id}/status`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Toggle status failed');
      
      fetchUsers();
    } catch (e: any) {
      setTeamError(e.message || 'Could not update recruiter status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError('');
    setInviteSuccess(false);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register recruiter');
      }

      setInviteSuccess(true);
      setName('');
      setEmail('');
      setPassword('');
      fetchUsers();
    } catch (e: any) {
      setInviteError(e.message || 'Invitation failed');
    } finally {
      setInviting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess(false);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setPasswordError(e.message || 'Password change failed');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm font-semibold text-slate-400">Loading HR Console...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
          Recruitment Partners
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Manage HR user accounts, disable/reactivate peer recruiters, and invite new members.
        </p>
      </div>

      {teamError && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-semibold">
          {teamError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Center Side: Partners List */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-lg space-y-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800/40 pb-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Active Team Directory
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-2">Recruiter</th>
                  <th className="py-4 px-2">Access Email</th>
                  <th className="py-4 px-2">Status</th>
                  <th className="py-4 px-2 text-right">Administrative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm">
                {users.map((user) => (
                  <tr key={user.id} className="group hover:bg-slate-900/10 transition-colors duration-300">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-slate-300 font-bold border border-slate-800 text-xs shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-200">{user.name}</span>
                        {user.id === currentUserId && (
                          <span className="px-1.5 py-0.5 bg-indigo-500/15 text-indigo-400 text-[9px] font-extrabold rounded uppercase tracking-wider border border-indigo-500/10">You</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-2 text-slate-400 font-medium">{user.email}</td>
                    <td className="py-4 px-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        user.status === 'ACTIVE' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right">
                      {user.id !== currentUserId ? (
                        <button
                          disabled={updatingId === user.id}
                          onClick={() => handleToggleStatus(user.id)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-300 cursor-pointer ${
                            user.status === 'ACTIVE'
                              ? 'border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/15'
                              : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/15'
                          }`}
                        >
                          {user.status === 'ACTIVE' ? 'Disable Account' : 'Reactivate'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium italic">Owner protection</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Account Controls */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-lg space-y-6 h-fit">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800/40 pb-3">
            <UserPlus className="w-5 h-5 text-purple-400" />
            Add New Recruiter
          </h2>

          {inviteError && (
            <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold">
              {inviteError}
            </div>
          )}

          {inviteSuccess && (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
              Account created and registered successfully! Recruiter can log in immediately.
            </div>
          )}

          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Partner Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="glass-input pl-10 block w-full px-4 py-2.5 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Partner Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="recruiter@company.com"
                  className="glass-input pl-10 block w-full px-4 py-2.5 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Temporary Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Key className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="glass-input pl-10 block w-full px-4 py-2.5 rounded-xl text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={inviting}
              className="w-full flex items-center justify-center gap-1.5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold hover-glow transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {inviting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Add Recruiter
                </>
              )}
            </button>
          </form>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-lg space-y-6 h-fit">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800/40 pb-3">
            <LockKeyhole className="w-5 h-5 text-blue-700" />
            Change Your Password
          </h2>

          {passwordError && (
            <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold">
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
              Password updated successfully.
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="glass-input block w-full px-4 py-2.5 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="glass-input block w-full px-4 py-2.5 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="glass-input block w-full px-4 py-2.5 rounded-xl text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="w-full flex items-center justify-center gap-1.5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold hover-glow transition-all duration-300 shadow-md cursor-pointer disabled:opacity-50"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <LockKeyhole className="w-4 h-4" />
                  Update Password
                </>
              )}
            </button>
          </form>
        </div>
        </div>

      </div>

    </div>
  );
}
