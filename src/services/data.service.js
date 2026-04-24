const { getSupabaseAdmin } = require("../lib/supabase");

function unwrap(response) {
  if (response.error) {
    throw response.error;
  }
  return response.data;
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    isEmailVerified: row.is_email_verified,
    googleId: row.google_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOtp(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    code: row.code,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    verified: row.verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapResume(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    fileUrl: row.file_url,
    jobTitle: row.job_title,
    atsScore: row.ats_score,
    analysis: row.analysis,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findUserByEmail(email) {
  const supabase = getSupabaseAdmin();
  const data = unwrap(
    await supabase.from("users").select("*").eq("email", email).maybeSingle()
  );
  return mapUser(data);
}

async function createUser(payload) {
  const supabase = getSupabaseAdmin();
  const data = unwrap(
    await supabase
      .from("users")
      .insert({
        name: payload.name,
        email: payload.email,
        password_hash: payload.passwordHash || null,
        is_email_verified: Boolean(payload.isEmailVerified),
        google_id: payload.googleId || null,
      })
      .select("*")
      .single()
  );
  return mapUser(data);
}

async function updateUserByEmail(email, updates) {
  const supabase = getSupabaseAdmin();
  const patch = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.passwordHash !== undefined) patch.password_hash = updates.passwordHash;
  if (updates.isEmailVerified !== undefined) patch.is_email_verified = updates.isEmailVerified;
  if (updates.googleId !== undefined) patch.google_id = updates.googleId;

  const data = unwrap(
    await supabase.from("users").update(patch).eq("email", email).select("*").single()
  );
  return mapUser(data);
}

async function upsertOtpByEmail(email, { code, expiresAt, verified }) {
  const supabase = getSupabaseAdmin();
  const data = unwrap(
    await supabase
      .from("otps")
      .upsert(
        {
          email,
          code,
          expires_at: expiresAt.toISOString(),
          verified: Boolean(verified),
        },
        { onConflict: "email" }
      )
      .select("*")
      .single()
  );
  return mapOtp(data);
}

async function findOtpByEmail(email) {
  const supabase = getSupabaseAdmin();
  const data = unwrap(
    await supabase.from("otps").select("*").eq("email", email).maybeSingle()
  );
  return mapOtp(data);
}

async function markOtpVerified(email) {
  const supabase = getSupabaseAdmin();
  const data = unwrap(
    await supabase
      .from("otps")
      .update({ verified: true })
      .eq("email", email)
      .select("*")
      .maybeSingle()
  );
  return mapOtp(data);
}

async function createResume(payload) {
  const supabase = getSupabaseAdmin();
  const data = unwrap(
    await supabase
      .from("resumes")
      .insert({
        user_id: payload.userId,
        file_url: payload.fileUrl || null,
        job_title: payload.jobTitle || null,
        ats_score: payload.atsScore ?? null,
        analysis: payload.analysis || {},
      })
      .select("*")
      .single()
  );
  return mapResume(data);
}

async function listResumesByUser(userId, limit = 10) {
  const supabase = getSupabaseAdmin();
  const data = unwrap(
    await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)
  );
  return (data || []).map(mapResume);
}

async function findLatestResumeByUser(userId) {
  const supabase = getSupabaseAdmin();
  const data = unwrap(
    await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  );
  return mapResume(data);
}

async function findResumeByIdForUser(id, userId) {
  const supabase = getSupabaseAdmin();
  const data = unwrap(
    await supabase
      .from("resumes")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle()
  );
  return mapResume(data);
}

async function deleteResumeByIdForUser(id, userId) {
  const supabase = getSupabaseAdmin();
  const data = unwrap(
    await supabase
      .from("resumes")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle()
  );
  return mapResume(data);
}

async function createResumeProfile(payload) {
  const supabase = getSupabaseAdmin();
  const data = unwrap(
    await supabase
      .from("resume_profiles")
      .insert({
        user_id: payload.userId,
        experience_level: payload.experienceLevel,
        full_name: payload.fullName,
        email: payload.email,
        phone: payload.phone || null,
        location: payload.location || null,
        title: payload.title || null,
        linkedin: payload.linkedin || null,
        github: payload.github || null,
        portfolio: payload.portfolio || null,
        summary: payload.summary || null,
        experience: payload.experience || null,
        projects: payload.projects || null,
        skills: payload.skills || null,
        education: payload.education || null,
        certifications: payload.certifications || null,
        achievements: payload.achievements || null,
        languages: payload.languages || null,
        theme: payload.theme || null,
        section_order: payload.sectionOrder || [],
        ai_rewrite: payload.aiRewrite || null,
      })
      .select("id")
      .single()
  );
  return data;
}

module.exports = {
  createResume,
  createResumeProfile,
  createUser,
  deleteResumeByIdForUser,
  findLatestResumeByUser,
  findOtpByEmail,
  findResumeByIdForUser,
  findUserByEmail,
  listResumesByUser,
  markOtpVerified,
  updateUserByEmail,
  upsertOtpByEmail,
};
