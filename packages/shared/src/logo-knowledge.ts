/**
 * Defaults + placeholders for per-sport AI logo creation prompts.
 * Stored on each KnowledgeProfile as logoInstructions / logoPromptTemplate.
 */

export const LOGO_PROMPT_PLACEHOLDERS = [
  'teamName',
  'sport',
  'composition',
  'vibe',
  'text',
  'icon',
  'colors',
  'logoNotes',
  'primaryColor',
  'secondaryColor',
  'alternateColor',
  'textSentence',
  'iconSentence',
  'notesSentence',
] as const;

export const DEFAULT_LOGO_INSTRUCTIONS = [
  'Output ONLY the logo centered on a clean solid white background.',
  'No mockup, no jersey, no athlete, no watermark, no extra text outside the logo.',
  'High-definition vector-like clarity suitable for sublimation and embroidery.',
].join(' ');

export const DEFAULT_LOGO_PROMPT_TEMPLATE = [
  'Create a single premium sports team logo for {{teamName}} ({{sport}}).',
  'Logo type: {{composition}}.',
  'Style vibe: {{vibe}}. Big Mad Drip brand energy — bold, custom, production-minded, never basic.',
  '{{textSentence}}',
  '{{iconSentence}}',
  'Color palette: {{colors}}.',
  '{{notesSentence}}',
].join(' ');

export type LogoPromptSettings = {
  instructions: string;
  promptTemplate: string;
};

export function createDefaultLogoPromptSettings(): LogoPromptSettings {
  return {
    instructions: DEFAULT_LOGO_INSTRUCTIONS,
    promptTemplate: DEFAULT_LOGO_PROMPT_TEMPLATE,
  };
}
