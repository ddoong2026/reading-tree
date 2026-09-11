import { supabase } from './supabaseClient';

const authHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('로그인이 필요합니다.');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` };
};

export interface AIFeedbackResponse {
  feedbackText: string;
  feedbackAnnotations?: { original: string; suggestion: string; reason: string }[];
  success: boolean;
}

export const generateReadingFeedback = async (
  textContent: string,
  hasImage: boolean
): Promise<AIFeedbackResponse> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        action: 'generateFeedback',
        textContent,
        hasImage,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate feedback');
    }

    return { feedbackText: data.feedbackText, feedbackAnnotations: data.feedbackAnnotations || [], success: data.success };
  } catch (error: any) {
    console.error("AI feedback error:", error);
    
    let errorMessage = error.message;
    if (errorMessage.includes('503')) {
      errorMessage = "AI 서버가 혼잡해 요청이 지연되고 있어요. 잠시 뒤 다시 시도해주세요.";
    } else {
      errorMessage = `에러 발생: ${errorMessage} (선생님께 이 메시지를 알려주세요!)`;
    }

    return { 
      feedbackText: errorMessage,
      success: false
    };
  }
};

export const extractTextFromImage = async (
  base64Image: string,
  mimeType: string
): Promise<string> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        action: 'extractText',
        base64Image,
        mimeType,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to extract text');
    }

    return data.text;
  } catch (error: any) {
    console.error("OCR error:", error);
    throw new Error(`이미지에서 글자를 읽는 중 오류가 발생했어요: ${error.message}`);
  }
};
