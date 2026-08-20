/**
 * 더미 Gemini AI API 연동 모듈 (Phase 1 용)
 * 실제 구동을 위해서는 Google Gemini API Key가 필요하며,
 * 백엔드(Supabase Edge Functions 등)를 경유하여 호출하는 것을 권장합니다.
 */

// const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export interface AIFeedbackResponse {
  feedbackText: string;
  success: boolean;
}

export const generateReadingFeedback = async (
  textContent: string,
  hasImage: boolean
): Promise<AIFeedbackResponse> => {
  // 실제 API 연동 시 사용할 로직 뼈대
  /*
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `다음 독서록을 읽고 따뜻한 초등학교 선생님처럼 칭찬 위주의 피드백을 2~3문장으로 작성해줘: ${textContent}` }]
        }]
      })
    });
    const data = await response.json();
    return { feedbackText: data.candidates[0].content.parts[0].text, success: true };
  } catch (error) {
    console.error("AI feedback error:", error);
    return { feedbackText: "오류가 발생했어요. 다시 시도해볼까요?", success: false };
  }
  */

  // 1.5초 정도의 지연을 주어 실제 API처럼 동작하는 것처럼 모의(Mock)합니다.
  return new Promise((resolve) => {
    // 입력받은 내용을 콘솔에 출력하여 경고(unused variable) 해결 및 모의 분석 동작 표현
    console.log(`[모의 AI 분석 중] 전달받은 텍스트: "${textContent}"`);
    
    setTimeout(() => {
      let feedback = "참 잘했어요! 책의 내용을 정말 잘 이해했네요. 🌳";
      if (hasImage) {
        feedback = "그린 그림이 정말 멋져요! 글과 그림으로 책의 느낌을 훌륭하게 표현해주었네요. 앞으로도 독서오름나무와 함께 꾸준히 책을 읽어봐요! 🎨🌳";
      }
      resolve({
        feedbackText: feedback,
        success: true
      });
    }, 1500);
  });
};
