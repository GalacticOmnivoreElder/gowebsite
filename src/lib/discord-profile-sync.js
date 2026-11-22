import { after } from "next/server";
import { getDiscordConfig } from "@/lib/discord-api";
import { enqueueDiscordSync, syncDiscordConnection } from "@/lib/discord";

export async function notifyDiscordProfileChange(uid) {
  if (!getDiscordConfig().enabled) return;
  try { await enqueueDiscordSync(uid); }
  catch { console.error("discord_profile_enqueue_failed"); }
  after(async () => {
    try { await syncDiscordConnection(uid); }
    catch { console.error("discord_profile_sync_deferred"); }
  });
}
