import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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
    
    const genAI = new GoogleGenerativeAI(API_KEY);
    const fallbackModels = ["gemini-3.6-flash"];

    if (action === 'generateFeedback') {
      const defaultPrompt = `
당신은 따뜻하고 다정한 초등학교 선생님입니다. 학생이 작성한 다음 독서록을 읽고 피드백을 작성해주세요.
[학생의 독서록 내용]
[학생글]

다음 3가지 지침을 엄격하게 지켜서 작성하세요:
1. 칭찬과 교정 (3~4문장): 독서록 내용에 대해 폭풍 칭찬과 공감을 해주고, 맞춤법이 틀렸다면 부드럽게 교정해주세요. (그림이 있다면 그림 칭찬 필수)
2. 통과 기준: 욕설, 무의미한 단어 반복('ㅋㅋㅋ', '아아아')이 아니라면 무조건 100점을 부여하세요. 만약 내용이 너무 부실해서 70점 미만을 준다면, 어떤 점을 보충해서 다시 제출해야 할지 다정하게 안내하세요.
3. 점수 출력 (매우 중요): 피드백의 **맨 마지막 줄**에는 반드시, 예외 없이 "[SCORE: 점수]" 형식으로 점수만 출력해야 합니다. 다른 문장과 섞지 마세요. (예: [SCORE: 100])

말투는 반드시 "~했어요", "~해요" 같은 다정하고 부드러운 말투를 사용하고, 이모지는 절대 사용하지 마세요.
`;
      const template = req.body.customPrompt || defaultPrompt;
      let prompt = template.replace(/\[학생글\]/g, `"${textContent}"`);
      
      if (hasImage) {
        prompt += "\n\n(참고: 학생이 글과 함께 정성스럽게 그린 그림도 제출했어!)";
      }

      let lastError: any = null;
      for (const modelName of fallbackModels) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return res.status(200).json({ feedbackText: response.text(), success: true });
        } catch (error: any) {
          console.warn(`[${modelName}] feedback failed:`, error.message);
          lastError = error;
        }
      }
      throw lastError;
    
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

      let lastError: any = null;
      for (const modelName of fallbackModels) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent([prompt, imagePart]);
          const response = await result.response;
          return res.status(200).json({ text: response.text().trim() });
        } catch (error: any) {
          console.warn(`[${modelName}] OCR failed:`, error.message);
          lastError = error;
        }
      }
      throw lastError;
    
    } else if (action === 'checkModels') {
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
