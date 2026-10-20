export type UserRole = 'admin' | 'organizer' | 'user';

export type FormStatus = 'draft' | 'published' | 'closed';

export type QuestionType =
  | 'short_answer'
  | 'paragraph'
  | 'multiple_choice'
  | 'checkboxes'
  | 'dropdown'
  | 'date'
  | 'linear_scale';

export type CollaboratorRole = 'editor' | 'viewer';

export type RegistrationStatus = 'registered' | 'confirmed' | 'attended' | 'cancelled';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Question {
  id: string;
  formId: string;
  title: string;
  description?: string;
  type: QuestionType;
  required: boolean;
  orderIndex: number;
  options: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
}

export interface FormSettings {
  isPublic: boolean;
  requiresLogin: boolean;
  allowMultipleResponses: boolean;
  responseLimit?: number | null;
  deadline?: string | null;
  isEvent: boolean;
  eventDate?: string | null;
  eventVenue?: string | null;
  eventCapacity?: number | null;
}

export interface FormCollaborator {
  id: string;
  formId: string;
  userId: string;
  userEmail: string;
  role: CollaboratorRole;
}

export interface Form {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  creatorProfile?: UserProfile;
  status: FormStatus;
  settings: FormSettings;
  questions?: Question[];
  collaborators?: FormCollaborator[];
  responseCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnswerItem {
  questionId: string;
  value: string | string[] | number;
}

export interface FormResponse {
  id: string;
  formId: string;
  respondentId?: string | null;
  respondentEmail?: string | null;
  submittedAt: string;
  answers: Record<string, string | string[] | number>;
  participantName?: string;
  registrationStatus?: RegistrationStatus;
  checkedInAt?: string | null;
}

export interface EventRegistration {
  id: string;
  formId: string;
  responseId: string;
  participantName: string;
  participantEmail: string;
  status: RegistrationStatus;
  checkedInAt?: string | null;
  createdAt: string;
}
