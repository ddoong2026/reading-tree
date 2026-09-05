export interface AIFeedbackResponse {
  feedbackText: string;
  success: boolean;
}

export const generateReadingFeedback = async (
  textContent: string,
  hasImage: boolean
): Promise<AIFeedbackResponse> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

    return { feedbackText: data.feedbackText, success: data.success };
  } catch (error: any) {
    console.error("AI feedback error:", error);
    return { 
      feedbackText: `에러 발생: ${error.message} (선생님께 이 메시지를 알려주세요!)`, 
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
      headers: {
        'Content-Type': 'application/json',
      },
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
