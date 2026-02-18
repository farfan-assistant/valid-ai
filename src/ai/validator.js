import { SYSTEM_PROMPT, buildUserPrompt } from './prompt.js';

export class IdeaValidator {
  constructor({ apiKey, baseUrl, model }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.model = model;
  }

  async validate(idea) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(idea) },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`AI API error (${response.status}): ${body}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from AI API');
    }

    // Parse and validate the JSON response
    const result = this._parseResponse(content);
    return result;
  }

  _parseResponse(content) {
    // Strip markdown code fences if present
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new Error(`Failed to parse AI response as JSON: ${e.message}`);
    }

    // Validate required fields
    const required = ['summary', 'category', 'market_analysis', 'competition',
                      'target_audience', 'revenue_model', 'risks', 'next_steps', 'score'];
    const missing = required.filter(f => !(f in parsed));
    if (missing.length > 0) {
      throw new Error(`AI response missing required fields: ${missing.join(', ')}`);
    }

    // Ensure score is numeric
    if (typeof parsed.score?.overall !== 'number') {
      parsed.score.overall = parseInt(parsed.score?.overall, 10) || 50;
    }

    return parsed;
  }
}
