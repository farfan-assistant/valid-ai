import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SYSTEM_PROMPT, buildUserPrompt } from '../src/ai/prompt.js';

describe('Prompt generation', () => {
  it('system prompt contains JSON schema instructions', () => {
    assert.ok(SYSTEM_PROMPT.includes('JSON'));
    assert.ok(SYSTEM_PROMPT.includes('market_analysis'));
    assert.ok(SYSTEM_PROMPT.includes('competition'));
    assert.ok(SYSTEM_PROMPT.includes('target_audience'));
    assert.ok(SYSTEM_PROMPT.includes('revenue_model'));
    assert.ok(SYSTEM_PROMPT.includes('risks'));
    assert.ok(SYSTEM_PROMPT.includes('next_steps'));
    assert.ok(SYSTEM_PROMPT.includes('score'));
  });

  it('system prompt includes scoring guide', () => {
    assert.ok(SYSTEM_PROMPT.includes('80-100'));
    assert.ok(SYSTEM_PROMPT.includes('0-19'));
  });

  it('buildUserPrompt includes the idea text', () => {
    const prompt = buildUserPrompt('A tool that validates SaaS ideas');
    assert.ok(prompt.includes('A tool that validates SaaS ideas'));
    assert.ok(prompt.includes('Validate'));
  });

  it('buildUserPrompt handles multi-line ideas', () => {
    const idea = 'Line 1\nLine 2\nLine 3';
    const prompt = buildUserPrompt(idea);
    assert.ok(prompt.includes('Line 1'));
    assert.ok(prompt.includes('Line 3'));
  });
});
