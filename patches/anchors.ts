import {
  findCandidates,
  scoreCandidates,
  selectUnique,
  type Candidate,
} from './discovery';
import { BonsaiPatchError } from './types';

const identifier = String.raw`[$A-Z_a-z][$\w]*`;

const visibilitySwitchPatterns = [
  new RegExp(String.raw`switch\(\s*(${identifier})\.type\s*\)\s*\{[^}]+\}`, 'g'),
];

const converterPatterns = [
  new RegExp(
    String.raw`function\s+${identifier}\s*\(\s*(${identifier})[^)]*\)\s*\{[\s\S]{0,900}?return\s*\{\s*role\s*:\s*["'](?:user|assistant)["']\s*,\s*content\s*:`,
    'g'
  ),
  new RegExp(
    String.raw`function\s+${identifier}\s*\(\s*(${identifier})\s*\)\s*\{(?=[\s\S]{0,800}\buuid\b)(?=[\s\S]{0,800}\bcontent\s*:)[\s\S]{0,800}?return\s*\{[\s\S]{0,400}?\bcontent\s*:\s*[^,}]+`,
    'g'
  ),
  new RegExp(
    String.raw`(?:const|let|var)\s+${identifier}\s*=\s*\(?\s*(${identifier})\s*\)?\s*=>\s*\{(?=[\s\S]{0,800}\buuid\b)(?=[\s\S]{0,800}\bcontent\s*:)[\s\S]{0,800}?return\s*\{[\s\S]{0,400}?\bcontent\s*:\s*[^,}]+`,
    'g'
  ),
  new RegExp(
    String.raw`(?:const|let|var)\s+${identifier}\s*=\s*\(?\s*(${identifier})\s*\)?\s*=>\s*\(\s*\{(?=[\s\S]{0,800}\buuid\b)(?=[\s\S]{0,800}\bcontent\s*:)[\s\S]{0,400}?\bcontent\s*:\s*[^,}]+`,
    'g'
  ),
];

const tokenUsagePatterns = [
  new RegExp(
    String.raw`function\s+(${identifier})\s*\([^)]*\)\s*\{(?=[\s\S]{0,900}\b(?:contextWindow|contextLimit|usableBudget|modelLimit)\b)(?=[\s\S]{0,900}\b(?:usedTokens|inputTokens|totalTokens)\b)[\s\S]{0,900}?\}`,
    'g'
  ),
  new RegExp(
    String.raw`(?:const|let|var)\s+(${identifier})\s*=\s*\([^)]*\)\s*=>\s*\{(?=[\s\S]{0,900}\b(?:contextWindow|contextLimit|usableBudget|modelLimit)\b)(?=[\s\S]{0,900}\b(?:usedTokens|inputTokens|totalTokens)\b)[\s\S]{0,900}?\}`,
    'g'
  ),
];

const attachmentPipelinePatterns = [
  new RegExp(
    String.raw`function\s+${identifier}\s*\(\s*(${identifier})\s*,\s*(${identifier})\s*\)\s*\{(?=[\s\S]{0,800}\.push\s*\()(?=[\s\S]{0,800}(?:todo|reminder|attachment))[\s\S]{0,800}?\}`,
    'g'
  ),
  new RegExp(
    String.raw`(?:const|let|var)\s+${identifier}\s*=\s*\(\s*(${identifier})\s*,\s*(${identifier})\s*\)\s*=>\s*\{(?=[\s\S]{0,800}\.push\s*\()(?=[\s\S]{0,800}(?:todo|reminder|attachment))[\s\S]{0,800}?\}`,
    'g'
  ),
];

const reminderRenderPatterns = [
  new RegExp(
    String.raw`switch\(\s*(${identifier})\.type\s*\)\s*\{(?=[\s\S]{0,1800}case["'](?:todo[_-]?reminder|todo)["'])[\s\S]{0,1800}?case["'](?:todo[_-]?reminder|todo)["']`,
    'g'
  ),
];

export interface EvidenceAnchor {
  candidateCount: number;
  selected: Candidate;
}

export type VisibilitySwitchAnchor = Candidate & { messageVar: string; evidence: EvidenceAnchor };
export type MessageContentConverterAnchor = Candidate & { messageVar: string; evidence: EvidenceAnchor };
export type TokenUsageHelperAnchor = Candidate & { name: string; evidence: EvidenceAnchor };
export type AttachmentPipelineAnchor = Candidate & {
  attachmentsVar: string;
  messagesVar: string;
  evidence: EvidenceAnchor;
};
export type ReminderRenderAnchor = Candidate & { attachmentVar: string; evidence: EvidenceAnchor };

export function selectVisibilitySwitchAnchor(content: string): VisibilitySwitchAnchor {
  const evidence = selectAnchorEvidence(content, visibilitySwitchPatterns, visibilitySwitchScorer, {
    minScore: 20,
    minMargin: 10,
  });
  const messageVar = new RegExp(String.raw`switch\(\s*(${identifier})\.type\s*\)`).exec(evidence.selected.text)?.[1];
  if (!messageVar) throw new BonsaiPatchError('archived-filter', 'selected visibility switch did not expose a message variable');
  return { ...evidence.selected, messageVar, evidence };
}

export function selectMessageContentConverterAnchor(content: string): MessageContentConverterAnchor {
  const evidence = selectAnchorEvidence(content, converterPatterns, messageConverterScorer, {
    minScore: 35,
    minMargin: 10,
  });
  const messageVar = extractMessageVariable(evidence.selected);
  return { ...evidence.selected, messageVar, evidence };
}

export function selectTokenUsageHelperAnchor(content: string): TokenUsageHelperAnchor {
  const evidence = selectAnchorEvidence(content, tokenUsagePatterns, tokenUsageScorer, {
    minScore: 15,
    minMargin: 10,
  });
  const name = extractFunctionName(evidence.selected);
  return { ...evidence.selected, name, evidence };
}

export function selectAttachmentPipelineAnchor(content: string): AttachmentPipelineAnchor {
  const evidence = selectAnchorEvidence(content, attachmentPipelinePatterns, attachmentPipelineScorer, {
    minScore: 15,
    minMargin: 10,
  });
  const vars = extractTwoParameters(evidence.selected, 'selected attachment pipeline did not expose attachment/message variables');
  return { ...evidence.selected, attachmentsVar: vars.first, messagesVar: vars.second, evidence };
}

export function selectReminderRenderAnchor(content: string): ReminderRenderAnchor {
  const evidence = selectAnchorEvidence(content, reminderRenderPatterns, reminderRenderScorer, {
    minScore: 15,
    minMargin: 10,
  });
  const attachmentVar = new RegExp(String.raw`switch\(\s*(${identifier})\.type\s*\)`).exec(evidence.selected.text)?.[1];
  if (!attachmentVar) {
    throw new BonsaiPatchError('context-bonsai-gauge', 'selected reminder render case did not expose attachment variable');
  }
  return { ...evidence.selected, attachmentVar, evidence };
}

function selectAnchorEvidence(
  content: string,
  patterns: RegExp[],
  scorer: (content: string, candidate: Candidate) => number,
  opts: { minScore: number; minMargin: number }
): EvidenceAnchor {
  const candidates = findCandidates(content, patterns);
  const selected = selectUnique(content, scoreCandidates(content, candidates, [scorer]), opts);
  return { candidateCount: candidates.length, selected };
}

function visibilitySwitchScorer(content: string, candidate: Candidate): number {
  let score = 0;
  if (/case["']user["']/.test(candidate.text)) score += 15;
  if (/case["']assistant["']/.test(candidate.text)) score += 15;
  if (/\bmessage\b/.test(candidate.text)) score += 5;
  if (/\bcontent\b/.test(candidate.text)) score += 5;
  if (/tool_use/.test(candidate.text)) score += 3;

  const before = content.slice(Math.max(0, candidate.index - 160), candidate.index);
  const after = content.slice(candidate.index, candidate.index + 1400);
  if (/if\([^)]*===\s*["']transcript["']\)return!0;?\s*$/.test(before)) score += 30;
  if (/resolvedToolUseIDs/.test(after)) score += 15;
  if (/case["']grouped_tool_use["']/.test(after)) score += 12;
  if (/case["']collapsed_read_search["']/.test(after)) score += 12;
  if (/case["']system["'][\s\S]{0,260}api_error/.test(after)) score += 10;
  if (/toolUseID|tool_use_id/.test(after)) score += 8;
  if (/case["']attachment["']/.test(after)) score += 6;
  if (!/case["']user["']/.test(candidate.text) || !/case["']assistant["']/.test(candidate.text)) score -= 20;
  if (!/transcript/.test(before) && !/resolvedToolUseIDs|grouped_tool_use|collapsed_read_search/.test(after)) score -= 30;
  return score;
}

function messageConverterScorer(_content: string, candidate: Candidate): number {
  let score = 0;
  if (/\buuid\b/.test(candidate.text)) score += 15;
  if (/\bcontent\s*:/.test(candidate.text)) score += 15;
  if (/\brole\s*:/.test(candidate.text)) score += 10;
  if (/\bmessage\b/.test(candidate.text)) score += 5;
  if (/\btype\b/.test(candidate.text)) score += 5;
  if (/\b\w+\.message\.content\b/.test(candidate.text)) score += 15;
  if (/\brole\s*:\s*["']user["']/.test(candidate.text)) score += 20;
  if (/\brole\s*:\s*["']assistant["']/.test(candidate.text)) score += 5;
  if (/\brole\s*:\s*\w+\.type\b/.test(candidate.text)) score += 10;
  if (/\b(?:id|uuid)\s*:\s*\w+\.uuid\b/.test(candidate.text)) score += 10;
  if (/\bmetadata\s*:\s*\{\s*uuid\b/.test(candidate.text)) score += 10;
  if (/typeof\s+\w+\.message\.content\s*===\s*["']string["']/.test(candidate.text)) score += 10;
  if (/\brole\s*:\s*["']system["']/.test(candidate.text)) score -= 25;
  if (/\.map\s*\(/.test(candidate.text)) score -= 40;
  return score;
}

function tokenUsageScorer(_content: string, candidate: Candidate): number {
  let score = 0;
  if (/\b(?:contextWindow|contextLimit|usableBudget|modelLimit)\b/.test(candidate.text)) score += 20;
  if (/\b(?:usedTokens|inputTokens|totalTokens)\b/.test(candidate.text)) score += 15;
  if (/\b(?:cacheReadInputTokens|cacheCreationInputTokens|outputTokens)\b/.test(candidate.text)) score += 12;
  if (/\breturn\b/.test(candidate.text)) score += 5;
  if (/\b(?:percent|Math\.round|Math\.ceil|Math\.floor)\b/.test(candidate.text)) score -= 10;
  return score;
}

function attachmentPipelineScorer(_content: string, candidate: Candidate): number {
  let score = 0;
  if (/\.push\s*\(/.test(candidate.text)) score += 15;
  if (/\b(?:todo|reminder)\b/i.test(candidate.text)) score += 15;
  if (/\battachment/i.test(candidate.text)) score += 10;
  if (/\b(?:hook_permission_decision|mcpCallCount|bashCount|latestDisplayHint)\b/.test(candidate.text)) score += 20;
  if (/\breturn\b/.test(candidate.text)) score += 5;
  if (/typeof\s+\w+!==["']object["']/.test(candidate.text)) score -= 10;
  if (!/\.push\s*\(/.test(candidate.text)) score -= 20;
  return score;
}

function reminderRenderScorer(_content: string, candidate: Candidate): number {
  let score = 0;
  if (/case["']todo_reminder["']/.test(candidate.text)) score += 25;
  else if (/case["']todo["']/.test(candidate.text)) score += 20;
  if (/\btext\b|\bcontent\b/.test(candidate.text)) score += 10;
  if (/\breturn\b/.test(candidate.text)) score += 5;
  if (/default\s*:/.test(candidate.text)) score += 3;
  return score;
}

function extractMessageVariable(candidate: Candidate): string {
  for (const pattern of [
    new RegExp(String.raw`function\s+${identifier}\s*\(\s*(${identifier})(?:\s*[,)=])`),
    new RegExp(String.raw`function\s+${identifier}\s*\(\s*(${identifier})\s*\)`),
    new RegExp(String.raw`(?:const|let|var)\s+${identifier}\s*=\s*\(?\s*(${identifier})\s*\)?\s*=>`),
  ]) {
    const variable = pattern.exec(candidate.text)?.[1];
    if (variable) return variable;
  }

  throw new BonsaiPatchError('message-content-ids', 'selected converter did not expose a message variable');
}

function extractFunctionName(candidate: Candidate): string {
  for (const pattern of [
    new RegExp(String.raw`function\s+(${identifier})\s*\(`),
    new RegExp(String.raw`(?:const|let|var)\s+(${identifier})\s*=`),
  ]) {
    const name = pattern.exec(candidate.text)?.[1];
    if (name) return name;
  }

  throw new BonsaiPatchError('context-bonsai-gauge', 'selected token usage helper did not expose a function name');
}

function extractTwoParameters(candidate: Candidate, message: string): { first: string; second: string } {
  for (const pattern of [
    new RegExp(String.raw`function\s+${identifier}\s*\(\s*(${identifier})\s*,\s*(${identifier})\s*\)`),
    new RegExp(String.raw`(?:const|let|var)\s+${identifier}\s*=\s*\(\s*(${identifier})\s*,\s*(${identifier})\s*\)\s*=>`),
  ]) {
    const match = pattern.exec(candidate.text);
    if (match?.[1] && match[2]) return { first: match[1], second: match[2] };
  }

  throw new BonsaiPatchError('context-bonsai-gauge', message);
}
