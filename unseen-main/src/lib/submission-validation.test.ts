import { describe, expect, it } from 'vitest';
import { SUBMISSION_TERMS_VERSION } from './submission-terms';
import { InputError, validateSubmission } from '../../supabase/functions/r2-media/validation';

const makeSubmission = (metadata: Record<string, unknown>) => ({
  kind: 'photo',
  metadata: {
    titolo: 'Opera',
    autore: 'Autore',
    storia: '',
    social_link: '',
    age_rights_accepted: true,
    terms_accepted: true,
    terms_version: SUBMISSION_TERMS_VERSION,
    ...metadata,
  },
  files: [{ kind: 'image', mime: 'image/png', bytes: 8 }],
});

describe('submission consent validation', () => {
  it('requires both confirmations and the current terms version', () => {
    expect(() => validateSubmission(makeSubmission({ terms_accepted: false }), crypto.randomUUID()))
      .toThrow(InputError);
    expect(() => validateSubmission(makeSubmission({ age_rights_accepted: false }), crypto.randomUUID()))
      .toThrow(InputError);
    expect(() => validateSubmission(makeSubmission({ terms_version: 'old-version' }), crypto.randomUUID()))
      .toThrow(InputError);
  });

  it('normalizes accepted consent into server-side upload metadata', () => {
    const submission = validateSubmission(makeSubmission({}), crypto.randomUUID());
    expect(submission.metadata).toMatchObject({
      age_rights_accepted: 'true',
      terms_accepted: 'true',
      terms_version: SUBMISSION_TERMS_VERSION,
    });
  });
});
