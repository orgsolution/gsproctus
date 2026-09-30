export type UserSpecialty = string;

export const DEFAULT_SPECIALTIES: string[] = [
  'Finance',
  'Audit et Comptabilité',
  'Douane',
  'Trésor',
  'Comptabilité',
  'Économie',
  'Droit',
  'Gestion',
  'Agronomie',
  'Administration',
  'Administration Publique',
  'Informatique'
];

export const COHORT_YEARS = [
  '2005',
  '2007',
  '2009',
  '2011',
  '2013',
  '2015',
  '2017',
  '2020',
  '2025',
  '2026'
];

export const SUPERADMIN_EMAIL = 'acceuil.org@gmail.com';
export const SUPERADMIN_EMAILS = ['acceuil.org@gmail.com', 'accueil.org@gmail.com'];

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return SUPERADMIN_EMAILS.includes(clean);
}

export interface SchoolConfig {
  schoolName: string;
  headerSubtitle: string;
  cohortLabel: string;
  badgeText: string;
}

export const DEFAULT_SCHOOL_CONFIG: SchoolConfig = {
  schoolName: 'Haute École de Finance',
  headerSubtitle: 'Promotion Officielle',
  cohortLabel: '2025',
  badgeText: 'Certifié',
};

export interface ConfirmationEmail {
  id: string;
  toEmail: string;
  recipientName: string;
  subject: string;
  sentAt: string;
  token?: string;
  type: 'signup_confirmation' | 'password_reset';
  bodyText?: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  cohort: string;
  specialty: UserSpecialty;
  role?: 'SuperAdmin' | 'SimpleUser';
  bio?: string;
  linkedin?: string;
  avatar?: string;
  badges?: string[];
  totalScore?: number;
  gamesPlayed?: number;
  emailConfirmed?: boolean;
  authProvider?: 'credentials' | 'google';
  createdAt: string;
}

export interface PollOption {
  id: string;
  text: string;
  voters: string[]; // user IDs
}

export interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorCohort: string;
  authorSpecialty: UserSpecialty;
  content: string;
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorCohort: string;
  authorSpecialty: UserSpecialty;
  content: string;
  imageUrl?: string;
  poll?: {
    question: string;
    options: PollOption[];
  };
  likes: string[]; // user IDs
  comments: PostComment[];
  driveFileId?: string;
  driveWebViewLink?: string;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  read: boolean;
}

export interface QuizOption {
  text: string;
  color: string;
  shape: string;
}

export interface QuizQuestion {
  id?: string;
  question: string;
  options: QuizOption[];
  correctIndex: number;
  timeLimit: number;
  explanation?: string;
}

export interface GamePlayerAnswer {
  questionIndex: number;
  optionIndex: number;
  timeMs: number;
  correct: boolean;
  pointsAwarded: number;
}

export interface GamePlayer {
  id: string;
  name: string;
  avatar?: string;
  cohort: string;
  specialty: UserSpecialty;
  score: number;
  lastAnswer?: GamePlayerAnswer;
}

export interface GameSession {
  id: string;
  code: string; // 6-digit PIN
  title: string;
  sourceDocTitle?: string;
  hostId: string;
  hostName: string;
  status: 'waiting' | 'in_progress' | 'question_reveal' | 'finished';
  currentQuestionIndex: number;
  questionStartTime?: number;
  questions: QuizQuestion[];
  players: Record<string, GamePlayer>;
  createdAt: string;
}

export interface DocumentMeta {
  id: string;
  title: string;
  author: string;
  subject: string;
  year: string;
  tags: string[];
  description: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  dataBase64?: string;
  textSnippet: string;
  isFavorite?: boolean;
  driveFileId?: string;
  driveWebViewLink?: string;
  isGoogleDriveHosted?: boolean;
  createdAt: string;
}
