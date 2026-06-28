import { randomUUID } from 'crypto';

const jobs = new Map();

// Automatically clean up jobs older than 1 hour to prevent memory bloat
setInterval(() => {
  const now = Date.now();
  for (const [jobId, job] of jobs.entries()) {
    const createdTime = new Date(job.createdAt).getTime();
    if (now - createdTime > 60 * 60 * 1000) {
      jobs.delete(jobId);
    }
  }
}, 5 * 60 * 1000);

export const JobQueue = {
  createJob(type, fileName, initiatedBy) {
    const jobId = randomUUID();
    const job = {
      jobId,
      type,
      fileName,
      status: 'processing',
      progress: { done: 0, total: 0 },
      error: null,
      cancelled: false,
      createdAt: new Date().toISOString(),
      initiatedBy
    };
    jobs.set(jobId, job);
    return jobId;
  },

  updateJob(jobId, updates) {
    const job = jobs.get(jobId);
    if (job) {
      if (updates.progress && job.progress) {
        updates.progress = { ...job.progress, ...updates.progress };
      }
      Object.assign(job, updates);
      jobs.set(jobId, job);
    }
    return job;
  },

  cancelJob(jobId) {
    const job = jobs.get(jobId);
    if (job) {
      job.cancelled = true;
      job.status = 'cancelling';
      jobs.set(jobId, job);
    }
    return job;
  },

  getJob(jobId) {
    return jobs.get(jobId);
  }
};
