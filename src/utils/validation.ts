import { Question } from '../types';

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export interface ValidationError {
  questionId: string;
  message: string;
}

export const validateFormSubmission = (
  questions: Question[],
  answers: Record<string, string | string[] | number>
): { isValid: boolean; errors: ValidationError[] } => {
  const errors: ValidationError[] = [];

  for (const q of questions) {
    const val = answers[q.id];

    if (q.required) {
      if (val === undefined || val === null || val === '') {
        errors.push({ questionId: q.id, message: 'This question is required.' });
        continue;
      }

      if (Array.isArray(val) && val.length === 0) {
        errors.push({ questionId: q.id, message: 'Please select at least one option.' });
        continue;
      }
    }

    if (val !== undefined && val !== null && val !== '') {
      if (q.type === 'multiple_choice' || q.type === 'dropdown') {
        if (typeof val === 'string' && q.options.length > 0 && !q.options.includes(val)) {
          errors.push({ questionId: q.id, message: 'Invalid option selected.' });
        }
      }

      if (q.type === 'linear_scale') {
        const numVal = Number(val);
        const min = q.scaleMin ?? 1;
        const max = q.scaleMax ?? 5;
        if (isNaN(numVal) || numVal < min || numVal > max) {
          errors.push({ questionId: q.id, message: `Please rate between ${min} and ${max}.` });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
