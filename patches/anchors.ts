import {
  findCandidates,
  scoreCandidates,
  selectUnique,
  type Candidate,
} from './discovery';
import { BonsaiPatchError } from './types';

const identifier = String.raw`[$A-Z_a-z][$\w]*`;

// The provider-bound transcript map turns Claude Code session entries into
// Anthropic API message objects. It is identified structurally, not by a
// bundle-specific minified converter name: a `.map((msg,idx)=>{...})` whose body
// branches `if(msg.type==="user")return <userConverter>(...)`, handles
// `api_system` as `{role:"system",...}`, and falls through to a DISTINCT
// `<assistantConverter>(...)`. The minified converter identifiers drift between
// releases (2.1.143 `Bp5`/`pp5`; 2.1.156 `hLz`/`SLz`), so they are captured, not
// hard-coded. Two shapes are supported because the host expression differs by
// release: 2.1.143 binds the map to a local (`let D=H.map(...)`) while 2.1.156
// returns it as the second arm of a comma-sequence right after the
// `tengu_api_cache_breakpoints` cache-breakpoint telemetry call
// (`return d("tengu_api_cache_breakpoints",{...}),H.map(...)`). Both inject the
// archived-range filter before the captured map variable is consumed.
const visibilitySwitchPatterns = [
  new RegExp(
    String.raw`return\s+${identifier}\s*\(\s*["']tengu_api_cache_breakpoints["'][\s\S]{0,400}?\)\s*,\s*(${identifier})\.map\s*\(\s*\(\s*${identifier}\s*(?:,\s*${identifier}\s*)?\)\s*=>\s*\{[\s\S]{0,160}?if\s*\(\s*${identifier}\.type\s*===\s*["']user["']\s*\)\s*return\s+(${identifier})\s*\([\s\S]{0,200}?api_system["'][\s\S]{0,140}?return\s+(${identifier})\s*\(`,
    'g'
  ),
  new RegExp(
    String.raw`let\s+${identifier}\s*=\s*(${identifier})\.map\s*\(\s*\(\s*${identifier}\s*(?:,\s*${identifier}\s*)?\)\s*=>\s*\{[\s\S]{0,160}?if\s*\(\s*${identifier}\.type\s*===\s*["']user["']\s*\)\s*return\s+(${identifier})\s*\([\s\S]{0,200}?api_system["'][\s\S]{0,140}?return\s+(${identifier})\s*\(`,
    'g'
  ),
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

// These selectors mechanize the semantic anchor choices documented in
// docs/semantic-anchor-analysis-2.1.143.md; scorer output is supporting
// locator evidence, not proof that an anchor is behaviorally correct.

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
    minScore: 30,
    minMargin: 10,
  });
  const messageVar =
    new RegExp(String.raw`let\s+${identifier}\s*=\s*(${identifier})\.map`).exec(evidence.selected.text)?.[1] ??
    new RegExp(String.raw`\)\s*,\s*(${identifier})\.map`).exec(evidence.selected.text)?.[1];
  if (!messageVar) throw new BonsaiPatchError('archived-filter', 'selected provider message map did not expose a messages variable');
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
  if (/\.map\s*\(/.test(candidate.text)) score += 10;
  if (/\.type\s*===\s*["']user["']/.test(candidate.text)) score += 15;
  // The provider-bound seam routes `api_system` entries to `{role:"system",...}`
  // and is preceded by the `tengu_api_cache_breakpoints` cache-breakpoint
  // telemetry call. These two signals, plus two DISTINCT converter calls (the
  // user-branch converter and the else/assistant converter), replace the prior
  // bundle-specific `Bp5`/`pp5` literals so the anchor tracks behavior across
  // releases rather than a single bundle's minified names.
  if (/\.type\s*===\s*["']api_system["']/.test(candidate.text)) score += 15;
  if (/tengu_api_cache_breakpoints/.test(candidate.text)) score += 20;
  if (/\brole\s*:\s*["']system["']/.test(candidate.text)) score += 10;
  if (/\brole\s*===\s*["']user["']/.test(candidate.text)) score += 10;

  const userConverter = new RegExp(
    String.raw`\.type\s*===\s*["']user["']\s*\)\s*return\s+(${identifier})\s*\(`
  ).exec(candidate.text)?.[1];
  const elseConverter = new RegExp(
    String.raw`api_system["'][\s\S]{0,140}?return\s+(${identifier})\s*\(`
  ).exec(candidate.text)?.[1];
  if (userConverter && elseConverter && userConverter !== elseConverter) score += 20;

  const before = content.slice(Math.max(0, candidate.index - 160), candidate.index);
  const after = content.slice(candidate.index, candidate.index + 1800);
  if (/tengu_api_cache_breakpoints/.test(before)) score += 15;
  if (/cache_control/.test(after)) score += 10;
  if (/return\s+[^;]+;?\s*}\s*function\s+\w+\s*\(/.test(after)) score += 5;
  if (/resolvedToolUseIDs|collapsed_read_search|if\([^)]*===\s*["']transcript["']\)/.test(candidate.text)) score -= 50;
  return score;
}

function messageConverterScorer(content: string, candidate: Candidate): number {
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
  // The provider-bound user/assistant converters share a 4-arg signature whose
  // second parameter is the cache-breakpoint boolean default (2.1.143
  // `Bp5(H,$=!1,q,K)`; 2.1.156 `hLz(H,$=!1,q,K)`). Content-sanitizer helpers the
  // greedy match can spill into (e.g. 2.1.156 `I69(H)`) are single-argument and
  // never carry that flag, so this signature discriminates the real converter
  // without weakening minScore/minMargin.
  if (new RegExp(String.raw`^function\s+${identifier}\s*\(\s*${identifier}\s*,\s*${identifier}\s*=\s*!1`).test(candidate.text)) {
    score += 20;
  }
  const after = content.slice(candidate.index, candidate.index + 700);
  if (/\bcache_control\b/.test(after) && /\bttl\b/.test(after)) score += 15;
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
  // 2.1.200 re-derivation (docs/semantic-anchor-analysis-2.1.200.md,
  // context-bonsai-gauge.token-usage): the per-request usage ACCUMULATOR and the
  // aggregate usage-DISPLAY formatter share the same zero-initialized usage record
  // literal (`{inputTokens:0,outputTokens:0,cacheReadInputTokens:0,...,contextWindow:0,
  // maxOutputTokens:0}`), tying at 52 vs 47 and fail-closing on minMargin 10. The
  // discriminator is behavioral and lives inside the captured text (the greedy match
  // ends at the record literal's `}`): the accumulator's defining entry behavior is
  // "load the running record for this model or initialize a fresh zero record" —
  // `<lookup>(n)??{inputTokens:0,...}` (2.1.200 `a6p(e,t,n)`; the exact 2.1.156 `Wu5`
  // shape) — whereas the display formatter's captured text builds a human-readable
  // `"Usage:"` string (2.1.200 `o6p()`) before its first record literal. Neither
  // signal weakens minScore/minMargin; both are grounded in host behavior, not names.
  if (/\?\?\s*\{[^{}]*\binputTokens\s*:\s*0/.test(candidate.text)) score += 15;
  if (/["'`]Usage[:\s]/.test(candidate.text)) score -= 25;
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
