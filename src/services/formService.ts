import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Form,
  Question,
  FormResponse,
  UserProfile,
  RegistrationStatus,
  CollaboratorRole,
  FormCollaborator
} from '../types';
import { INITIAL_FORMS, INITIAL_RESPONSES } from '../lib/mockData';
import { generateUUID, isValidUUID } from '../utils/uuid';

const STORAGE_KEY_FORMS = 'formflow_forms_v1';
const STORAGE_KEY_RESPONSES = 'formflow_responses_v1';

// Local Storage helpers
const getLocalForms = (): Form[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FORMS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_FORMS, JSON.stringify(INITIAL_FORMS));
      return INITIAL_FORMS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load local forms:', e);
    return INITIAL_FORMS;
  }
};

const saveLocalForms = (forms: Form[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_FORMS, JSON.stringify(forms));
  } catch (e) {
    console.error('Failed to save local forms:', e);
  }
};

const getLocalResponses = (): FormResponse[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RESPONSES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_RESPONSES, JSON.stringify(INITIAL_RESPONSES));
      return INITIAL_RESPONSES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load local responses:', e);
    return INITIAL_RESPONSES;
  }
};

const saveLocalResponses = (responses: FormResponse[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_RESPONSES, JSON.stringify(responses));
  } catch (e) {
    console.error('Failed to save local responses:', e);
  }
};

export const formService = {
  // 1. Get Forms list according to user role
  async getForms(currentUser?: UserProfile | null): Promise<Form[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Supabase query timed out')), 5000)
        );

        let query = supabase
          .from('forms')
          .select('*, questions(*), form_collaborators(*), profiles(id, email, full_name, avatar_url, role)');

        if (currentUser?.role === 'admin') {
          // Admin can see all forms via RLS
        } else if (currentUser?.role === 'organizer') {
          // Organizers see own forms or shared forms (or public published) via RLS
        } else {
          // General unauthenticated / respondent: only published public forms
          query = query.eq('status', 'published').eq('is_public', true);
        }

        const { data, error }: any = await Promise.race([
          query.order('created_at', { ascending: false }),
          timeoutPromise
        ]);

        if (error) throw error;

        if (data && data.length > 0) {
          return data.map((row: any) => ({
            id: row.id,
            title: row.title,
            description: row.description || '',
            createdBy: row.created_by,
            creatorProfile: row.profiles ? {
              id: row.profiles.id,
              email: row.profiles.email,
              fullName: row.profiles.full_name || row.profiles.email,
              role: row.profiles.role,
              avatarUrl: row.profiles.avatar_url
            } : undefined,
            status: row.status,
            settings: {
              isPublic: row.is_public,
              requiresLogin: row.requires_login,
              allowMultipleResponses: row.allow_multiple_responses,
              responseLimit: row.response_limit,
              deadline: row.deadline,
              isEvent: row.is_event,
              eventDate: row.event_date,
              eventVenue: row.event_venue,
              eventCapacity: row.event_capacity
            },
            questions: (row.questions || []).sort((a: any, b: any) => a.order_index - b.order_index).map((q: any) => ({
              id: q.id,
              formId: q.form_id,
              title: q.title,
              description: q.description,
              type: q.type,
              required: q.required,
              orderIndex: q.order_index,
              options: q.options || [],
              scaleMin: q.scale_min,
              scaleMax: q.scale_max,
              scaleMinLabel: q.scale_min_label,
              scaleMaxLabel: q.scale_max_label
            })),
            collaborators: (row.form_collaborators || []).map((c: any) => ({
              id: c.id,
              formId: c.form_id,
              userId: c.user_id,
              userEmail: c.user_email || 'collaborator@college.edu',
              role: c.role
            })),
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));
        }
      } catch (err) {
        console.warn('Supabase query failed or returned no items, falling back to local store:', err);
      }
    }

    // Local / fallback store
    const localForms = getLocalForms();
    const responses = getLocalResponses();

    // Attach real-time response count
    const formsWithCounts = localForms.map(form => ({
      ...form,
      responseCount: responses.filter(r => r.formId === form.id).length
    }));

    if (!currentUser) {
      return formsWithCounts.filter(f => f.status === 'published' && f.settings.isPublic);
    }

    if (currentUser.role === 'admin') {
      return formsWithCounts;
    }

    // Organizer role
    return formsWithCounts.filter(f => {
      const isOwner = f.createdBy === currentUser.id;
      const isCollab = f.collaborators?.some(c => c.userEmail === currentUser.email || c.userId === currentUser.id);
      return isOwner || isCollab;
    });
  },

  // 2. Get Single Form by ID
  async getFormById(id: string): Promise<Form | null> {
    if (isSupabaseConfigured() && supabase && isValidUUID(id)) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Form fetch timed out')), 5000)
        );

        const { data, error }: any = await Promise.race([
          supabase
            .from('forms')
            .select('*, questions(*), form_collaborators(*), profiles(id, email, full_name, avatar_url, role)')
            .eq('id', id)
            .single(),
          timeoutPromise
        ]);

        if (error) throw error;
        if (!data) return null;

        return {
          id: data.id,
          title: data.title,
          description: data.description || '',
          createdBy: data.created_by,
          creatorProfile: data.profiles ? {
            id: data.profiles.id,
            email: data.profiles.email,
            fullName: data.profiles.full_name,
            role: data.profiles.role,
            avatarUrl: data.profiles.avatar_url
          } : undefined,
          status: data.status,
          settings: {
            isPublic: data.is_public,
            requiresLogin: data.requires_login,
            allowMultipleResponses: data.allow_multiple_responses,
            responseLimit: data.response_limit,
            deadline: data.deadline,
            isEvent: data.is_event,
            eventDate: data.event_date,
            eventVenue: data.event_venue,
            eventCapacity: data.event_capacity
          },
          questions: (data.questions || []).sort((a: any, b: any) => a.order_index - b.order_index).map((q: any) => ({
            id: q.id,
            formId: q.form_id,
            title: q.title,
            description: q.description,
            type: q.type,
            required: q.required,
            orderIndex: q.order_index,
            options: q.options || [],
            scaleMin: q.scale_min,
            scaleMax: q.scale_max,
            scaleMinLabel: q.scale_min_label,
            scaleMaxLabel: q.scale_max_label
          })),
          collaborators: (data.form_collaborators || []).map((c: any) => ({
            id: c.id,
            formId: c.form_id,
            userId: c.user_id,
            userEmail: c.user_email || 'collaborator@college.edu',
            role: c.role
          })),
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local store:', err);
      }
    }

    const localForms = getLocalForms();
    const responses = getLocalResponses();
    const found = localForms.find(f => f.id === id);
    if (!found) return null;

    return {
      ...found,
      responseCount: responses.filter(r => r.formId === found.id).length
    };
  },

  // 3. Create a new Form
  async createForm(formData: Partial<Form>, user: UserProfile): Promise<Form> {
    const newFormId = generateUUID();
    const now = new Date().toISOString();

    const newForm: Form = {
      id: newFormId,
      title: formData.title || 'Untitled Form',
      description: formData.description || '',
      createdBy: user.id,
      creatorProfile: user,
      status: formData.status || 'draft',
      settings: {
        isPublic: formData.settings?.isPublic ?? true,
        requiresLogin: formData.settings?.requiresLogin ?? false,
        allowMultipleResponses: formData.settings?.allowMultipleResponses ?? false,
        responseLimit: formData.settings?.responseLimit ?? null,
        deadline: formData.settings?.deadline ?? null,
        isEvent: formData.settings?.isEvent ?? false,
        eventDate: formData.settings?.eventDate ?? null,
        eventVenue: formData.settings?.eventVenue ?? '',
        eventCapacity: formData.settings?.eventCapacity ?? null
      },
      questions: formData.questions || [
        {
          id: generateUUID(),
          formId: newFormId,
          title: 'Question 1',
          type: 'short_answer',
          required: false,
          orderIndex: 0,
          options: []
        }
      ],
      collaborators: [],
      responseCount: 0,
      createdAt: now,
      updatedAt: now
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const createdByUUID = isValidUUID(user.id) ? user.id : undefined;

        const { data, error } = await supabase
          .from('forms')
          .insert({
            id: newForm.id,
            title: newForm.title,
            description: newForm.description,
            created_by: createdByUUID,
            status: newForm.status,
            is_public: newForm.settings.isPublic,
            requires_login: newForm.settings.requiresLogin,
            allow_multiple_responses: newForm.settings.allowMultipleResponses,
            response_limit: newForm.settings.responseLimit,
            deadline: newForm.settings.deadline,
            is_event: newForm.settings.isEvent,
            event_date: newForm.settings.eventDate,
            event_venue: newForm.settings.eventVenue,
            event_capacity: newForm.settings.eventCapacity
          })
          .select()
          .single();

        if (error) throw error;

        // Insert initial questions with UUIDs
        if (newForm.questions && newForm.questions.length > 0) {
          const qInserts = newForm.questions.map((q, idx) => ({
            id: isValidUUID(q.id) ? q.id : generateUUID(),
            form_id: newForm.id,
            title: q.title,
            description: q.description || '',
            type: q.type,
            required: q.required,
            order_index: idx,
            options: q.options || [],
            scale_min: q.scaleMin,
            scale_max: q.scaleMax,
            scale_min_label: q.scaleMinLabel,
            scale_max_label: q.scaleMaxLabel
          }));
          await supabase.from('questions').insert(qInserts);
        }
      } catch (err) {
        console.warn('Supabase create failed, persisting locally:', err);
      }
    }

    // Persist locally
    const current = getLocalForms();
    saveLocalForms([newForm, ...current]);
    return newForm;
  },

  // 4. Update an existing Form
  async updateForm(id: string, updates: Partial<Form>): Promise<Form> {
    const current = getLocalForms();
    const index = current.findIndex(f => f.id === id);
    if (index === -1) throw new Error('Form not found');

    const updatedForm: Form = {
      ...current[index],
      ...updates,
      settings: {
        ...current[index].settings,
        ...(updates.settings || {})
      },
      updatedAt: new Date().toISOString()
    };

    if (isSupabaseConfigured() && supabase && isValidUUID(id)) {
      try {
        await supabase
          .from('forms')
          .update({
            title: updatedForm.title,
            description: updatedForm.description,
            status: updatedForm.status,
            is_public: updatedForm.settings.isPublic,
            requires_login: updatedForm.settings.requiresLogin,
            allow_multiple_responses: updatedForm.settings.allowMultipleResponses,
            response_limit: updatedForm.settings.responseLimit,
            deadline: updatedForm.settings.deadline,
            is_event: updatedForm.settings.isEvent,
            event_date: updatedForm.settings.eventDate,
            event_venue: updatedForm.settings.eventVenue,
            event_capacity: updatedForm.settings.eventCapacity,
            updated_at: updatedForm.updatedAt
          })
          .eq('id', id);

        // Update questions if provided
        if (updates.questions) {
          // Delete old questions and replace
          await supabase.from('questions').delete().eq('form_id', id);
          if (updates.questions.length > 0) {
            const qInserts = updates.questions.map((q, idx) => ({
              id: isValidUUID(q.id) ? q.id : generateUUID(),
              form_id: id,
              title: q.title,
              description: q.description || '',
              type: q.type,
              required: q.required,
              order_index: idx,
              options: q.options || [],
              scale_min: q.scaleMin,
              scale_max: q.scaleMax,
              scale_min_label: q.scaleMinLabel,
              scale_max_label: q.scaleMaxLabel
            }));
            await supabase.from('questions').insert(qInserts);
          }
        }
      } catch (err) {
        console.warn('Supabase update failed, saving locally:', err);
      }
    }

    current[index] = updatedForm;
    saveLocalForms(current);
    return updatedForm;
  },

  // 5. Duplicate Form
  async duplicateForm(id: string, user: UserProfile): Promise<Form> {
    const source = await this.getFormById(id);
    if (!source) throw new Error('Source form not found');

    const newId = generateUUID();
    const duplicatedQuestions = (source.questions || []).map((q, i) => ({
      ...q,
      id: generateUUID(),
      formId: newId,
      orderIndex: i
    }));

    return this.createForm(
      {
        title: `${source.title} (Copy)`,
        description: source.description,
        status: 'draft',
        settings: { ...source.settings },
        questions: duplicatedQuestions
      },
      user
    );
  },

  // 6. Delete Form
  async deleteForm(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase && isValidUUID(id)) {
      try {
        await supabase.from('forms').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete failed:', err);
      }
    }

    const current = getLocalForms().filter(f => f.id !== id);
    saveLocalForms(current);

    // Also remove responses
    const responses = getLocalResponses().filter(r => r.formId !== id);
    saveLocalResponses(responses);

    return true;
  },

  // 7. Submit a Response
  async submitResponse(
    formId: string,
    answers: Record<string, any>,
    participantInfo?: { name?: string; email?: string },
    user?: UserProfile | null
  ): Promise<{ success: boolean; responseId?: string; error?: string }> {
    const form = await this.getFormById(formId);
    if (!form) return { success: false, error: 'Form not found' };

    if (form.status === 'closed') {
      return { success: false, error: 'This form is no longer accepting responses.' };
    }

    if (form.settings.deadline) {
      const deadlineDate = new Date(form.settings.deadline);
      if (new Date() > deadlineDate) {
        return { success: false, error: 'The deadline for this form has passed.' };
      }
    }

    // Fetch existing responses to enforce limits and duplicate checks
    const existing = await this.getFormResponses(formId);

    if (form.settings.responseLimit && existing.length >= form.settings.responseLimit) {
      return { success: false, error: `This form has reached its maximum limit of ${form.settings.responseLimit} responses.` };
    }

    const respondentEmail = participantInfo?.email || user?.email;
    if (!form.settings.allowMultipleResponses && respondentEmail) {
      const alreadySubmitted = existing.some(r => r.respondentEmail?.toLowerCase() === respondentEmail.toLowerCase());
      if (alreadySubmitted) {
        return { success: false, error: 'You have already submitted a response to this form.' };
      }
    }

    const responseId = generateUUID();
    const now = new Date().toISOString();

    const newResponse: FormResponse = {
      id: responseId,
      formId,
      respondentId: user?.id && isValidUUID(user.id) ? user.id : null,
      respondentEmail: respondentEmail || null,
      submittedAt: now,
      answers,
      participantName: participantInfo?.name || user?.fullName || 'Anonymous Participant',
      registrationStatus: form.settings.isEvent ? 'registered' : 'confirmed',
      checkedInAt: null
    };

    if (isSupabaseConfigured() && supabase && isValidUUID(formId)) {
      try {
        const { data: respData, error: respErr } = await supabase
          .from('responses')
          .insert({
            id: newResponse.id,
            form_id: formId,
            respondent_id: newResponse.respondentId,
            respondent_email: newResponse.respondentEmail,
            submitted_at: now
          })
          .select()
          .single();

        if (respErr) throw respErr;

        // Insert answers
        const answerEntries = Object.entries(answers).map(([qId, val]) => ({
          id: generateUUID(),
          response_id: newResponse.id,
          question_id: isValidUUID(qId) ? qId : generateUUID(),
          value: val
        }));

        if (answerEntries.length > 0) {
          await supabase.from('answers').insert(answerEntries);
        }

        // Insert event registration if event
        if (form.settings.isEvent && participantInfo?.name && respondentEmail) {
          await supabase.from('event_registrations').insert({
            id: generateUUID(),
            form_id: formId,
            response_id: newResponse.id,
            participant_name: participantInfo.name,
            participant_email: respondentEmail,
            status: 'registered'
          });
        }
      } catch (err) {
        console.warn('Supabase submission failed, storing locally:', err);
      }
    }

    // Save locally
    const currentResp = getLocalResponses();
    saveLocalResponses([newResponse, ...currentResp]);

    return { success: true, responseId };
  },

  // 8. Get Responses for Form
  async getFormResponses(formId: string): Promise<FormResponse[]> {
    if (isSupabaseConfigured() && supabase && isValidUUID(formId)) {
      try {
        const { data, error } = await supabase
          .from('responses')
          .select('*, answers(*), event_registrations(*)')
          .eq('form_id', formId)
          .order('submitted_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          return data.map((row: any) => {
            const ansMap: Record<string, any> = {};
            (row.answers || []).forEach((a: any) => {
              ansMap[a.question_id] = a.value;
            });

            const reg = row.event_registrations?.[0];

            return {
              id: row.id,
              formId: row.form_id,
              respondentId: row.respondent_id,
              respondentEmail: row.respondent_email,
              submittedAt: row.submitted_at,
              answers: ansMap,
              participantName: reg?.participant_name || 'Participant',
              registrationStatus: reg?.status || 'confirmed',
              checkedInAt: reg?.checked_in_at || null
            };
          });
        }
      } catch (err) {
        console.warn('Supabase fetch responses failed, reading local:', err);
      }
    }

    const localResp = getLocalResponses();
    return localResp.filter(r => r.formId === formId);
  },

  // 9. Update Participant Registration / Attendance Status
  async updateAttendance(
    formId: string,
    responseId: string,
    status: RegistrationStatus
  ): Promise<boolean> {
    const now = status === 'attended' ? new Date().toISOString() : null;

    if (isSupabaseConfigured() && supabase && isValidUUID(responseId)) {
      try {
        await supabase
          .from('event_registrations')
          .update({
            status,
            checked_in_at: now
          })
          .eq('response_id', responseId);
      } catch (err) {
        console.warn('Supabase attendance update failed:', err);
      }
    }

    const currentResp = getLocalResponses();
    const idx = currentResp.findIndex(r => r.id === responseId && r.formId === formId);
    if (idx !== -1) {
      currentResp[idx].registrationStatus = status;
      if (status === 'attended') {
        currentResp[idx].checkedInAt = new Date().toISOString();
      } else {
        currentResp[idx].checkedInAt = null;
      }
      saveLocalResponses(currentResp);
    }

    return true;
  },

  // 10. Add Form Collaborator
  async addCollaborator(
    formId: string,
    userEmail: string,
    role: CollaboratorRole = 'editor'
  ): Promise<FormCollaborator> {
    const form = await this.getFormById(formId);
    if (!form) throw new Error('Form not found');

    const cleanEmail = userEmail.trim().toLowerCase();

    // Check existing collaborators
    const existingCollabs = form.collaborators || [];
    if (existingCollabs.some(c => c.userEmail.toLowerCase() === cleanEmail)) {
      throw new Error('This user is already a collaborator on this form.');
    }

    let linkedUserId = generateUUID();

    if (isSupabaseConfigured() && supabase && isValidUUID(formId)) {
      // Look up existing profile in Supabase
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profile) {
        linkedUserId = profile.id;
        const { error: insErr } = await supabase
          .from('form_collaborators')
          .insert({
            id: generateUUID(),
            form_id: formId,
            user_id: profile.id,
            role
          });

        if (insErr) {
          console.warn('Supabase collaborator insert warning:', insErr);
        }
      } else {
        // If profile doesn't exist yet, we still record locally
        console.info(`Organizer profile for ${cleanEmail} not found in database yet; will link upon account registration.`);
      }
    }

    const newCollab: FormCollaborator = {
      id: generateUUID(),
      formId,
      userId: linkedUserId,
      userEmail: cleanEmail,
      role
    };

    const updatedCollabs = [...existingCollabs, newCollab];
    await this.updateForm(formId, { collaborators: updatedCollabs });

    return newCollab;
  },

  // 11. Remove Form Collaborator
  async removeCollaborator(formId: string, collaboratorId: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase && isValidUUID(collaboratorId)) {
      try {
        await supabase.from('form_collaborators').delete().eq('id', collaboratorId);
      } catch (err) {
        console.warn('Supabase remove collaborator warning:', err);
      }
    }

    const form = await this.getFormById(formId);
    if (!form) return false;

    const updatedCollabs = (form.collaborators || []).filter(c => c.id !== collaboratorId);
    await this.updateForm(formId, { collaborators: updatedCollabs });
    return true;
  },

  // 12. Seed / Sync Starter Forms to Supabase
  // Preserves existing forms and populates starter hackathon/seminar forms with valid UUIDs
  async seedStarterFormsToSupabase(user: UserProfile): Promise<{ success: boolean; count: number; message: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, count: 0, message: 'Supabase is not configured' };
    }

    try {
      // 1. Check if Supabase already has forms
      const { data: existingForms, error: countErr } = await supabase
        .from('forms')
        .select('id')
        .limit(1);

      if (countErr) throw countErr;

      if (existingForms && existingForms.length > 0) {
        return {
          success: true,
          count: existingForms.length,
          message: 'Database already contains active forms. Existing database forms preserved.'
        };
      }

      // 2. Prepare starter forms with UUIDs
      let insertedCount = 0;
      for (const starter of INITIAL_FORMS) {
        const formUUID = generateUUID();
        const { error: formErr } = await supabase.from('forms').insert({
          id: formUUID,
          title: starter.title,
          description: starter.description,
          created_by: isValidUUID(user.id) ? user.id : undefined,
          status: starter.status,
          is_public: starter.settings.isPublic,
          requires_login: starter.settings.requiresLogin,
          allow_multiple_responses: starter.settings.allowMultipleResponses,
          response_limit: starter.settings.responseLimit,
          deadline: starter.settings.deadline,
          is_event: starter.settings.isEvent,
          event_date: starter.settings.eventDate,
          event_venue: starter.settings.eventVenue,
          event_capacity: starter.settings.eventCapacity
        });

        if (formErr) {
          console.warn('Seed form error:', formErr);
          continue;
        }

        // Insert questions
        if (starter.questions && starter.questions.length > 0) {
          const qInserts = starter.questions.map((q, idx) => ({
            id: generateUUID(),
            form_id: formUUID,
            title: q.title,
            description: q.description || '',
            type: q.type,
            required: q.required,
            order_index: idx,
            options: q.options || [],
            scale_min: q.scaleMin,
            scale_max: q.scaleMax,
            scale_min_label: q.scaleMinLabel,
            scale_max_label: q.scaleMaxLabel
          }));
          await supabase.from('questions').insert(qInserts);
        }

        insertedCount++;
      }

      return {
        success: true,
        count: insertedCount,
        message: `Successfully seeded ${insertedCount} starter forms to Supabase database.`
      };
    } catch (err: any) {
      return {
        success: false,
        count: 0,
        message: err?.message || 'Failed to seed forms to Supabase'
      };
    }
  }
};
