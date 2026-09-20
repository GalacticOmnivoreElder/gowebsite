'use client';
import { auth } from '@/firebase';

export async function goFetch(path, body) {
  const user = auth.currentUser;
  const response = await fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'This action could not be completed.');
  return data;
}
