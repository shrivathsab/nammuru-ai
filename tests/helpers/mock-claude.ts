import { vi } from 'vitest';

export const VALID_CLASSIFY_RESPONSE = {
  is_valid: true,
  issue_type: 'Garbage',
  severity: 'medium',
  confidence: 0.91,
  rejection_reason: null,
  user_message: 'Garbage detected.',
  private_property_detected: false,
  description: 'Garbage pile on the roadside.',
};

export const INVALID_CLASSIFY_RESPONSE = {
  is_valid: false,
  issue_type: null,
  severity: null,
  confidence: 0,
  rejection_reason: 'non_civic',
  user_message: 'Not a civic issue visible in a public space.',
  private_property_detected: false,
  description: null,
};

/** Returns a vi.fn() shaped like anthropic.messages.create resolving to text JSON. */
export function mockAnthropicMessage(payload: unknown) {
  return vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(payload) }],
  });
}

/** Returns a vi.fn() shaped like anthropic.messages.create resolving to raw text. */
export function mockAnthropicText(text: string) {
  return vi.fn().mockResolvedValue({
    content: [{ type: 'text', text }],
  });
}
