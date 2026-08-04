import { adminDb } from "@/lib/firebase-admin";
import { isPublicMentorProfile } from "@/lib/content-visibility";
import { isMentorProfileComplete, toPublicMentorProfileDto } from "@/lib/mentor-profiles";

function matches(mentor, filters = {}) {
  const includes = (values, value) => !value || (values || []).some((item) => item.toLowerCase() === value.toLowerCase());
  return (
    includes(mentor.disciplines, filters.discipline) &&
    includes(mentor.skills, filters.skill) &&
    includes(mentor.supportedStudentLevels, filters.level) &&
    includes(mentor.languages, filters.language) &&
    includes(mentor.mentorshipFormats, filters.format) &&
    (!filters.availability || mentor.generalAvailability === filters.availability) &&
    (!filters.accepting || mentor.currentlyAcceptingStudents === (filters.accepting === "true"))
  );
}

export async function listPublicMentors({ db = adminDb, filters = {} } = {}) {
  const users = await db.collection("users").where("mentorStatus", "==", "approved").limit(200).get();
  const eligibleUsers = users.docs.filter((doc) => doc.data().mentorPublicProfileEnabled === true);
  const profiles = await Promise.all(
    eligibleUsers.map(async (userDoc) => {
      const profileDoc = await db.collection("mentor_profiles").doc(userDoc.id).get();
      if (!profileDoc.exists) return null;
      const profile = profileDoc.data();
      if (!isPublicMentorProfile({ mentorStatus: userDoc.data().mentorStatus, publicProfileEnabled: true }) || !isMentorProfileComplete(profile)) return null;
      return toPublicMentorProfileDto(userDoc.id, profile);
    })
  );
  return profiles.filter(Boolean).filter((mentor) => matches(mentor, filters));
}

export async function getPublicMentor(mentorId, { db = adminDb } = {}) {
  if (!mentorId) return null;
  const [userDoc, profileDoc] = await Promise.all([
    db.collection("users").doc(mentorId).get(),
    db.collection("mentor_profiles").doc(mentorId).get(),
  ]);
  if (!userDoc.exists || !profileDoc.exists) return null;
  const user = userDoc.data();
  const profile = profileDoc.data();
  if (!isPublicMentorProfile({ mentorStatus: user.mentorStatus, publicProfileEnabled: user.mentorPublicProfileEnabled }) || !isMentorProfileComplete(profile)) return null;
  return toPublicMentorProfileDto(mentorId, profile);
}
