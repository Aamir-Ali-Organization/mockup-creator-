import { z } from 'zod';
import { SPORTS } from './constants.js';

export const knowledgeSampleSchema = z.object({
  id: z.string(),
  filename: z.string(),
  url: z.string(),
  /** Vercel Blob pathname when stored remotely. */
  pathname: z.string().optional(),
  caption: z.string().optional().default(''),
  uploadedAt: z.string(),
});

export const knowledgeProfileSchema = z.object({
  id: z.string(),
  sport: z.string(),
  label: z.string(),
  enabled: z.boolean().default(true),
  /** Dynamic system / brand instructions for this form type. */
  instructions: z.string(),
  /** Freeform knowledge base / playbook notes for this form type. */
  knowledgeBase: z.string().default(''),
  /**
   * Prompt template with placeholders:
   * {{teamName}} {{sport}} {{gender}} {{ageGroup}}
   * {{primaryColor}} {{secondaryColor}} {{alternateColor}}
   * {{quantity}} {{accessories}} {{logoLine}} {{rosterInfo}}
   */
  promptTemplate: z.string(),
  sampleImages: z.array(knowledgeSampleSchema).default([]),
  updatedAt: z.string(),
});

export type KnowledgeSample = z.infer<typeof knowledgeSampleSchema>;
export type KnowledgeProfile = z.infer<typeof knowledgeProfileSchema>;

export function sportToSlug(sport: string): string {
  return sport
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const DEFAULT_INSTRUCTIONS = [
  'Big Mad Drip design rules: Bold. Custom. High-definition. Production-minded. Never basic.',
  'Use realistic performance fabric, sublimated graphics, crisp seams, accurate proportions, and high-definition detail.',
  'Present on an athletic model in a confident game-ready pose with a clean white studio background.',
  'Keep the full uniform visible from head to toe.',
  'No extra logos, no random text, no watermarks, no distorted anatomy.',
  'If reference sample images are provided, match their quality, garment construction, lighting, and presentation style — but create a NEW uniform for this team. Do not copy logos, names, or numbers from the samples.',
].join(' ');

const DEFAULT_KNOWLEDGE = [
  'Build prompts in layers: sport/product → team identity → color hierarchy → design language → garment details → model/pose → presentation → quality lock.',
  'Primary color must dominate. Secondary supports. Accent is sharp and limited.',
  'Keep branding readable for production (jerseys, hats, bags, embroidery).',
].join('\n');

const MASTER_TEMPLATE = [
  'Create a premium custom {{sport}} uniform for {{teamName}}.',
  'Use {{primaryColor}} as the dominant main color, {{secondaryColor}} as the secondary color.',
  '{{alternateColor}}',
  '{{logoLine}}',
  'Audience fit: {{gender}}, {{ageGroup}}.',
  'Suggested accessories context: {{accessories}}.',
  'Order quantity context: {{quantity}} uniforms (do not render quantity as text).',
  '{{rosterInfo}}',
].join(' ');

const SPORT_TEMPLATES: Record<string, string> = {
  'Flag Football': [
    'Create a premium custom 7v7 / flag football compression uniform for {{teamName}}.',
    'Use {{primaryColor}} as the main color with {{secondaryColor}} and accent details.',
    '{{alternateColor}}',
    '{{logoLine}}',
    'Include a compression top and matching compression shorts with coordinated flags at the waist when relevant.',
    'Show a {{gender}} {{ageGroup}} athlete with an athletic build holding a football in a confident game-ready pose.',
    'Match gloves, cleats, and optional headgear to the uniform.',
    'Accessories context: {{accessories}}. Quantity context: {{quantity}} (do not render as text).',
    '{{rosterInfo}}',
  ].join(' '),
  '7v7': [
    'Create a premium custom 7v7 flag football compression uniform for {{teamName}}.',
    'Use {{primaryColor}} as the main color with {{secondaryColor}} and accent details.',
    '{{alternateColor}}',
    '{{logoLine}}',
    'Include a compression top and matching compression shorts with matching popper flags at the waist.',
    'Show a {{gender}} {{ageGroup}} athlete holding a football in a confident game-ready pose.',
    'Accessories context: {{accessories}}. Quantity context: {{quantity}} (do not render as text).',
    '{{rosterInfo}}',
  ].join(' '),
  'Tackle Football': [
    'Create a full tackle football uniform for {{teamName}}.',
    'Use {{primaryColor}} as the dominant main color with {{secondaryColor}} support.',
    '{{alternateColor}}',
    '{{logoLine}}',
    'Include a fitted game jersey over shoulder pads, football pants, matching socks, gloves, cleats, and helmet.',
    'Numbers must be highly readable on front, back, and shoulders when shown.',
    'Show a powerful {{gender}} {{ageGroup}} athlete in a game-ready pose with a football.',
    'Accessories context: {{accessories}}. Quantity context: {{quantity}} (do not render as text).',
    '{{rosterInfo}}',
  ].join(' '),
  Basketball: [
    'Create a premium sleeveless basketball uniform for {{teamName}}.',
    'Use {{primaryColor}} as the dominant color with {{secondaryColor}} trim.',
    '{{alternateColor}}',
    '{{logoLine}}',
    'Include a modern athletic jersey and matching basketball shorts with readable branding.',
    'Show a {{gender}} {{ageGroup}} basketball athlete with a basketball.',
    'Accessories context: {{accessories}}. Quantity context: {{quantity}} (do not render as text).',
    '{{rosterInfo}}',
  ].join(' '),
  Baseball: [
    'Create a premium custom baseball uniform for {{teamName}}.',
    'Use {{primaryColor}} as the dominant main color with {{secondaryColor}} support.',
    '{{alternateColor}}',
    '{{logoLine}}',
    'Design a button-front baseball jersey with matching pants, belt, socks, cleats, and cap.',
    'Show a {{gender}} {{ageGroup}} baseball player holding a bat or baseball.',
    'Accessories context: {{accessories}}. Quantity context: {{quantity}} (do not render as text).',
    '{{rosterInfo}}',
  ].join(' '),
  Softball: [
    'Create a premium custom softball uniform for {{teamName}}.',
    'Use {{primaryColor}} as the dominant main color with {{secondaryColor}} support.',
    '{{alternateColor}}',
    '{{logoLine}}',
    'Use a modern athletic jersey with matching softball pants/shorts and coordinated socks, belt, cleats, and optional visor.',
    'Show a {{gender}} {{ageGroup}} athlete with a softball, glove, or bat.',
    'Accessories context: {{accessories}}. Quantity context: {{quantity}} (do not render as text).',
    '{{rosterInfo}}',
  ].join(' '),
  Soccer: [
    'Create a premium short-sleeve soccer kit for {{teamName}}.',
    'Use {{primaryColor}} as the dominant main color with {{secondaryColor}} support.',
    '{{alternateColor}}',
    '{{logoLine}}',
    'Include a fitted soccer jersey, matching shorts, knee-high socks, and coordinated cleats.',
    'Show a {{gender}} {{ageGroup}} soccer athlete with a soccer ball.',
    'Accessories context: {{accessories}}. Quantity context: {{quantity}} (do not render as text).',
    '{{rosterInfo}}',
  ].join(' '),
  Volleyball: [
    'Create a premium sleeveless volleyball uniform for {{teamName}}.',
    'Use {{primaryColor}} as the dominant main color with {{secondaryColor}} support.',
    '{{alternateColor}}',
    '{{logoLine}}',
    'Include a fitted performance jersey and matching volleyball shorts.',
    'Show a {{gender}} {{ageGroup}} volleyball athlete with a volleyball.',
    'Accessories context: {{accessories}}. Quantity context: {{quantity}} (do not render as text).',
    '{{rosterInfo}}',
  ].join(' '),
  Track: [
    'Create a premium track and field uniform for {{teamName}}.',
    'Use {{primaryColor}} as the dominant main color with {{secondaryColor}} support.',
    '{{alternateColor}}',
    '{{logoLine}}',
    'Include a fitted performance singlet/crop top and matching running shorts/compression bottoms in a sleek aerodynamic layout.',
    'Show a {{gender}} {{ageGroup}} track athlete in a powerful sprint-start or running pose.',
    'Accessories context: {{accessories}}. Quantity context: {{quantity}} (do not render as text).',
    '{{rosterInfo}}',
  ].join(' '),
  Tennis: [
    'Create a premium custom tennis kit for {{teamName}}.',
    'Use {{primaryColor}} as the dominant main color with {{secondaryColor}} support.',
    '{{alternateColor}}',
    '{{logoLine}}',
    'Include performance tennis apparel with clean competition-ready branding.',
    'Show a {{gender}} {{ageGroup}} tennis athlete with a racket in a game-ready pose.',
    'Accessories context: {{accessories}}. Quantity context: {{quantity}} (do not render as text).',
    '{{rosterInfo}}',
  ].join(' '),
  Gymnastics: [
    'Create a premium custom gymnastics competition uniform for {{teamName}}.',
    'Use {{primaryColor}} as the dominant main color with {{secondaryColor}} support.',
    '{{alternateColor}}',
    '{{logoLine}}',
    'Keep the design athletic, flexible, and production-minded with crisp branding.',
    'Show a {{gender}} {{ageGroup}} gymnast in a confident competition pose.',
    'Accessories context: {{accessories}}. Quantity context: {{quantity}} (do not render as text).',
    '{{rosterInfo}}',
  ].join(' '),
  Pickleball: [
    'Create a premium custom pickleball uniform for {{teamName}}.',
    'Use {{primaryColor}} as the dominant main color with {{secondaryColor}} support.',
    '{{alternateColor}}',
    '{{logoLine}}',
    'Include modern athletic court apparel with clean readable branding.',
    'Show a {{gender}} {{ageGroup}} athlete with a pickleball paddle in a game-ready pose.',
    'Accessories context: {{accessories}}. Quantity context: {{quantity}} (do not render as text).',
    '{{rosterInfo}}',
  ].join(' '),
  Other: MASTER_TEMPLATE,
};

export function createDefaultKnowledgeProfile(sport: string): KnowledgeProfile {
  const now = new Date().toISOString();
  return {
    id: sportToSlug(sport),
    sport,
    label: sport,
    enabled: true,
    instructions: DEFAULT_INSTRUCTIONS,
    knowledgeBase: DEFAULT_KNOWLEDGE,
    promptTemplate: SPORT_TEMPLATES[sport] ?? MASTER_TEMPLATE,
    sampleImages: [],
    updatedAt: now,
  };
}

export function createDefaultKnowledgeProfiles(): KnowledgeProfile[] {
  return SPORTS.map((sport) => createDefaultKnowledgeProfile(sport));
}

export const KNOWLEDGE_PLACEHOLDERS = [
  'teamName',
  'sport',
  'gender',
  'ageGroup',
  'primaryColor',
  'secondaryColor',
  'alternateColor',
  'quantity',
  'accessories',
  'logoLine',
  'rosterInfo',
] as const;
