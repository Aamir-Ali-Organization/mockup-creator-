import type { AiPromptPayload, LogoPromptSettings } from '@mockup/shared';
import { createDefaultLogoPromptSettings } from '@mockup/shared';

export type LogoBrief = {
  teamName: string;
  sport: string;
  primaryColor: string;
  secondaryColor: string;
  alternateColor?: string | null;
  logoComposition?: string | null;
  logoText?: string | null;
  logoIcon?: string | null;
  logoColorSource?: string | null;
  logoPrimaryColor?: string | null;
  logoSecondaryColor?: string | null;
  logoAlternateColor?: string | null;
  logoVibe?: string | null;
  logoNotes?: string | null;
};

export function logoBriefFromPayload(payload: AiPromptPayload): LogoBrief {
  return {
    teamName: payload.team.name,
    sport: payload.team.sport,
    primaryColor: payload.colors.primary,
    secondaryColor: payload.colors.secondary,
    alternateColor: payload.colors.alternate,
    logoComposition: payload.logoComposition,
    logoText: payload.logoText,
    logoIcon: payload.logoIcon,
    logoColorSource: payload.logoColorSource,
    logoPrimaryColor: payload.logoPrimaryColor,
    logoSecondaryColor: payload.logoSecondaryColor,
    logoAlternateColor: payload.logoAlternateColor,
    logoVibe: payload.logoVibe,
    logoNotes: payload.logoNotes,
  };
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveLogoPalette(brief: LogoBrief): string {
  const colorSource = (brief.logoColorSource || 'Use my team colors').trim();
  if (colorSource === 'I want specific logo colors') {
    const custom = [
      brief.logoPrimaryColor,
      brief.logoSecondaryColor,
      brief.logoAlternateColor,
    ]
      .map((c) => (c || '').trim())
      .filter(Boolean);
    if (custom.length) return custom.join(' / ');
  }
  return [brief.primaryColor, brief.secondaryColor, brief.alternateColor]
    .filter(Boolean)
    .join(' / ');
}

function briefVars(brief: LogoBrief): Record<string, string> {
  const composition = (brief.logoComposition || 'Word + icon combined').trim();
  const vibe = (brief.logoVibe || 'Bold & aggressive').trim();
  const text = (brief.logoText || brief.teamName).trim();
  const icon = (brief.logoIcon || '').trim();
  const colors = resolveLogoPalette(brief);
  const notes = (brief.logoNotes || '').trim();

  return {
    teamName: brief.teamName,
    sport: brief.sport,
    composition,
    vibe,
    text,
    icon,
    colors,
    logoNotes: notes,
    primaryColor: brief.primaryColor,
    secondaryColor: brief.secondaryColor,
    alternateColor: (brief.alternateColor || '').trim(),
    textSentence: text
      ? `Lettering / text on the logo: "${text}". Keep typography sharp and readable at jersey size.`
      : '',
    iconSentence: icon ? `Icon / mascot concept: ${icon}.` : '',
    notesSentence: notes ? `Extra direction: ${notes}.` : '',
  };
}

/** Standalone OpenAI prompt to generate the logo image (step 1). */
export function buildStandaloneLogoPrompt(
  brief: LogoBrief,
  settings?: LogoPromptSettings | null,
): string {
  const logoSettings =
    settings?.promptTemplate?.trim() ? settings : createDefaultLogoPromptSettings();

  const filled = fillTemplate(logoSettings.promptTemplate, briefVars(brief));
  const instructions = (logoSettings.instructions || '').trim();

  return [instructions, filled].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/** Short brief line injected into the uniform mockup prompt when creating a logo. */
export function buildLogoCreationBriefLine(brief: LogoBrief): string {
  const parts = [
    brief.logoComposition ? `type=${brief.logoComposition}` : null,
    brief.logoText ? `text="${brief.logoText}"` : null,
    brief.logoIcon ? `icon=${brief.logoIcon}` : null,
    brief.logoVibe ? `vibe=${brief.logoVibe}` : null,
    `colors=${resolveLogoPalette(brief)}`,
    brief.logoNotes ? `notes=${brief.logoNotes}` : null,
  ].filter(Boolean);
  return parts.length ? `Logo brief: ${parts.join('; ')}.` : '';
}
