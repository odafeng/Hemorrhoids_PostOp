import { describe, it, expect } from 'vitest';
import { getAIResponse, quickQuestions } from '../mockAI';

describe('getAIResponse', () => {
  it('returns pain-related response for pain keywords', () => {
    const keywords = ['痛', '疼痛', '好痛', '很痛', '會痛'];
    for (const kw of keywords) {
      const response = getAIResponse(kw);
      expect(response).toContain('止痛');
    }
  });

  it('returns bleeding-related response for bleeding keywords', () => {
    const keywords = ['出血', '流血', '血'];
    for (const kw of keywords) {
      const response = getAIResponse(kw);
      expect(response).toContain('出血');
    }
  });

  it('returns bowel-related response for bowel keywords', () => {
    const keywords = ['排便', '便秘', '上廁所', '大便', '拉不出來'];
    for (const kw of keywords) {
      const response = getAIResponse(kw);
      expect(response).toContain('排便');
    }
  });

  it('returns fever-related response for fever keywords', () => {
    const response = getAIResponse('發燒');
    expect(response).toContain('38°C');
  });

  it('returns wound care response for wound keywords', () => {
    const response = getAIResponse('傷口照護');
    expect(response).toContain('傷口');
  });

  it('returns sitz bath response for sitz bath keywords', () => {
    const response = getAIResponse('坐浴');
    expect(response).toContain('溫水');
  });

  it('returns diet response for diet keywords', () => {
    const response = getAIResponse('飲食');
    expect(response).toContain('高纖維');
  });

  it('returns exercise response for exercise keywords', () => {
    const response = getAIResponse('運動');
    expect(response).toContain('劇烈運動');
  });

  it('returns follow-up response for follow-up keywords', () => {
    const response = getAIResponse('回診');
    expect(response).toContain('回診');
  });

  it('returns medication disclaimer for medication keywords', () => {
    const response = getAIResponse('藥');
    expect(response).toContain('無法提供');
  });

  it('returns default response for unknown questions', () => {
    const response = getAIResponse('完全不相關的問題 ABC 123');
    expect(response).toContain('醫療專業人員');
  });

  it('is case-insensitive (Chinese characters)', () => {
    // Chinese doesn't have case, but test that processing works
    const r1 = getAIResponse('術後疼痛怎麼辦');
    expect(r1).toContain('止痛');
  });
});

describe('quickQuestions', () => {
  it('has at least 5 quick questions', () => {
    expect(quickQuestions.length).toBeGreaterThanOrEqual(5);
  });

  it('each quick question gets a non-default response', () => {
    const defaultSnippet = '醫療專業人員';
    for (const q of quickQuestions) {
      const response = getAIResponse(q);
      expect(response).not.toContain(defaultSnippet);
    }
  });
});
