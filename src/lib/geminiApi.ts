/**
 * 더미 Gemini AI API 연동 모듈 (Phase 1 용)
 * 실제 구동을 위해서는 Google Gemini API Key가 필요하며,
 * 백엔드(Supabase Edge Functions 등)를 경유하여 호출하는 것을 권장합니다.
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export interface AIFeedbackResponse {
  feedbackText: string;
  success: boolean;
}

export const generateReadingFeedback = async (
  textContent: string,
  hasImage: boolean
): Promise<AIFeedbackResponse> => {
  
  if (!API_KEY || API_KEY === 'your_api_key_here') {
    console.error("Gemini API Key is missing!");
    return { 
      feedbackText: "선생님, Vercel 환경변수나 .env 파일에 VITE_GEMINI_API_KEY를 설정해주세요! 🌳", 
      success: false 
    };
  }

  try {
    const prompt = `
너는 따뜻하고 다정한 초등학교 선생님이야. 학생이 다음과 같은 독서록을 작성했어.
${hasImage ? "(참고: 학생이 글과 함께 정성스럽게 그린 그림도 제출했어!)" : ""}

[학생의 독서록 내용]
"${textContent}"

다음 두 가지를 포함해서 3~4문장으로 다정하게 피드백을 작성해줘:
1. 독서록 내용에 대한 폭풍 칭찬과 공감 (그림을 제출했다면 그림에 대한 칭찬도 꼭 포함)
2. 띄어쓰기나 맞춤법이 틀린 부분이 있다면 아주 친절하고 부드럽게 한두 개만 짚어서 교정 (만약 완벽하다면 글쓰기 솜씨에 대해 칭찬해줘)

말투는 반드시 "~했어요", "~해요" 같은 다정하고 부드러운 초등학교 선생님 말투로 작성해줘. 이모지는 절대로 사용하지 마.
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const feedbackText = data.candidates[0].content.parts[0].text;
    
    return { feedbackText, success: true };
  } catch (error) {
    console.error("AI feedback error:", error);
    return { 
      feedbackText: "앗, 마법의 숲 통신망에 잠시 문제가 생겼나 봐요. 조금 뒤에 다시 시도해주세요! 🍃", 
      success: false 
    };
  }
};
