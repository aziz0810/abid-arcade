/* Matchday Arcade · push notifications
   Sends a notification to a player's devices (tokens/{uid}) when:
   - a friend invites them to a room          (invites/{to}/{from})
   - someone sends them a friend request     (freq/{to}/{from})
   - every day at 18:00 Tunis time: the Daily match is ready
   - every Monday at 10:00: new weekly challenges
   Deploy: see "Push notifications" in README.md. Needs the Blaze plan (the free quota covers this). */
const { onValueCreated } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const REGION = "europe-west1";
const INSTANCE = "abid-football-default-rtdb";
const SITE = "https://aziz0810.github.io/abid-arcade/";

const T = {
  invite: { en: (n, g, c) => [`🎮 ${n} invites you`, `Play ${g} in room ${c}`],
            fr: (n, g, c) => [`🎮 ${n} t'invite`, `Joue à ${g} dans le salon ${c}`],
            ar: (n, g, c) => [`🎮 ${n} يدعوك للعب`, `${g} في الغرفة ${c}`] },
  friend: { en: n => ["👥 New friend request", `${n} wants to be your friend`],
            fr: n => ["👥 Nouvelle demande d'ami", `${n} veut être ton ami`],
            ar: n => ["👥 طلب صداقة جديد", `${n} يريد أن يكون صديقك`] },
  daily:  { en: () => ["⚽ Today's Daily match is ready", "Can you find the secret player in fewer guesses than your friends?"],
            fr: () => ["⚽ Le match du jour est prêt", "Trouveras-tu le joueur secret en moins d'essais que tes amis ?"],
            ar: () => ["⚽ مباراة اليوم جاهزة", "هل تجد اللاعب السري بمحاولات أقل من أصدقائك؟"] },
  weekly: { en: () => ["🎯 New weekly challenges", "Three new challenges are waiting. Earn XP and keep your streak!"],
            fr: () => ["🎯 Nouveaux défis de la semaine", "Trois nouveaux défis t'attendent. Gagne de l'XP !"],
            ar: () => ["🎯 تحديات أسبوعية جديدة", "ثلاثة تحديات جديدة بانتظارك. اربح نقاط الخبرة!"] }
};
const text = (kind, lang, ...a) => (T[kind][lang] || T[kind].en)(...a);

async function sendTo(uid, kind, hash, ...args) {
  const db = getDatabase();
  const v = (await db.ref(`tokens/${uid}`).get()).val() || {};
  const entries = Object.entries(v).filter(([, x]) => x && x.t);
  if (!entries.length) return;
  const link = SITE + (hash ? "#" + hash : "");
  // one message per language so each device gets its own language
  const byLang = {};
  entries.forEach(([k, x]) => (byLang[x.lang || "en"] = byLang[x.lang || "en"] || []).push([k, x.t]));
  for (const [lang, list] of Object.entries(byLang)) {
    const [title, body] = text(kind, lang, ...args);
    const res = await getMessaging().sendEachForMulticast({
      tokens: list.map(x => x[1]),
      notification: { title, body },
      data: { url: link, tag: kind },
      webpush: { fcmOptions: { link }, notification: { icon: SITE + "icons/icon-192.png", tag: kind } }
    });
    const dead = [];
    res.responses.forEach((r, i) => {
      const code = (r.error && r.error.code) || "";
      if (!r.success && /registration-token-not-registered|invalid-registration-token|invalid-argument/.test(code)) dead.push(list[i][0]);
    });
    await Promise.all(dead.map(k => db.ref(`tokens/${uid}/${k}`).remove()));
  }
}
async function everyone(kind, hash) {
  const all = (await getDatabase().ref("tokens").get()).val() || {};
  for (const uid of Object.keys(all)) { try { await sendTo(uid, kind, hash); } catch (e) { console.warn(uid, e.message); } }
}

exports.onInvite = onValueCreated({ ref: "/invites/{to}/{from}", region: REGION, instance: INSTANCE }, async e => {
  const i = e.data.val() || {};
  if (!i.code) return;
  await sendTo(e.params.to, "invite", `join-${i.code}`, i.n || "A friend", i.g || "a game", i.code);
});
exports.onFriendRequest = onValueCreated({ ref: "/freq/{to}/{from}", region: REGION, instance: INSTANCE }, async e => {
  const r = e.data.val() || {};
  await sendTo(e.params.to, "friend", "friends", r.n || "Someone");
});
exports.dailyReminder = onSchedule({ schedule: "0 18 * * *", timeZone: "Africa/Tunis", region: REGION }, () => everyone("daily", "close"));
exports.weeklyChallenges = onSchedule({ schedule: "0 10 * * 1", timeZone: "Africa/Tunis", region: REGION }, () => everyone("weekly", "challenges"));
