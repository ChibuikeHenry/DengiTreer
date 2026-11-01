"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disableTreeShareLink = exports.ensureTreeShareLink = void 0;
const crypto_1 = require("crypto");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const db = (0, firestore_1.getFirestore)();
const APP_ORIGIN = process.env.APP_ORIGIN ?? 'https://dengitree.web.app';
const TREE_ROLES = new Set([
    'spouse',
    'parent',
    'grandparent',
    'great-grandparent',
    'child',
    'sibling',
]);
function newShareToken() {
    return (0, crypto_1.randomBytes)(9).toString('hex');
}
function parseMemberPrivacy(value) {
    const v = String(value ?? '').trim();
    if (v === 'family_members' ||
        v === 'immediate_family' ||
        v === 'only_me' ||
        v === 'network') {
        return v;
    }
    return 'family_members';
}
function profileFullName(data) {
    return [data.firstName, data.middleName, data.lastName]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join(' ');
}
function redactForPublicShare(privacy, fields) {
    if (privacy === 'only_me') {
        return {
            displayName: fields.displayName.trim() || 'Family member',
            photoURL: null,
            bio: '',
            dateOfBirth: null,
            dateOfDeath: null,
        };
    }
    return fields;
}
async function buildPublicTreeSnapshot(ownerUid) {
    const userSnap = await db.collection('users').doc(ownerUid).get();
    if (!userSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Profile not found.');
    }
    const user = userSnap.data() ?? {};
    const centerPrivacy = parseMemberPrivacy(user.profilePrivacy ?? user.defaultMemberPrivacy);
    const centerName = profileFullName(user) || 'Family member';
    const centerRedacted = redactForPublicShare(centerPrivacy, {
        displayName: centerName,
        photoURL: String(user.photoURL ?? '').trim() || null,
        bio: String(user.bio ?? '').trim(),
        dateOfBirth: String(user.dateOfBirth ?? '').trim() || null,
        dateOfDeath: null,
    });
    const selfMemberIds = [
        String(user.claimedInviteToken ?? '').trim(),
        String(user.inviteToken ?? '').trim(),
    ].filter(Boolean);
    const invitesSnap = await db
        .collection('invitations')
        .where('inviterUid', '==', ownerUid)
        .get();
    const members = [];
    for (const doc of invitesSnap.docs) {
        const data = doc.data();
        const role = String(data.role ?? '');
        if (!TREE_ROLES.has(role))
            continue;
        const firstName = String(data.inviteeFirstName ?? '').trim();
        const lastName = String(data.inviteeLastName ?? '').trim();
        const inviteeName = String(data.inviteeName ?? '').trim();
        const displayName = inviteeName || [firstName, lastName].filter(Boolean).join(' ') || 'Family member';
        const privacy = parseMemberPrivacy(data.privacy);
        const redacted = redactForPublicShare(privacy, {
            displayName,
            photoURL: String(data.photoURL ?? '').trim() || null,
            bio: String(data.bio ?? '').trim(),
            dateOfBirth: String(data.dateOfBirth ?? '').trim() || null,
            dateOfDeath: String(data.dateOfDeath ?? '').trim() || null,
        });
        members.push({
            id: doc.id,
            firstName: firstName || displayName.split(/\s+/)[0] || '',
            lastName: lastName || displayName.split(/\s+/).slice(-1)[0] || '',
            displayName: redacted.displayName,
            role,
            memberStatus: data.memberStatus === 'deceased' ? 'deceased' : 'living',
            photoURL: redacted.photoURL,
            bio: redacted.bio,
            parentSlot: data.parentSlot ? String(data.parentSlot) : null,
            parentKind: data.parentKind ? String(data.parentKind) : null,
            lineageSide: data.lineageSide ? String(data.lineageSide) : null,
            sharedFatherMemberId: data.sharedFatherMemberId
                ? String(data.sharedFatherMemberId)
                : null,
            sharedMotherMemberId: data.sharedMotherMemberId
                ? String(data.sharedMotherMemberId)
                : null,
            siblingRelationship: data.siblingRelationship
                ? String(data.siblingRelationship)
                : null,
            dateOfBirth: redacted.dateOfBirth,
            dateOfDeath: redacted.dateOfDeath,
            gender: data.gender ? String(data.gender) : null,
        });
    }
    const familyRole = String(user.familyRole ?? '').trim();
    const positionLabel = familyRole && familyRole !== 'member'
        ? familyRole.charAt(0).toUpperCase() + familyRole.slice(1).replace(/-/g, ' ')
        : null;
    return {
        ownerUid,
        ownerDisplayName: centerName,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        center: {
            displayName: centerRedacted.displayName,
            photoURL: centerRedacted.photoURL,
            bio: centerRedacted.bio,
            gender: String(user.gender ?? '').trim() || null,
            dateOfBirth: centerRedacted.dateOfBirth,
            positionLabel,
            treeFatherMemberId: String(user.treeFatherMemberId ?? '').trim() || null,
            treeMotherMemberId: String(user.treeMotherMemberId ?? '').trim() || null,
            selfMemberIds: [...new Set(selfMemberIds)],
        },
        members,
    };
}
exports.ensureTreeShareLink = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to share your tree.');
    }
    const uid = request.auth.uid;
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Profile not found.');
    }
    const existingToken = String(userSnap.data()?.treeShareToken ?? '').trim();
    let token = existingToken;
    if (!token) {
        token = newShareToken();
        await userRef.set({ treeShareToken: token }, { merge: true });
    }
    const snapshot = await buildPublicTreeSnapshot(uid);
    const shareRef = db.collection('treePublicShares').doc(token);
    await shareRef.set({
        ...snapshot,
        token,
        enabled: true,
    });
    const viewUrl = `${APP_ORIGIN.replace(/\/$/, '')}/tree/${token}`;
    return {
        token,
        viewUrl,
        ownerDisplayName: snapshot.ownerDisplayName,
    };
});
exports.disableTreeShareLink = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to manage your share link.');
    }
    const uid = request.auth.uid;
    const userSnap = await db.collection('users').doc(uid).get();
    const token = String(userSnap.data()?.treeShareToken ?? '').trim();
    if (!token) {
        return { ok: true };
    }
    const shareRef = db.collection('treePublicShares').doc(token);
    const shareSnap = await shareRef.get();
    if (shareSnap.exists && shareSnap.data()?.ownerUid === uid) {
        await shareRef.set({ enabled: false, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
    }
    return { ok: true };
});
//# sourceMappingURL=treePublicShare.js.map