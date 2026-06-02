/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Award, Percent, BookOpen, Calculator, Sparkles } from 'lucide-react';
import { UserProfile, SubjectName } from '../types';

interface ZScoreDashboardProps {
  userProfile: UserProfile;
}

export default function ZScoreDashboard({ userProfile }: ZScoreDashboardProps) {
  // Stream subject list configuration
  const subjects: SubjectName[] = userProfile.stream === "Biological Science"
    ? ["Physics", "Chemistry", "Biology"]
    : ["Physics", "Chemistry", "Combined Mathematics"];

  // Mock marks state (0 - 100)
  const [marks, setMarks] = useState<Record<SubjectName, number>>({
    "Physics": 75,
    "Chemistry": 68,
    "Biology": 62,
    "Combined Mathematics": 80
  });

  // National Mean (mu) and Standard Deviation (sigma) constants
  const nationalMean = 55;
  const standardDev = 10;

  const handleMarkChange = (subject: SubjectName, val: string) => {
    let numeric = Math.min(100, Math.max(0, Number(val) || 0));
    setMarks(prev => ({
      ...prev,
      [subject]: numeric
    }));
  };

  // Calculate individual and average Z-Scores
  const computeZScore = (mark: number) => {
    return Number(((mark - nationalMean) / standardDev).toFixed(4));
  };

  const scores = subjects.map(sub => computeZScore(marks[sub]));
  const averageZScore = Number((scores.reduce((a, b) => a + b, 0) / subjects.length).toFixed(4));

  // Determine Solarpunk Academic Rank
  const getCitadelRank = (z: number) => {
    if (z >= 2.0) return { title: "District Rank 1 Rank (Excellent)", color: "text-amber-400 glow-text-amber" };
    if (z >= 1.5) return { title: "University Medicine/Engineering Rank", color: "text-cyan-400 glow-text-cyan" };
    if (z >= 1.0) return { title: "State University Admission Lane", color: "text-emerald-400" };
    if (z >= 0.0) return { title: "Citadel Graduate Track (S - Credit)", color: "text-yellow-500" };
    return { title: "Auxiliary Learner (Needs focus)", color: "text-rose-400" };
  };

  const rank = getCitadelRank(averageZScore);

  return (
    <div id="zscore-dashboard-panel" className="bg-deep-card shadow-glow-cyan border border-slate-800 rounded-xl p-6 relative overflow-hidden">
      
      {/* Solarpunk aesthetic light gold streak */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500/60" />

      <div className="mb-6">
        <span className="text-xs font-mono text-amber-500 tracking-widest uppercase block">SPELL POTENCY AUDITOR</span>
        <h2 className="text-lg font-display font-medium text-slate-100 flex items-center gap-2 mt-0.5">
          <Calculator className="w-5 h-5 text-amber-500" />
          A/L Z-Score Estimator
        </h2>
      </div>

      {/* Prominent Score Banner */}
      <div id="z-score-prominent-display" className="p-6 bg-midnight border border-slate-800 rounded-xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,240,255,0.05),transparent_50%)] pointer-events-none" />
        
        <div className="relative z-10">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">ESTIMATED CITADEL Z-SCORE</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span id="average-zscore-value" className="text-5xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-cyan-400 tracking-tighter glow-text-cyan">
              {averageZScore > 0 ? `+${averageZScore}` : averageZScore}
            </span>
            <span className="text-[10px] font-mono text-slate-600 uppercase">Points</span>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span className={`text-xs font-mono font-medium ${rank.color}`}>
              {rank.title}
            </span>
          </div>
        </div>

        <div className="w-full md:w-auto text-left md:text-right bg-midnight/80 p-4 border border-slate-850 rounded-xl font-mono text-[10px] text-slate-400 space-y-1 relative z-10 shadow-inner">
          <p className="text-slate-200 font-bold mb-1 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> Constant Parameters:
          </p>
          <p>National Mean (μ): <strong className="text-slate-300">{nationalMean}%</strong></p>
          <p>Standard Deviation (σ): <strong className="text-slate-300">{standardDev}%</strong></p>
          <p className="text-[9px] text-slate-500 pt-1.5 border-t border-slate-900 mt-1.5">{"Formula: Z = (Mark - μ) / σ"}</p>
        </div>
      </div>

      {/* Grid of Subject parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {subjects.map((sub) => {
          const zValue = computeZScore(marks[sub]);

          // Extract current XP metrics from user Profile
          let subXp = 0;
          if (sub === "Physics") subXp = userProfile.physicsXp || 0;
          if (sub === "Chemistry") subXp = userProfile.chemistryXp || 0;
          if (sub === "Combined Mathematics") subXp = userProfile.mathsXp || 0;
          if (sub === "Biology") subXp = userProfile.biologyXp || 0;

          return (
            <div 
              id={`subject-card-${sub.replace(' ', '-')}`}
              key={sub}
              className="bg-[#161B22]/65 hover:bg-[#161B22] border border-slate-850 p-5 rounded-xl relative transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-slate-100 text-sm tracking-tight">{sub}</h3>
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5 block">G.C.E. A/L Core</span>
                </div>
                <BookOpen className="w-4 h-4 text-cyan-400" />
              </div>

              {/* Slider / Marks Inputs */}
              <div className="space-y-3.5 mb-4">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-500 uppercase">Mock Marks</span>
                  <div className="flex items-center gap-1">
                    <input
                      id={`mark-input-number-${sub.replace(' ', '-')}`}
                      type="number"
                      value={marks[sub]}
                      onChange={(e) => handleMarkChange(sub, e.target.value)}
                      className="w-14 px-1.5 py-0.5 bg-midnight border border-slate-800 rounded font-bold text-center text-amber-500 focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-slate-600">%</span>
                  </div>
                </div>
                <input
                  id={`mark-slider-${sub.replace(' ', '-')}`}
                  type="range"
                  min="0"
                  max="100"
                  value={marks[sub]}
                  onChange={(e) => handleMarkChange(sub, e.target.value)}
                  className="w-full h-1 bg-midnight rounded-lg cursor-pointer accent-amber-500"
                />
              </div>

              {/* Sub outputs */}
              <div className="flex items-center justify-between border-t border-[#090C10] pt-3 text-[10px] font-mono">
                <div>
                  <span className="text-slate-500 uppercase text-[9px] block">ESTIMATED Z</span>
                  <span id={`subject-zvalue-${sub.replace(' ', '-')}`} className="text-slate-200 font-bold">{zValue > 0 ? `+${zValue}` : zValue}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 uppercase text-[9px] block">FORGE XP</span>
                  <span className="text-cyan-400 font-bold">{subXp} XP</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
