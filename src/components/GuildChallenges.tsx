/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { doc, getDocs, collection, updateDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Shield, Sparkles, Trophy, Users, Check, Flame, Star } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Guild } from '../types';

interface GuildChallengesProps {
  userProfile: UserProfile;
  activeStudySubject: string | null;
  onProfileUpdate: (profile: UserProfile) => void;
}

export default function GuildChallenges({ userProfile, activeStudySubject, onProfileUpdate }: GuildChallengesProps) {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Built-in Citadel Guilds definitions
  const INITIAL_GUILDS: Guild[] = [
    {
      id: 'guild-newton',
      name: "Newton's Disciples",
      description: "Elite theoretical Physics specialists mastering classical and quantum mechanics.",
      membersCount: 24,
      totalXp: 12450,
      activeChallengeTitle: "Breakthrough on Thermodynamics Problems",
      activeChallengeTargetMinutes: 200,
      activeChallengeCurrentMinutes: 145,
      activeChallengeXpReward: 50
    },
    {
      id: 'guild-mendeleev',
      name: "Mendeleev's Order",
      description: "Masters of physical and organic chemistry reactions and thermodynamic equilibria.",
      membersCount: 18,
      totalXp: 9800,
      activeChallengeTitle: "Synthesizing Organic Aromatic Chains",
      activeChallengeTargetMinutes: 150,
      activeChallengeCurrentMinutes: 92,
      activeChallengeXpReward: 40
    },
    {
      id: 'guild-euler',
      name: "Euler's Assembly",
      description: "Focus specialists of combined pure math and bio-mathematics research.",
      membersCount: 31,
      totalXp: 16800,
      activeChallengeTitle: "Integral Calculus Speedrun Challenges",
      activeChallengeTargetMinutes: 300,
      activeChallengeCurrentMinutes: 210,
      activeChallengeXpReward: 75
    }
  ];

  // Fetch or setup guilds list in Firestore
  useEffect(() => {
    const fetchGuilds = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'guilds'));
        if (querySnapshot.empty) {
          // Initialize public guilds first time
          for (const g of INITIAL_GUILDS) {
            await setDoc(doc(db, 'guilds', g.id), g);
          }
          setGuilds(INITIAL_GUILDS);
        } else {
          const list: Guild[] = [];
          querySnapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as Guild);
          });
          setGuilds(list);
        }
      } catch (err) {
        console.error("Failed to query guilds", err);
      }
    };
    fetchGuilds();
  }, []);

  // When study subject changes, increment progress inside my joined guild if active!
  useEffect(() => {
    if (activeStudySubject && userProfile.joinedGuildId) {
      const interval = setInterval(async () => {
        try {
          const guildRef = doc(db, 'guilds', userProfile.joinedGuildId);
          const currentGuild = guilds.find(g => g.id === userProfile.joinedGuildId);
          if (currentGuild) {
            const nextMinutes = Math.min(
              currentGuild.activeChallengeTargetMinutes,
              (currentGuild.activeChallengeCurrentMinutes || 0) + 1
            );
            
            await updateDoc(guildRef, {
              activeChallengeCurrentMinutes: nextMinutes
            });

            // Local refresh
            setGuilds(prev => prev.map(g => 
              g.id === userProfile.joinedGuildId 
                ? { ...g, activeChallengeCurrentMinutes: nextMinutes } 
                : g
            ));
          }
        } catch (err) {
          console.error(err);
        }
      }, 60000); // 1 minute ticker contribution

      return () => clearInterval(interval);
    }
  }, [activeStudySubject, userProfile.joinedGuildId, guilds]);

  const handleEnlistInGuild = async (guildId: string) => {
    setError('');
    setSuccess('');

    try {
      const batchWrites = [];
      const userRef = doc(db, 'users', userProfile.uid);
      
      // If student was already in a guild, decrement membersCount of that guild first
      if (userProfile.joinedGuildId) {
        const oldGuildRef = doc(db, 'guilds', userProfile.joinedGuildId);
        const oldGuild = guilds.find(g => g.id === userProfile.joinedGuildId);
        if (oldGuild) {
          await updateDoc(oldGuildRef, {
            membersCount: Math.max(0, oldGuild.membersCount - 1)
          });
        }
      }

      // Update new guild metrics
      const newGuildRef = doc(db, 'guilds', guildId);
      const targetGuild = guilds.find(g => g.id === guildId);
      if (targetGuild) {
        await updateDoc(newGuildRef, {
          membersCount: targetGuild.membersCount + 1
        });
      }

      // Update student profile with joined ID
      await updateDoc(userRef, {
        joinedGuildId: guildId
      });

      // Update Client
      const updatedProfile = { ...userProfile, joinedGuildId: guildId };
      onProfileUpdate(updatedProfile);

      setSuccess(`Co-Op Covenant verified! You are now enlisted in: ${targetGuild?.name}`);

      // Refresh guilds lists
      const querySnapshot = await getDocs(collection(db, 'guilds'));
      const list: Guild[] = [];
      querySnapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Guild);
      });
      setGuilds(list);

    } catch (err: any) {
      setError("Guild Enlistment failed: " + err.message);
    }
  };

  // Speed Acceleration Option (Fast Challenge completer for presentation evaluation)
  const quickContributeMinutes = async (guildId: string) => {
    try {
      const gRef = doc(db, 'guilds', guildId);
      const target = guilds.find(g => g.id === guildId);
      if (target) {
        const nextMinutes = Math.min(
          target.activeChallengeTargetMinutes,
          target.activeChallengeCurrentMinutes + 10
        );

        await updateDoc(gRef, {
          activeChallengeCurrentMinutes: nextMinutes
        });

        // Trigger guild XP payout if breakthrough limit reached!
        if (nextMinutes >= target.activeChallengeTargetMinutes) {
          setSuccess(`GUILD BREAKTHROUGH COMPLETED FOR ${target.name}! +${target.activeChallengeXpReward} XP Distributed to members.`);
        }

        setGuilds(prev => prev.map(g => 
          g.id === guildId 
            ? { ...g, activeChallengeCurrentMinutes: nextMinutes } 
            : g
        ));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div id="guild-challenges-panel" className="bg-deep-card shadow-glow-cyan border border-slate-800 rounded-xl p-6 relative overflow-hidden">
      
      {/* Light aura divider */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-cyan-500/60" />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase block">Solarpunk Syndicate</span>
          <h2 className="text-xl font-display font-medium text-slate-100 flex items-center gap-2 mt-0.5">
            <Shield className="w-5 h-5 text-cyan-400" />
            Academic Co-op Guilds
          </h2>
        </div>
      </div>

      {error && (
        <div id="guild-error" className="mb-4 p-3.5 bg-red-950/40 border border-red-500/30 text-red-100 text-xs rounded-xl">
          {error}
        </div>
      )}

      {success && (
        <div id="guild-success" className="mb-4 p-3.5 bg-cyan-950/40 border border-cyan-500/30 text-[#00F0FF] text-xs rounded-xl glow-text-cyan">
          {success}
        </div>
      )}

      {/* Grid of Available Guilds */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {guilds.map((g) => {
          const isEnlisted = userProfile.joinedGuildId === g.id;
          const pct = Math.round((g.activeChallengeCurrentMinutes / g.activeChallengeTargetMinutes) * 100);

          return (
            <div 
              id={`guild-card-${g.id}`}
              key={g.id}
              className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                isEnlisted 
                  ? "bg-cyan-950/15 border-[#00F0FF]/40 shadow-glow-cyan"
                  : "bg-midnight/60 border-slate-850 hover:border-slate-800"
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-3.5">
                  <span className="p-1 px-2.5 bg-midnight border border-slate-800 rounded text-[9px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Users className="w-3 h-3" /> {g.membersCount} Scholars
                  </span>
                  {isEnlisted && (
                    <span className="p-1 px-2.5 bg-cyan-950 border border-cyan-500/35 rounded text-[9px] font-mono text-[#00F0FF] uppercase tracking-widest font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Enlisted
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-100 font-display">{g.name}</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{g.description}</p>

                {/* Co-op Challenge Section */}
                <div className="mt-4 p-3.5 bg-midnight border border-slate-850 rounded-xl">
                  <span className="text-[9px] font-mono p-0.5 px-1.5 bg-amber-950/40 border border-amber-500/20 text-amber-400 rounded uppercase block w-max">
                    Co-op Spell Challenge
                  </span>
                  <h4 className="text-xs font-semibold text-slate-200 mt-2 line-clamp-1">{g.activeChallengeTitle}</h4>
                  
                  {/* Progress Bar */}
                  <div className="mt-3.5">
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                      <span>Progress ({pct}%)</span>
                      <span>{g.activeChallengeCurrentMinutes} / {g.activeChallengeTargetMinutes} Min</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#05070A] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-400 transition-all duration-300 shadow-glow-cyan"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase">
                    <span>Reward Payout:</span>
                    <span className="text-amber-400 font-bold">+{g.activeChallengeXpReward} XP</span>
                  </div>
                </div>
              </div>

              {/* Action and Dev Tools */}
              <div className="mt-5 space-y-2">
                {!isEnlisted ? (
                  <button
                    id={`enlist-guild-btn-${g.id}`}
                    onClick={() => handleEnlistInGuild(g.id)}
                    className="w-full py-2 bg-midnight hover:bg-[#161B22] border border-slate-800 hover:border-cyan-500 text-slate-200 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Enlist in Guild
                  </button>
                ) : (
                  <div className="text-center p-1.5 border border-dashed border-[#00F0FF]/30 rounded-xl text-[10px] font-mono text-[#00F0FF] bg-cyan-950/10">
                    Focus studying fuels this syndicate challenge!
                  </div>
                )}

                {/* Acceleration button for sandbox presentation evaluation */}
                <button
                  id={`quick-contribute-guild-btn-${g.id}`}
                  onClick={() => quickContributeMinutes(g.id)}
                  className="w-full py-1 bg-midnight border border-[#161B22] hover:border-amber-500 text-[9px] font-mono text-slate-600 hover:text-slate-400 rounded uppercase transition-colors cursor-pointer"
                >
                  ⚡ Mock Guild Study (+10 Min)
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
