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
    const headers = await authHeaders();
    const enqueueResponse = await fetch('/api/feedback-queue', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'enqueue',
        textContent,
        hasImage,
      }),
    });
    const queued = await enqueueResponse.json();
    if (!enqueueResponse.ok) throw new Error(queued.error || 'Failed to queue feedback');

    // 요청은 저장됐으므로 화면을 닫아도 AI 첨삭 작업 자체는 Cron이 계속 처리합니다.
    for (let poll = 0; poll < 100; poll++) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const statusResponse = await fetch('/api/feedback-queue', {
        method: 'POST', headers, body: JSON.stringify({ action: 'status', jobId: queued.jobId }),
      });
      const status = await statusResponse.json();
      if (!statusResponse.ok) throw new Error(status.error || 'Failed to check queue status');
      if (status.status === 'completed') {
        return { feedbackText: status.feedback_text, feedbackAnnotations: status.feedback_annotations || [], success: true };
      }
      if (status.status === 'failed') throw new Error(status.error_message || 'AI feedback generation failed.');
    }
    throw new Error('첨삭 요청은 대기열에 저장되었습니다. 잠시 뒤 다시 열어 확인해주세요.');
  } catch (error: any) {
    console.error("AI feedback error:", error);
    
    let errorMessage = error.message;
    if (errorMessage.includes('503')) {
      errorMessage = "AI 서버가 혼잡해 요청을 대기열에 유지하고 있어요. 잠시 뒤 자동으로 다시 처리합니다.";
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
