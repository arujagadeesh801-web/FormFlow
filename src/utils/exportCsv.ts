import { Form, Question, FormResponse } from '../types';

export const exportResponsesToCsv = (
  form: Form,
  questions: Question[],
  responses: FormResponse[]
) => {
  if (!responses || responses.length === 0) {
    alert('No responses available to export.');
    return;
  }

  // Header row
  const headers = [
    'Submission ID',
    'Submitted At',
    'Respondent Email',
    'Participant Name'
  ];

  if (form.settings.isEvent) {
    headers.push('Registration Status', 'Checked In At');
  }

  // Add question titles as headers
  questions.forEach(q => {
    headers.push(q.title.replace(/"/g, '""'));
  });

  const rows: string[] = [headers.map(h => `"${h}"`).join(',')];

  // Data rows
  responses.forEach(resp => {
    const rowValues: string[] = [
      resp.id,
      new Date(resp.submittedAt).toLocaleString(),
      resp.respondentEmail || 'Anonymous',
      resp.participantName || 'N/A'
    ];

    if (form.settings.isEvent) {
      rowValues.push(resp.registrationStatus || 'registered');
      rowValues.push(resp.checkedInAt ? new Date(resp.checkedInAt).toLocaleString() : 'Not Checked In');
    }

    // Answers for each question
    questions.forEach(q => {
      const val = resp.answers[q.id];
      let formattedVal = '';
      if (val !== undefined && val !== null) {
        if (Array.isArray(val)) {
          formattedVal = val.join('; ');
        } else {
          formattedVal = String(val);
        }
      }
      rowValues.push(formattedVal.replace(/"/g, '""'));
    });

    rows.push(rowValues.map(v => `"${v}"`).join(','));
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(rows.join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  const safeTitle = form.title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
  link.setAttribute('download', `${safeTitle}_responses.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
