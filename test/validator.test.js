import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IdeaValidator } from '../src/ai/validator.js';

describe('IdeaValidator', () => {
  it('initializes with config', () => {
    const v = new IdeaValidator({
      apiKey: 'test-key',
      baseUrl: 'https://api.openai.com/v1/',
      model: 'gpt-4o',
    });
    assert.equal(v.apiKey, 'test-key');
    assert.equal(v.baseUrl, 'https://api.openai.com/v1');
    assert.equal(v.model, 'gpt-4o');
  });

  it('strips trailing slashes from baseUrl', () => {
    const v = new IdeaValidator({
      apiKey: 'test',
      baseUrl: 'https://api.example.com/v1///',
      model: 'test',
    });
    assert.equal(v.baseUrl, 'https://api.example.com/v1');
  });

  it('_parseResponse handles clean JSON', () => {
    const v = new IdeaValidator({ apiKey: 'k', baseUrl: 'http://x', model: 'm' });
    const result = v._parseResponse(JSON.stringify({
      summary: 'Test',
      category: 'SaaS',
      market_analysis: {},
      competition: {},
      target_audience: {},
      revenue_model: {},
      risks: [],
      next_steps: [],
      score: { overall: 70, breakdown: {}, verdict: 'Yes', one_liner: 'Good idea' },
    }));
    assert.equal(result.summary, 'Test');
    assert.equal(result.score.overall, 70);
  });

  it('_parseResponse strips markdown code fences', () => {
    const v = new IdeaValidator({ apiKey: 'k', baseUrl: 'http://x', model: 'm' });
    const json = JSON.stringify({
      summary: 'Fenced',
      category: 'Tool',
      market_analysis: {},
      competition: {},
      target_audience: {},
      revenue_model: {},
      risks: [],
      next_steps: [],
      score: { overall: 55 },
    });
    const result = v._parseResponse('```json\n' + json + '\n```');
    assert.equal(result.summary, 'Fenced');
  });

  it('_parseResponse throws on missing required fields', () => {
    const v = new IdeaValidator({ apiKey: 'k', baseUrl: 'http://x', model: 'm' });
    assert.throws(() => {
      v._parseResponse(JSON.stringify({ summary: 'Incomplete' }));
    }, /missing required fields/);
  });

  it('_parseResponse throws on invalid JSON', () => {
    const v = new IdeaValidator({ apiKey: 'k', baseUrl: 'http://x', model: 'm' });
    assert.throws(() => {
      v._parseResponse('not json at all');
    }, /Failed to parse/);
  });

  it('_parseResponse coerces non-numeric score', () => {
    const v = new IdeaValidator({ apiKey: 'k', baseUrl: 'http://x', model: 'm' });
    const result = v._parseResponse(JSON.stringify({
      summary: 'Coerce test',
      category: 'SaaS',
      market_analysis: {},
      competition: {},
      target_audience: {},
      revenue_model: {},
      risks: [],
      next_steps: [],
      score: { overall: '65', breakdown: {}, verdict: 'Maybe' },
    }));
    assert.equal(result.score.overall, 65);
    assert.equal(typeof result.score.overall, 'number');
  });
});
