import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { enqueueEmailEvents } from "./outbox";
import { normalizeEmail } from "./utils";

export async function getEmailRecipientForUser(userId) {
  if (!userId) return null;
  const snapshot = await adminDb.collection("users").doc(userId).get();
  if (snapshot.exists) {
    const data = snapshot.data();
    const email = normalizeEmail(data.email);
    if (email) {
      return {
        userId,
        email,
        displayName: data.username || data.name || null,
      };
    }
  }
  try {
    const authUser = await adminAuth.getUser(userId);
    const email = normalizeEmail(authUser.email);
    return email
      ? {
          userId,
          email,
          displayName: authUser.displayName || null,
        }
      : null;
  } catch {
    return null;
  }
}

export async function getEmailRecipientsForUsers(userIds = []) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const recipients = await Promise.all(uniqueIds.map(getEmailRecipientForUser));
  return recipients.filter(Boolean);
}

export async function enqueueEmailEventForUsers({
  type,
  eventId,
  userIds,
  data,
  scheduledFor,
}) {
  const recipients = await getEmailRecipientsForUsers(userIds);
  return enqueueEmailEvents(
    recipients.map((recipient) => ({
      type,
      eventId,
      userId: recipient.userId,
      recipient: recipient.email,
      scheduledFor,
      data: {
        ...data,
        displayName: data?.displayName || recipient.displayName,
      },
    }))
  );
}

export function projectManagers(project) {
  return [...new Set([project?.owner, ...(project?.admins || [])].filter(Boolean))];
}

export function projectParticipants(project) {
  return [
    ...new Set(
      [
        project?.owner,
        ...(project?.admins || []),
        ...(project?.teamMembers || []),
      ].filter(Boolean)
    ),
  ];
}
