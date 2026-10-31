import type { Difficulty } from '../types';

export type Theme = 'school' | 'everyday' | 'trivia';

export type FactItem = {
  id: string;
  difficulty: Difficulty;
  theme: Theme;
  prompt: string;
  truth: string;
  near: string;
  fars: [string, string, string];
};

export type NumberItem = {
  id: string;
  difficulty: Difficulty;
  theme: Theme;
  prompt: string;
  truth: number;
  trap: number;
  fars: [number, number];
  trapVia?: 'add' | 'sub' | 'mul';
};

export type OddItem = {
  id: string;
  difficulty: Difficulty;
  theme: Theme;
  prompt: string;
  truth: string;
  step: string;
  stepNote: string;
  trap: string;
  trapNote: string;
  inGroup: [string, string];
};
