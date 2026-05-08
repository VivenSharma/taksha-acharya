export type Lang = 'bn' | 'hi' | 'en';

export interface Module {
  id: string;
  title_bn: string;
  title_hi: string;
  title_en: string;
  icon: string;
  theory_hours: number;
  practical_hours: number;
  sort_order: number;
  group_key: string;
  group_label_bn: string | null;
  group_label_hi: string | null;
  group_label_en: string | null;
}

export interface Section {
  id: string;
  module_id: string;
  title_bn: string;
  title_hi: string;
  title_en: string;
  sort_order: number;
  estimated_hours: number;
}

export interface Content {
  id: string;
  section_id: string;
  lang: Lang;
  body: string;
  status: 'draft' | 'review' | 'published';
}

export interface Video {
  id: string;
  youtube_id: string;
  module_id: string;
  title_bn: string;
  title_hi: string;
  title_en: string;
  duration: string | null;
  start_seconds?: number | null;
}

export interface Badge {
  id: string;
  icon: string;
  title_bn: string;
  title_hi: string;
  title_en: string;
  condition_desc: string;
}

export interface Learner {
  id: string;
  device_id: string;
  name: string | null;
  phone: string | null;
  preferred_lang: Lang;
}

export interface Progress {
  id: string;
  learner_id: string;
  module_id: string;
  sections_completed: string[];
  time_spent_minutes: number;
  completed: boolean;
  completed_at: string | null;
}

export interface QuizAttempt {
  id: string;
  learner_id: string;
  module_id: string;
  score: number;
  total: number;
  questions: QuizQuestion[];
  created_at: string;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface EarnedBadge {
  id: string;
  learner_id: string;
  badge_id: string;
  earned_at: string;
}

export function getTitle(item: { title_bn: string; title_hi: string; title_en: string }, lang: Lang): string {
  return item[`title_${lang}`];
}

export function getGroupLabel(mod: Module, lang: Lang): string {
  return mod[`group_label_${lang}`] || mod.group_key;
}
