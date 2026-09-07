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
    const fallbackModels = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-pro"];

    if (action === 'generateFeedback') {
      const defaultPrompt = `
너는 따뜻하고 다정한 초등학교 선생님이야. 학생이 다음과 같은 독서록을 작성했어.
[학생의 독서록 내용]
[학생글]

다음 두 가지를 포함해서 3~4문장으로 다정하게 피드백을 작성해줘:
1. 독서록 내용에 대한 폭풍 칭찬과 공감 (그림을 제출했다면 그림에 대한 칭찬도 꼭 포함)
2. 띄어쓰기나 맞춤법이 틀린 부분이 있다면 아주 친절하고 부드럽게 한두 개만 짚어서 교정 (만약 완벽하다면 글쓰기 솜씨에 대해 칭찬해줘)

말투는 반드시 "~했어요", "~해요" 같은 다정하고 부드러운 초등학교 선생님 말투로 작성해줘. 이모지는 절대로 사용하지 마.
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
