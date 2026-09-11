import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServiceClient, requireUser } from './auth.js';

// 쉼표로 GEMINI_MODELS를 설정하면 배포 환경별 실제 사용 가능 모델명으로 교체할 수 있습니다.
// 기본값은 요청된 우선순위이며, 분당/일일 한도(429) 소진 시 다음 모델로 즉시 넘깁니다.
const DEFAULT_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash',
];

const getModelChain = () => {
  const configured = process.env.GEMINI_MODELS?.split(',').map(name => name.trim()).filter(Boolean);
  return configured?.length ? configured : DEFAULT_MODELS;
};

const isQuotaError = (error: unknown) => /(429|resource_exhausted|quota|rate.?limit|requests?.?per.?minute|requests?.?per.?day|rpm|rpd)/i
  .test(String((error as { message?: string })?.message || error));

const isTemporaryError = (error: unknown) => /(503|overloaded|unavailable|timeout)/i
  .test(String((error as { message?: string })?.message || error));

const isUnavailableModelError = (error: unknown) => /(404|model.+not found|model.+not supported|model.+not available)/i
  .test(String((error as { message?: string })?.message || error));

async function generateWithFallback(
  genAI: GoogleGenerativeAI,
  models: string[],
  content: string | Array<unknown>,
) {
  let lastError: unknown = null;
  for (const modelName of models) {
    const model = genAI.getGenerativeModel({ model: modelName });
    try {
      // 혼잡(503)만 짧게 재시도합니다. 429는 같은 모델의 한도이므로 즉시 다음 모델로 넘어갑니다.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await model.generateContent(content as any);
        } catch (error) {
          lastError = error;
          if (isQuotaError(error)) break;
          if (attempt === 2 || !isTemporaryError(error)) throw error;
          await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
        }
      }
    } catch (error) {
      lastError = error;
      // 아직 API 키에 열리지 않은 최신 모델은 건너뛰되, 키/권한 같은 설정 오류는 즉시 알립니다.
      if (!isQuotaError(error) && !isTemporaryError(error) && !isUnavailableModelError(error)) throw error;
    }
    console.warn(`[${modelName}] quota or temporary failure; trying the next fallback model.`, lastError);
  }
  throw lastError || new Error('All Gemini models failed.');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  // 대기열 워커만 이 헤더로 인증할 수 있습니다. 브라우저 요청은 기존 로그인 검사를 거칩니다.
  const queueWorker = Boolean(process.env.QUEUE_WORKER_SECRET && req.headers['x-queue-secret'] === process.env.QUEUE_WORKER_SECRET);
  const actor = queueWorker ? null : await requireUser(req);
  if (!queueWorker && !actor) return res.status(401).json({ error: 'Authentication is required.' });

  // Vercel 환경에서는 VITE_ 접두사 없는 GEMINI_API_KEY를 Secret으로 사용합니다.
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ 
      error: 'GEMINI_API_KEY is not configured on the server.',
      feedbackText: "선생님, Vercel 환경변수에 GEMINI_API_KEY를 Secret으로 설정해주세요! 🌳", 
      success: false 
    });
  }

  try {
    const { action, textContent, hasImage, base64Image, mimeType } = req.body;
    if (JSON.stringify(req.body || {}).length > 6_000_000) return res.status(413).json({ error: 'Request is too large.' });
    
    const genAI = new GoogleGenerativeAI(API_KEY);
    const fallbackModels = getModelChain();

    if (action === 'generateFeedback') {
      // 선생님이 교사 대시보드에 아무것도 입력하지 않았을 때 적용되는 기본 프롬프트입니다.
      // (선생님이 대시보드에 입력하면 이 내용은 완전히 무시되고 선생님의 입력 내용이 우선 적용됩니다.)
      const defaultPrompt = `
초등학교 5학년 학생의 독서록을 자동으로 평가하고 피드백하는 기능을 구현해주세요.
(지시사항에 따라 평가하고, 반드시 약속된 JSON 형식으로만 결과를 반환해야 합니다.)
`;

      // 시스템 필수 지침 (사용자 몰래 무조건 100점을 주거나 하는 조작 명령은 전부 삭제했습니다.)
      // 오직 "반환 형식을 프론트엔드가 파싱할 수 있는 JSON으로 고정"하는 명령만 추가합니다.
      const systemConstraint = `
      
[시스템 필수 형식 지침]
당신은 위 지침(선생님이 입력한 프롬프트)을 완벽하게 따라야 합니다.
그리고 응답은 반드시 마크다운(Markdown) 백틱(\`\`\`) 없이, 순수한 JSON 객체 형태로만 출력하세요. 
다른 설명이나 인사말은 절대 추가하지 마세요.

JSON 구조 예시:
{
  "total_score": 85,
  "nodes": [
    {
      "id": "F1",
      "name": "맞춤법·띄어쓰기·문장부호",
      "max_score": 15,
      "status": "충족",
      "score": 15,
      "evidence": "판정 근거...",
      "feedback": "학생용 피드백..."
    }
  ],
  "summary_feedback": {
    "strength": "가장 잘한 점...",
    "priority_improvements": ["보완할 점 1", "보완할 점 2"]
  },
  "annotations": [
    {"original": "학생 글에서 그대로 찾을 수 있는 짧은 문장 또는 구절", "suggestion": "이렇게 고쳐 써 보세요", "reason": "고치면 좋아지는 이유"}
  ]
}

annotations는 꼭 필요한 수정만 최대 5개 작성하세요. original은 학생 글에 있는 문자열과 글자까지 정확히 같아야 하며, 찾을 수 없으면 annotations에 넣지 마세요.
`;

      // 학생 요청의 customPrompt는 신뢰하지 않는다. 저장된 교사 설정만 서버에서 읽는다.
      const { data: setting } = await getServiceClient().from('app_settings').select('value').eq('id', 'ai_prompt').maybeSingle();
      const teacherPrompt = typeof setting?.value === 'string' && setting.value.trim() ? setting.value : defaultPrompt;
      const template = teacherPrompt + systemConstraint;
      let prompt = template + `\n\n[학생의 독서록 내용]\n"${textContent}"`;
      
      if (hasImage) {
        prompt += "\n\n(참고: 학생이 글과 함께 정성스럽게 그림도 첨부했습니다.)";
      }

      try {
          const result = await generateWithFallback(genAI, fallbackModels, prompt);
          const response = await result.response;
          const text = response.text();
          
          try {
            // JSON 파싱 시도 (마크다운 백틱 등이 포함되어 있다면 제거)
            const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanText);
            
            // 학생에게 보여줄 피드백 마크다운 조립
            let feedback = `🌱 **잘한 점**:\n${parsed.summary_feedback.strength}\n\n`;
            
            if (parsed.summary_feedback.priority_improvements && parsed.summary_feedback.priority_improvements.length > 0) {
              feedback += `✨ **보완할 점**:\n`;
              parsed.summary_feedback.priority_improvements.forEach((imp: string) => {
                feedback += `- ${imp}\n`;
              });
              feedback += `\n`;
            }
            
            // 각 노드별 피드백 (부분 충족이거나 결손인 경우에만 팁으로 제공)
            if (parsed.nodes && Array.isArray(parsed.nodes)) {
              const needsImprovementNodes = parsed.nodes.filter((n: any) => n.status !== '충족');
              if (needsImprovementNodes.length > 0) {
                feedback += `📌 **선생님의 추가 팁**:\n`;
                needsImprovementNodes.forEach((n: any) => {
                  feedback += `[${n.name}]\n${n.feedback}\n\n`;
                });
              }
            }
            
            // 마지막에 강제로 스코어 추가 (프론트엔드 호환용)
            // 총점이 100점 만점으로 계산되어 나옴
            const totalScore = typeof parsed.total_score === 'number' ? parsed.total_score : parseInt(parsed.total_score) || 0;
            feedback += `\n[SCORE: ${totalScore}]`;
            
            const annotations = Array.isArray(parsed.annotations)
              ? parsed.annotations
                .filter((item: any) => typeof item?.original === 'string' && item.original.length > 0 && textContent.includes(item.original))
                .slice(0, 5)
                .map((item: any) => ({
                  original: item.original,
                  suggestion: typeof item.suggestion === 'string' ? item.suggestion : '',
                  reason: typeof item.reason === 'string' ? item.reason : '',
                }))
              : [];
            return res.status(200).json({ feedbackText: feedback.trim(), feedbackAnnotations: annotations, success: true });
          } catch(e) {
             // JSON 파싱 실패 시, 원본 텍스트를 그대로 반환 (에러 방지용)
             // 원본 텍스트 안에 [SCORE: X]가 없을 수 있으므로 0점으로 처리
             let fallbackText = text;
             if (!fallbackText.includes('[SCORE:')) {
                fallbackText += '\n[SCORE: 0]';
             }
             console.warn("JSON Parsing Failed, falling back to raw text:", e);
             return res.status(200).json({ feedbackText: fallbackText, success: true });
          }

      } catch (error) {
        throw error;
      }
    
    } else if (action === 'extractText') {
      if (!base64Image) {
        return res.status(400).json({ error: 'No image provided for extraction.' });
      }

      const base64Data = base64Image.split(',')[1] || base64Image;
      const prompt = `
이 이미지에 적힌 손글씨 텍스트를 인식해서 텍스트로만 반환해줘.
인식할 수 없는 문자는 문맥에 맞게 자연스럽게 유추하거나, 유추할 수 없다면 그대로 비워둬.
단, 불필요한 설명이나 부가적인 말은 절대로 추가하지 말고, 오직 인식된 텍스트 내용만 출력해.
`;
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType
        }
      };

      const result = await generateWithFallback(genAI, fallbackModels, [prompt, imagePart]);
      const response = await result.response;
      return res.status(200).json({ text: response.text().trim() });
    
    } else if (action === 'checkModels') {
      if (!actor || actor.role !== 'admin') return res.status(403).json({ error: 'Administrator access is required.' });
      try {
        // 백엔드에서 직접 모델 목록을 조회하여 API 키 정상 여부 확인
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        if (!response.ok) {
          const err = await response.text();
          return res.status(response.status).json({ error: `API 키 권한 에러: ${err}` });
        }
        const data: any = await response.json();
        const modelNames = data.models.map((m: any) => m.name);
        return res.status(200).json({ success: true, models: modelNames });
      } catch (error: any) {
        return res.status(500).json({ error: `통신 에러: ${error.message}` });
      }
    } else {
      return res.status(400).json({ error: 'Unknown action' });
    }

  } catch (error: any) {
    console.error("Gemini API error:", error);
    return res.status(500).json({ 
      error: error.message,
      feedbackText: `에러 발생: ${error.message} (선생님께 이 메시지를 알려주세요!)`, 
      success: false 
    });
  }
}
