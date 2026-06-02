/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  stream: "Biological Science" | "Physical Science/Maths" | "";
  xp: number;
  aetherium: number;
  level: number;
  dailyStreak: number;
  totalStudyMinutes: number;
  physicsXp: number;
  chemistryXp: number;
  mathsXp: number;
  biologyXp: number;
  joinedGuildId: string;
  createdAt: string;
  lastStudyDate?: string;
}

export type SubjectName = "Physics" | "Chemistry" | "Biology" | "Combined Mathematics";

export interface StudyLog {
  id?: string;
  uid: string;
  subject: SubjectName;
  minutes: number;
  xpGained: number;
  createdAt: string;
}

export interface Duel {
  id: string;
  challengerId: string;
  challengerUsername: string;
  challengeeId: string;
  challengeeUsername: string;
  xpBet: number;
  status: "pending" | "in_progress" | "completed" | "declined";
  challengerStudyMinutesActual: number;
  challengeeStudyMinutesActual: number;
  challengerActive: boolean;
  challengeeActive: boolean;
  endTime: string;
  createdAt: string;
  winnerId: string | null;
  loserId: string | null;
}

export interface Guild {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  totalXp: number;
  activeChallengeTitle: string;
  activeChallengeTargetMinutes: number;
  activeChallengeCurrentMinutes: number;
  activeChallengeXpReward: number;
}
