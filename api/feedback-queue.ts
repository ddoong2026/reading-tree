import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServiceClient, requireUser } from './auth.js';

const queueSecretMatches = (req: VercelRequest) => {
  const secret = process.env.CRON_SECRET;
  const authorization = req.headers.authorization;
  return Boolean(secret && authorization === `Bearer ${secret}`);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = getServiceClient();

  // Vercel Cron이 1분마다 한 건씩 처리합니다. CRON_SECRET이 없으면 실행하지 않습니다.
  if (req.method === 'GET') {
    if (!queueSecretMatches(req)) return res.status(401).json({ error: 'Unauthorized cron request.' });
    const { data: candidate } = await db.from('ai_feedback_queue')
      .select('*').eq('status', 'queued').lte('available_at', new Date().toISOString())
      .order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (!candidate) return res.status(200).json({ processed: false });

    // 상태 조건을 함께 두어, 겹친 Cron 실행이 같은 작업을 가져가지 않게 합니다.
    const { data: job } = await db.from('ai_feedback_queue').update({
      status: 'processing', started_at: new Date().toISOString(), attempts: candidate.attempts + 1,
    }).eq('id', candidate.id).eq('status', 'queued').select().maybeSingle();
    if (!job) return res.status(200).json({ processed: false });

    try {
      const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://${req.headers.host}`;
      const response = await fetch(`${host}/api/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-queue-secret': process.env.QUEUE_WORKER_SECRET || '' },
        body: JSON.stringify({ action: 'generateFeedback', textContent: job.text_content, hasImage: job.has_image }),
      });
      const result: any = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'AI feedback generation failed.');
      await db.from('ai_feedback_queue').update({
        status: 'completed', feedback_text: result.feedbackText,
        feedback_annotations: result.feedbackAnnotations || [], completed_at: new Date().toISOString(), error_message: null,
      }).eq('id', job.id);
      return res.status(200).json({ processed: true, id: job.id, status: 'completed' });
    } catch (error: any) {
      const transient = /(429|quota|rate|503|overloaded|timeout)/i.test(String(error?.message || error));
      const retry = transient && job.attempts < 5;
      await db.from('ai_feedback_queue').update(retry ? {
        status: 'queued', available_at: new Date(Date.now() + Math.min(15, job.attempts * 2) * 60_000).toISOString(),
        error_message: String(error?.message || error),
      } : { status: 'failed', error_message: String(error?.message || error), completed_at: new Date().toISOString() }).eq('id', job.id);
      return res.status(200).json({ processed: true, id: job.id, status: retry ? 'queued' : 'failed' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const actor = await requireUser(req);
  if (!actor) return res.status(401).json({ error: 'Authentication is required.' });
  const { action, jobId, textContent, hasImage } = req.body || {};

  if (action === 'enqueue') {
    if (typeof textContent !== 'string' || (!textContent.trim() && !hasImage)) return res.status(400).json({ error: 'Text or image is required.' });
    const { data, error } = await db.from('ai_feedback_queue').insert({
      user_id: actor.user.id, text_content: textContent, has_image: Boolean(hasImage),
    }).select('id, status, created_at').single();
    if (error) return res.status(500).json({ error: error.message });
    const { count } = await db.from('ai_feedback_queue').select('*', { count: 'exact', head: true })
      .eq('status', 'queued').lte('created_at', data.created_at);
    return res.status(202).json({ jobId: data.id, position: count || 1 });
  }

  if (action === 'status' && typeof jobId === 'string') {
    const { data, error } = await db.from('ai_feedback_queue').select('status, feedback_text, feedback_annotations, error_message')
      .eq('id', jobId).eq('user_id', actor.user.id).maybeSingle();
    if (error || !data) return res.status(404).json({ error: 'Queue job not found.' });
    return res.status(200).json(data);
  }
  return res.status(400).json({ error: 'Unknown action.' });
}
