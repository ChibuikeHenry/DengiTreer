"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncTreeMergeOffers = exports.unmergeFamilyTrees = exports.declineTreeMerge = exports.acceptTreeMerge = exports.getMergeRequesterFamily = exports.getTreeMergeRequest = exports.checkInviteeEmailForMerge = void 0;
exports.findUidByEmail = findUidByEmail;
exports.countTreeMembers = countTreeMembers;
exports.offerTreeMergeForInvitation = offerTreeMergeForInvitation;
exports.maybeCreateTreeMergeRequest = maybeCreateTreeMergeRequest;
exports.mergeReviewUrl = mergeReviewUrl;
const crypto_1 = require("crypto");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const https_1 = require("firebase-functions/v2/https");
const inviteAccept_1 = require("./inviteAccept");
const APP_ORIGIN = process.env.APP_ORIGIN ?? 'https://dengitree.web.app';
function db() {
    return (0, firestore_1.getFirestore)();
}
function mergeRoleLabel(role) {
    const map = {
        spouse: 'Spouse',
        parent: 'Parent',
        grandparent: 'Grandparent',
        'great-grandparent': 'Great-grandparent',
        child: 'Child',
        sibling: 'Sibling',
        member: 'Family Member',
    };
    const key = String(role ?? 'member');
    return map[key] ?? 'Family Member';
}
function newToken() {
    return (0, crypto_1.randomBytes)(6).toString('hex');
}
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function normalizeEmail(raw) {
    const trimmed = String(raw ?? '').trim().toLowerCase();
    if (!trimmed)
        return null;
    const at = trimmed.indexOf('@');
    if (at <= 0 || at >= trimmed.length - 1)
        return null;
    return trimmed;
}
async function findUidByEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized)
        return null;
    try {
        const user = await (0, auth_1.getAuth)().getUserByEmail(normalized);
        return user.uid;
    }
    catch {
        /* not registered */
    }
    try {
        const snap = await db().collection('users').where('email', '==', normalized).limit(1).get();
        if (!snap.empty)
            return snap.docs[0].id;
    }
    catch {
        /* index may be missing; auth lookup is primary */
    }
    return null;
}
async function userHasOwnTree(uid) {
    const membersSnap = await db()
        .collection('users')
        .doc(uid)
        .collection('familyMembers')
        .limit(1)
        .get();
    if (!membersSnap.empty)
        return true;
    const invitesSnap = await db()
        .collection('invitations')
        .where('inviterUid', '==', uid)
        .limit(1)
        .get();
    return !invitesSnap.empty;
}
async function emailUsedOnAnotherTree(email, excludeInviterUid) {
    const invites = await db()
        .collection('invitations')
        .where('inviteeEmail', '==', email)
        .limit(25)
        .get();
    for (const doc of invites.docs) {
        const data = doc.data();
        if (String(data.inviterUid ?? '') === excludeInviterUid)
            continue;
        if (data.role === 'member')
            continue;
        return true;
    }
    try {
        const members = await db()
            .collectionGroup('familyMembers')
            .where('inviteeEmail', '==', email)
            .limit(15)
            .get();
        for (const doc of members.docs) {
            const parts = doc.ref.path.split('/');
            const ownerUid = parts[1] ?? '';
            if (ownerUid && ownerUid !== excludeInviterUid)
                return true;
        }
    }
    catch {
        /* collection group index may still be building */
    }
    return false;
}
async function inviteeHasFamilyTreeContext(uid, email, inviterUid) {
    if (await userHasOwnTree(uid))
        return true;
    const snap = await db().collection('users').doc(uid).get();
    const profile = snap.data() ?? {};
    if (String(profile.invitedByUid ?? '').trim())
        return true;
    if (String(profile.treeFatherMemberId ?? '').trim())
        return true;
    if (String(profile.treeMotherMemberId ?? '').trim())
        return true;
    if (String(profile.claimedInviteToken ?? '').trim())
        return true;
    if (String(profile.inviteToken ?? '').trim())
        return true;
    const joinedAs = await db()
        .collection('invitations')
        .where('joinedUid', '==', uid)
        .limit(1)
        .get();
    if (!joinedAs.empty)
        return true;
    return emailUsedOnAnotherTree(email, inviterUid);
}
async function resolveMergeInvitee(inviteeEmail, inviterUid) {
    const email = normalizeEmail(inviteeEmail);
    if (!email)
        return { inviteeUid: null, shouldOffer: false, notice: null };
    const inviteeUid = await findUidByEmail(email);
    if (inviteeUid === inviterUid) {
        return {
            inviteeUid: null,
            shouldOffer: false,
            notice: 'That email belongs to your own DengiTree account.',
        };
    }
    if (inviteeUid) {
        const hasTree = await inviteeHasFamilyTreeContext(inviteeUid, email, inviterUid);
        if (hasTree) {
            return {
                inviteeUid,
                shouldOffer: true,
                notice: 'This person already has a family tree on DengiTree. They will be asked to merge their tree with yours.',
            };
        }
        return { inviteeUid, shouldOffer: false, notice: null };
    }
    if (await emailUsedOnAnotherTree(email, inviterUid)) {
        return {
            inviteeUid: null,
            shouldOffer: false,
            notice: 'This email is already on another family tree. Ask them to sign in with that email, then save this invite again to send a merge request.',
        };
    }
    return { inviteeUid: null, shouldOffer: false, notice: null };
}
function mergeRequestRef(invitationToken) {
    return db().collection('treeMergeRequests').doc(invitationToken);
}
async function countTreeMembers(uid) {
    const snap = await db().collection('users').doc(uid).collection('familyMembers').get();
    return snap.size;
}
async function displayNameForUid(uid) {
    const snap = await db().collection('users').doc(uid).get();
    const data = snap.data() ?? {};
    const name = [data.firstName, data.middleName, data.lastName]
        .map((p) => String(p ?? '').trim())
        .filter(Boolean)
        .join(' ');
    if (name)
        return name;
    const email = String(data.email ?? '').trim();
    if (email)
        return email.split('@')[0] ?? email;
    return 'Family member';
}
exports.checkInviteeEmailForMerge = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to check this email.');
    }
    const email = normalizeEmail(request.data?.email);
    if (!email) {
        return { shouldMerge: false };
    }
    const inviterUid = request.auth.uid;
    const resolved = await resolveMergeInvitee(email, inviterUid);
    if (!resolved.shouldOffer || !resolved.inviteeUid) {
        return {
            shouldMerge: false,
            notice: resolved.notice,
        };
    }
    const [requesterMemberCount, inviteeMemberCount, requesterDisplayName, inviteeDisplayName] = await Promise.all([
        countTreeMembers(inviterUid),
        countTreeMembers(resolved.inviteeUid),
        displayNameForUid(inviterUid),
        displayNameForUid(resolved.inviteeUid),
    ]);
    return {
        shouldMerge: true,
        email,
        inviteeUid: resolved.inviteeUid,
        inviteeDisplayName,
        inviteeMemberCount,
        requesterDisplayName,
        requesterMemberCount,
        notice: resolved.notice,
    };
});
exports.getTreeMergeRequest = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to view this merge request.');
    }
    const token = String(request.data?.token ?? '').trim();
    if (!token)
        throw new https_1.HttpsError('invalid-argument', 'Missing token.');
    const mergeSnap = await mergeRequestRef(token).get();
    if (!mergeSnap.exists)
        throw new https_1.HttpsError('not-found', 'Merge request not found.');
    const merge = mergeSnap.data();
    const uid = request.auth.uid;
    const inviterUid = String(merge.inviterUid ?? '');
    const inviteeUid = String(merge.inviteeUid ?? '');
    if (uid !== inviterUid && uid !== inviteeUid) {
        throw new https_1.HttpsError('permission-denied', 'You cannot view this merge request.');
    }
    const inviteSnap = await db().collection('invitations').doc(token).get();
    const invite = inviteSnap.data() ?? {};
    return {
        token,
        status: String(merge.status ?? 'pending'),
        inviterUid,
        inviteeUid,
        inviteeEmail: normalizeEmail(merge.inviteeEmail),
        inviterName: String(invite.inviterName ?? merge.requesterDisplayName ?? 'A family member'),
        inviteeName: String(merge.inviteeDisplayName ?? invite.inviteeName ?? 'Family member'),
        mergeMessage: String(merge.mergeMessage ?? invite.personalMessage ?? '').trim() || null,
        requesterMemberCount: Number(merge.requesterMemberCount ?? 0),
        inviteeMemberCount: Number(merge.inviteeMemberCount ?? 0),
        roleLabel: mergeRoleLabel(invite.role),
        createdAt: merge.createdAt ?? null,
    };
});
exports.getMergeRequesterFamily = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to view this family.');
    }
    const token = String(request.data?.token ?? '').trim();
    if (!token)
        throw new https_1.HttpsError('invalid-argument', 'Missing token.');
    const mergeSnap = await mergeRequestRef(token).get();
    if (!mergeSnap.exists)
        throw new https_1.HttpsError('not-found', 'Merge request not found.');
    const merge = mergeSnap.data();
    const uid = request.auth.uid;
    if (String(merge.inviteeUid ?? '') !== uid && String(merge.inviterUid ?? '') !== uid) {
        throw new https_1.HttpsError('permission-denied', 'You cannot view this family.');
    }
    const inviterUid = String(merge.inviterUid ?? '').trim();
    const inviterProfile = await db().collection('users').doc(inviterUid).get();
    const requesterName = await displayNameForUid(inviterUid);
    const membersSnap = await db()
        .collection('users')
        .doc(inviterUid)
        .collection('familyMembers')
        .get();
    const members = membersSnap.docs.map((doc) => {
        const d = doc.data();
        return {
            id: doc.id,
            displayName: String(d.displayName ?? d.firstName ?? 'Family member'),
            role: String(d.role ?? 'member'),
            gender: d.gender ? String(d.gender) : null,
        };
    });
    return {
        requesterName,
        requesterPhotoURL: inviterProfile.data()?.photoURL ?? null,
        members,
    };
});
async function offerTreeMergeForInvitation(options) {
    const inviteeEmail = normalizeEmail(options.inviteeEmail);
    if (!inviteeEmail)
        return { offered: false, notice: null };
    const resolved = await resolveMergeInvitee(inviteeEmail, options.inviterUid);
    if (resolved.notice && !resolved.shouldOffer) {
        await db()
            .collection('invitations')
            .doc(options.invitationToken)
            .set({
            treeMergeOffered: false,
            treeMergeInviterNotice: resolved.notice,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        return { offered: false, notice: resolved.notice };
    }
    if (!resolved.shouldOffer || !resolved.inviteeUid) {
        return { offered: false, notice: resolved.notice };
    }
    const inviteeUid = resolved.inviteeUid;
    const inviteeUserSnap = await db().collection('users').doc(inviteeUid).get();
    if (String(inviteeUserSnap.data()?.treeMergedIntoUid ?? '').trim() === options.inviterUid) {
        return { offered: false, notice: null };
    }
    const existing = await mergeRequestRef(options.invitationToken).get();
    const existingStatus = String(existing.data()?.status ?? '');
    if (existingStatus === 'accepted') {
        return { offered: true, notice: resolved.notice };
    }
    const alreadyPending = existing.exists && existingStatus === 'pending';
    const [requesterMemberCount, inviteeMemberCount, inviteeDisplayName] = await Promise.all([
        options.requesterMemberCount !== undefined
            ? Promise.resolve(options.requesterMemberCount)
            : countTreeMembers(options.inviterUid),
        options.inviteeMemberCount !== undefined
            ? Promise.resolve(options.inviteeMemberCount)
            : countTreeMembers(inviteeUid),
        options.inviteeDisplayName
            ? Promise.resolve(options.inviteeDisplayName)
            : displayNameForUid(inviteeUid),
    ]);
    await mergeRequestRef(options.invitationToken).set({
        invitationToken: options.invitationToken,
        inviterUid: options.inviterUid,
        inviteeUid,
        inviteeEmail,
        status: 'pending',
        mergeMessage: options.mergeMessage?.trim() || options.personalMessage?.trim() || null,
        requesterDisplayName: options.inviterName,
        requesterMemberCount,
        inviteeMemberCount,
        inviteeDisplayName,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        respondedAt: null,
    }, { merge: true });
    await db()
        .collection('invitations')
        .doc(options.invitationToken)
        .set({
        treeMergeOffered: true,
        treeMergeInviteeUid: inviteeUid,
        treeMergeInviterNotice: resolved.notice,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    const shouldSendEmail = options.sendEmail !== false && !alreadyPending;
    if (shouldSendEmail) {
        const greeting = inviteeEmail.split('@')[0] || 'there';
        const extra = options.personalMessage
            ? `<p><em>${escapeHtml(options.personalMessage)}</em></p>`
            : '';
        await db().collection('mail').add({
            to: inviteeEmail,
            message: {
                subject: `${options.inviterName} invited you to merge family trees on DengiTree`,
                html: `
        <p>Hi ${escapeHtml(greeting)},</p>
        <p><strong>${escapeHtml(options.inviterName)}</strong> added you to their family tree as their <strong>${escapeHtml(options.roleLabel)}</strong>.</p>
        <p>You already have a family tree on DengiTree. You can <strong>merge</strong> your tree into theirs so everyone appears on one shared tree.</p>
        ${extra}
        <p><a href="${options.joinUrl}">Review invitation</a></p>
        <p>After signing in, open <strong>Invitations → Received</strong> to accept or decline the merge.</p>
        <p>If the button does not work, copy this link:<br>${options.joinUrl}</p>
        <p>— DengiTree</p>
      `.trim(),
            },
        });
    }
    return { offered: true, notice: resolved.notice };
}
/** @deprecated use offerTreeMergeForInvitation */
async function maybeCreateTreeMergeRequest(options) {
    const result = await offerTreeMergeForInvitation(options);
    return result.offered;
}
function remapId(idMap, oldId) {
    if (!oldId)
        return null;
    const trimmed = String(oldId).trim();
    if (!trimmed)
        return null;
    return idMap.get(trimmed) ?? null;
}
function stripMergeMeta(data) {
    const { mergedFromUid, mergedFromToken, ...rest } = data;
    return rest;
}
async function copyInviteeTreeIntoInviter(inviterUid, inviteeUid, invitationToken) {
    const inviteeUserSnap = await db().collection('users').doc(inviteeUid).get();
    const inviteeUser = inviteeUserSnap.data() ?? {};
    const skipMemberIds = new Set();
    for (const key of ['inviteToken', 'claimedInviteToken']) {
        const id = String(inviteeUser[key] ?? '').trim();
        if (id)
            skipMemberIds.add(id);
    }
    const [inviteeInvitesSnap, inviteeMembersSnap, inviterInvitesSnap] = await Promise.all([
        db().collection('invitations').where('inviterUid', '==', inviteeUid).get(),
        db().collection('users').doc(inviteeUid).collection('familyMembers').get(),
        db().collection('invitations').where('inviterUid', '==', inviterUid).get(),
    ]);
    const inviterJoinedUids = new Set();
    for (const doc of inviterInvitesSnap.docs) {
        const joined = String(doc.data().joinedUid ?? '').trim();
        if (joined)
            inviterJoinedUids.add(joined);
    }
    const idMap = new Map();
    for (const doc of inviteeInvitesSnap.docs) {
        if (skipMemberIds.has(doc.id))
            continue;
        const joinedUid = String(doc.data().joinedUid ?? '').trim();
        if (joinedUid === inviteeUid)
            continue;
        if (joinedUid && inviterJoinedUids.has(joinedUid))
            continue;
        if (!idMap.has(doc.id))
            idMap.set(doc.id, newToken());
    }
    for (const doc of inviteeMembersSnap.docs) {
        if (skipMemberIds.has(doc.id))
            continue;
        if (!idMap.has(doc.id))
            idMap.set(doc.id, newToken());
    }
    if (idMap.size === 0)
        return 0;
    let batch = db().batch();
    let ops = 0;
    const batches = [];
    const queue = (fn) => {
        fn();
        ops++;
        if (ops >= 400) {
            batches.push(batch);
            batch = db().batch();
            ops = 0;
        }
    };
    for (const doc of inviteeInvitesSnap.docs) {
        if (!idMap.has(doc.id))
            continue;
        const newId = idMap.get(doc.id);
        const data = doc.data();
        const joinedUid = String(data.joinedUid ?? '').trim();
        if (joinedUid === inviteeUid)
            continue;
        if (joinedUid && inviterJoinedUids.has(joinedUid))
            continue;
        queue(() => batch.set(db().collection('invitations').doc(newId), {
            ...data,
            token: newId,
            inviterUid: inviterUid,
            sharedFatherMemberId: remapId(idMap, data.sharedFatherMemberId),
            sharedMotherMemberId: remapId(idMap, data.sharedMotherMemberId),
            mergedFromUid: inviteeUid,
            mergedFromToken: doc.id,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }));
    }
    for (const doc of inviteeMembersSnap.docs) {
        if (!idMap.has(doc.id))
            continue;
        const newId = idMap.get(doc.id);
        const data = doc.data();
        queue(() => batch.set(db().collection('users').doc(inviterUid).collection('familyMembers').doc(newId), {
            ...data,
            inviteToken: newId,
            sharedFatherMemberId: remapId(idMap, data.sharedFatherMemberId),
            sharedMotherMemberId: remapId(idMap, data.sharedMotherMemberId),
            mergedFromUid: inviteeUid,
            mergedFromToken: doc.id,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }));
    }
    const inviterUserPatch = {};
    const fatherId = String(inviteeUser.treeFatherMemberId ?? '').trim();
    const motherId = String(inviteeUser.treeMotherMemberId ?? '').trim();
    if (fatherId && idMap.has(fatherId)) {
        inviterUserPatch.treeFatherMemberId = idMap.get(fatherId);
    }
    if (motherId && idMap.has(motherId)) {
        inviterUserPatch.treeMotherMemberId = idMap.get(motherId);
    }
    if (Object.keys(inviterUserPatch).length > 0) {
        queue(() => batch.set(db().collection('users').doc(inviterUid), inviterUserPatch, { merge: true }));
    }
    for (const doc of inviteeInvitesSnap.docs) {
        if (idMap.has(doc.id)) {
            queue(() => batch.delete(doc.ref));
        }
    }
    for (const doc of inviteeMembersSnap.docs) {
        if (idMap.has(doc.id)) {
            queue(() => batch.delete(doc.ref));
        }
    }
    queue(() => batch.set(db().collection('users').doc(inviteeUid), {
        treeMergedIntoUid: inviterUid,
        treeMergedAt: firestore_1.FieldValue.serverTimestamp(),
        treeMergeInvitationToken: invitationToken,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true }));
    batches.push(batch);
    for (const b of batches) {
        await b.commit();
    }
    return idMap.size;
}
async function callerEmail(uid, token) {
    const fromToken = typeof token?.email === 'string' ? token.email.trim().toLowerCase() : '';
    if (fromToken)
        return fromToken;
    const snap = await db().collection('users').doc(uid).get();
    return normalizeEmail(snap.data()?.email);
}
exports.acceptTreeMerge = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to accept this merge request.');
    }
    const token = String(request.data?.token ?? '').trim();
    if (!token) {
        throw new https_1.HttpsError('invalid-argument', 'Missing invitation token.');
    }
    const uid = request.auth.uid;
    const userEmail = await callerEmail(uid, request.auth.token);
    const mergeRef = mergeRequestRef(token);
    const inviteRef = db().collection('invitations').doc(token);
    let inviterUid = '';
    let copiedCount = 0;
    await db().runTransaction(async (tx) => {
        const mergeSnap = await tx.get(mergeRef);
        if (!mergeSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Merge request not found.');
        }
        const merge = mergeSnap.data();
        if (merge.status !== 'pending') {
            throw new https_1.HttpsError('failed-precondition', 'This merge request is no longer pending.');
        }
        if (String(merge.inviteeUid ?? '') !== uid) {
            throw new https_1.HttpsError('permission-denied', 'This merge request is for another account.');
        }
        const inviteeEmail = normalizeEmail(merge.inviteeEmail);
        if (inviteeEmail && userEmail && inviteeEmail !== userEmail) {
            throw new https_1.HttpsError('permission-denied', 'Sign in with the email address this invitation was sent to.');
        }
        const inviteSnap = await tx.get(inviteRef);
        if (!inviteSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Invitation not found.');
        }
        inviterUid = String(inviteSnap.data()?.inviterUid ?? '').trim();
        if (!inviterUid) {
            throw new https_1.HttpsError('failed-precondition', 'Invalid invitation.');
        }
        tx.update(mergeRef, {
            status: 'accepted',
            respondedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    copiedCount = await copyInviteeTreeIntoInviter(inviterUid, uid, token);
    await (0, inviteAccept_1.completeInvitationAccept)({
        token,
        joinedUid: uid,
        userEmail,
        forceAnchor: true,
    });
    await db()
        .collection('invitations')
        .doc(token)
        .set({
        treesMerged: true,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { ok: true, copiedCount, inviterUid };
});
exports.declineTreeMerge = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to decline this merge request.');
    }
    const token = String(request.data?.token ?? '').trim();
    if (!token) {
        throw new https_1.HttpsError('invalid-argument', 'Missing invitation token.');
    }
    const uid = request.auth.uid;
    const mergeRef = mergeRequestRef(token);
    await db().runTransaction(async (tx) => {
        const mergeSnap = await tx.get(mergeRef);
        if (!mergeSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Merge request not found.');
        }
        const merge = mergeSnap.data();
        if (String(merge.inviteeUid ?? '') !== uid) {
            throw new https_1.HttpsError('permission-denied', 'This merge request is for another account.');
        }
        if (merge.status !== 'pending')
            return;
        tx.update(mergeRef, {
            status: 'declined',
            respondedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    return { ok: true };
});
function remapIdBack(inviterToInvitee, id) {
    if (!id)
        return null;
    const trimmed = String(id).trim();
    if (!trimmed)
        return null;
    return inviterToInvitee.get(trimmed) ?? trimmed;
}
/** Restore invitee-owned relatives that were copied into the inviter's tree during merge. */
async function restoreInviteeTreeFromInviter(inviterUid, inviteeUid) {
    const [inviterInvitesSnap, inviterMembersSnap, inviterUserSnap] = await Promise.all([
        db().collection('invitations').where('inviterUid', '==', inviterUid).get(),
        db().collection('users').doc(inviterUid).collection('familyMembers').get(),
        db().collection('users').doc(inviterUid).get(),
    ]);
    const inviterToInvitee = new Map();
    const mergedInviteDocs = [];
    const mergedMemberDocs = [];
    for (const doc of inviterInvitesSnap.docs) {
        const data = doc.data();
        if (String(data.mergedFromUid ?? '') !== inviteeUid)
            continue;
        const originalToken = String(data.mergedFromToken ?? '').trim();
        if (!originalToken)
            continue;
        inviterToInvitee.set(doc.id, originalToken);
        mergedInviteDocs.push(doc);
    }
    for (const doc of inviterMembersSnap.docs) {
        const data = doc.data();
        if (String(data.mergedFromUid ?? '') !== inviteeUid)
            continue;
        const originalToken = String(data.mergedFromToken ?? '').trim();
        if (!originalToken)
            continue;
        inviterToInvitee.set(doc.id, originalToken);
        mergedMemberDocs.push(doc);
    }
    if (inviterToInvitee.size === 0)
        return 0;
    const removedInviterIds = new Set(inviterToInvitee.keys());
    const inviterUser = inviterUserSnap.data() ?? {};
    const inviterProfilePatch = {};
    for (const key of ['treeFatherMemberId', 'treeMotherMemberId']) {
        const id = String(inviterUser[key] ?? '').trim();
        if (id && removedInviterIds.has(id)) {
            inviterProfilePatch[key] = firestore_1.FieldValue.delete();
        }
    }
    let batch = db().batch();
    let ops = 0;
    const batches = [];
    const queue = (fn) => {
        fn();
        ops++;
        if (ops >= 400) {
            batches.push(batch);
            batch = db().batch();
            ops = 0;
        }
    };
    for (const doc of mergedInviteDocs) {
        const originalToken = inviterToInvitee.get(doc.id);
        const data = stripMergeMeta(doc.data());
        queue(() => batch.set(db().collection('invitations').doc(originalToken), {
            ...data,
            token: originalToken,
            inviterUid: inviteeUid,
            sharedFatherMemberId: remapIdBack(inviterToInvitee, data.sharedFatherMemberId),
            sharedMotherMemberId: remapIdBack(inviterToInvitee, data.sharedMotherMemberId),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }));
        queue(() => batch.delete(doc.ref));
    }
    for (const doc of mergedMemberDocs) {
        const originalToken = inviterToInvitee.get(doc.id);
        const data = stripMergeMeta(doc.data());
        queue(() => batch.set(db().collection('users').doc(inviteeUid).collection('familyMembers').doc(originalToken), {
            ...data,
            inviteToken: originalToken,
            sharedFatherMemberId: remapIdBack(inviterToInvitee, data.sharedFatherMemberId),
            sharedMotherMemberId: remapIdBack(inviterToInvitee, data.sharedMotherMemberId),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }));
        queue(() => batch.delete(doc.ref));
    }
    if (Object.keys(inviterProfilePatch).length > 0) {
        queue(() => batch.set(db().collection('users').doc(inviterUid), inviterProfilePatch, { merge: true }));
    }
    queue(() => batch.set(db().collection('users').doc(inviteeUid), {
        treeMergedIntoUid: firestore_1.FieldValue.delete(),
        treeMergedAt: firestore_1.FieldValue.delete(),
        treeMergeInvitationToken: firestore_1.FieldValue.delete(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true }));
    batches.push(batch);
    for (const b of batches) {
        await b.commit();
    }
    return inviterToInvitee.size;
}
exports.unmergeFamilyTrees = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to unmerge family trees.');
    }
    const token = String(request.data?.token ?? '').trim();
    if (!token) {
        throw new https_1.HttpsError('invalid-argument', 'Missing invitation token.');
    }
    const uid = request.auth.uid;
    const mergeRef = mergeRequestRef(token);
    const mergeSnap = await mergeRef.get();
    if (!mergeSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Merge request not found.');
    }
    const merge = mergeSnap.data();
    if (merge.status !== 'accepted') {
        throw new https_1.HttpsError('failed-precondition', 'These trees are not merged, or the merge was already undone.');
    }
    const inviterUid = String(merge.inviterUid ?? '').trim();
    const inviteeUid = String(merge.inviteeUid ?? '').trim();
    if (!inviterUid || !inviteeUid) {
        throw new https_1.HttpsError('failed-precondition', 'Invalid merge record.');
    }
    if (uid !== inviterUid && uid !== inviteeUid) {
        throw new https_1.HttpsError('permission-denied', 'You cannot unmerge this family tree.');
    }
    const inviteeUserSnap = await db().collection('users').doc(inviteeUid).get();
    const mergedInto = String(inviteeUserSnap.data()?.treeMergedIntoUid ?? '').trim();
    if (mergedInto && mergedInto !== inviterUid) {
        throw new https_1.HttpsError('failed-precondition', 'This account is linked to a different merged tree.');
    }
    const restoredCount = await restoreInviteeTreeFromInviter(inviterUid, inviteeUid);
    await mergeRef.set({
        status: 'undone',
        undoneAt: firestore_1.FieldValue.serverTimestamp(),
        undoneByUid: uid,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    await db()
        .collection('invitations')
        .doc(token)
        .set({
        treesMerged: firestore_1.FieldValue.delete(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { ok: true, restoredCount, inviterUid, inviteeUid };
});
function mergeReviewUrl(invitationToken) {
    return `${APP_ORIGIN}/join/${invitationToken}`;
}
/** Backfill merge offers for family invites that pre-date merge support or missed detection. */
exports.syncTreeMergeOffers = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to sync tree merge offers.');
    }
    const uid = request.auth.uid;
    const userEmail = await callerEmail(uid, request.auth.token);
    let created = 0;
    async function ensureOffer(token, inviterUid, inviterName, inviteeEmail, role, personalMessage) {
        const mergeSnap = await mergeRequestRef(token).get();
        const status = String(mergeSnap.data()?.status ?? '');
        if (status === 'accepted' || status === 'pending')
            return;
        const result = await offerTreeMergeForInvitation({
            invitationToken: token,
            inviterUid,
            inviterName,
            inviteeEmail,
            roleLabel: mergeRoleLabel(role),
            joinUrl: `${APP_ORIGIN}/join/${token}`,
            personalMessage: personalMessage ? String(personalMessage) : null,
            sendEmail: false,
        });
        if (result.offered)
            created++;
    }
    const sentSnap = await db()
        .collection('invitations')
        .where('inviterUid', '==', uid)
        .get();
    for (const doc of sentSnap.docs) {
        const data = doc.data();
        if (data.role === 'member')
            continue;
        if (data.memberStatus === 'deceased')
            continue;
        const email = normalizeEmail(data.inviteeEmail);
        if (!email)
            continue;
        try {
            await ensureOffer(doc.id, uid, String(data.inviterName ?? 'A family member'), email, data.role, data.personalMessage);
        }
        catch (err) {
            console.warn('syncTreeMergeOffers: skip invite', doc.id, err);
        }
    }
    if (userEmail) {
        const receivedSnap = await db()
            .collection('invitations')
            .where('inviteeEmail', '==', userEmail)
            .get();
        for (const doc of receivedSnap.docs) {
            const data = doc.data();
            if (data.role === 'member')
                continue;
            if (data.memberStatus === 'deceased')
                continue;
            const inviterUid = String(data.inviterUid ?? '').trim();
            if (!inviterUid || inviterUid === uid)
                continue;
            const email = normalizeEmail(data.inviteeEmail);
            if (!email)
                continue;
            try {
                await ensureOffer(doc.id, inviterUid, String(data.inviterName ?? 'A family member'), email, data.role, data.personalMessage);
            }
            catch (err) {
                console.warn('syncTreeMergeOffers: skip received invite', doc.id, err);
            }
        }
    }
    return { created };
});
//# sourceMappingURL=treeMerge.js.map