"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildClaimUserPatch = buildClaimUserPatch;
exports.completeInvitationAccept = completeInvitationAccept;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
function db() {
    return (0, firestore_1.getFirestore)();
}
const MEMBER_PRIVACY_VALUES = new Set([
    'family_members',
    'immediate_family',
    'only_me',
    'network',
]);
function parseMemberPrivacy(value) {
    const normalized = String(value ?? '').trim();
    return MEMBER_PRIVACY_VALUES.has(normalized) ? normalized : 'family_members';
}
function asInviteRole(value) {
    const role = String(value ?? 'member');
    if (role === 'spouse' ||
        role === 'parent' ||
        role === 'grandparent' ||
        role === 'great-grandparent' ||
        role === 'child' ||
        role === 'sibling' ||
        role === 'member') {
        return role;
    }
    return 'member';
}
function buildClaimUserPatch(existing, invite, options) {
    const role = asInviteRole(invite.role);
    const inviterUid = String(invite.inviterUid ?? '').trim();
    const existingInviter = String(existing?.invitedByUid ?? '').trim();
    const setAnchor = Boolean(inviterUid) && (options.forceAnchor || !existingInviter);
    const patch = {
        profileClaimed: true,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    if (setAnchor) {
        patch.familyRole = role;
        patch.invitedByUid = inviterUid;
        patch.inviteToken = options.token;
        patch.claimedInviteToken = options.token;
        if (!String(existing?.profilePrivacy ?? '').trim()) {
            patch.profilePrivacy = parseMemberPrivacy(invite.privacy);
        }
    }
    const firstName = String(invite.inviteeFirstName ?? '').trim();
    const middleName = String(invite.inviteeMiddleName ?? '').trim();
    const lastName = String(invite.inviteeLastName ?? '').trim();
    const photoURL = String(invite.photoURL ?? '').trim();
    const bio = String(invite.bio ?? '').trim();
    const dateOfBirth = String(invite.dateOfBirth ?? '').trim();
    const email = String(invite.inviteeEmail ?? '').trim().toLowerCase();
    if (firstName && !String(existing?.firstName ?? '').trim())
        patch.firstName = firstName;
    if (middleName && !String(existing?.middleName ?? '').trim())
        patch.middleName = middleName;
    if (lastName && !String(existing?.lastName ?? '').trim())
        patch.lastName = lastName;
    if (photoURL && !String(existing?.photoURL ?? '').trim())
        patch.photoURL = photoURL;
    if (bio && !String(existing?.bio ?? '').trim())
        patch.bio = bio;
    if (dateOfBirth && !String(existing?.dateOfBirth ?? '').trim())
        patch.dateOfBirth = dateOfBirth;
    if (email && !String(existing?.email ?? '').trim())
        patch.email = email;
    return patch;
}
async function completeInvitationAccept(options) {
    const ref = db().collection('invitations').doc(options.token);
    let role = 'member';
    await db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            throw new https_1.HttpsError('not-found', 'Invitation not found.');
        }
        const invite = snap.data();
        const alreadyJoinedByMe = invite.status !== 'pending' && invite.joinedUid === options.joinedUid;
        if (invite.status !== 'pending' && !alreadyJoinedByMe) {
            throw new https_1.HttpsError('failed-precondition', 'Invitation already accepted.');
        }
        const inviteeEmail = String(invite.inviteeEmail ?? '')
            .trim()
            .toLowerCase();
        if (inviteeEmail && options.userEmail && options.userEmail !== inviteeEmail) {
            throw new https_1.HttpsError('permission-denied', 'Sign in with the email address this invitation was sent to.');
        }
        role = asInviteRole(invite.role);
        const inviterUid = String(invite.inviterUid ?? '').trim();
        const userRef = db().collection('users').doc(options.joinedUid);
        const userSnap = await tx.get(userRef);
        const familyMemberRef = inviterUid && role !== 'member'
            ? db().collection('users').doc(inviterUid).collection('familyMembers').doc(options.token)
            : null;
        const familySnap = familyMemberRef ? await tx.get(familyMemberRef) : null;
        const firstName = String(invite.inviteeFirstName ?? '').trim();
        const middleName = String(invite.inviteeMiddleName ?? '').trim();
        const lastName = String(invite.inviteeLastName ?? '').trim();
        const displayName = String(invite.inviteeName ?? '').trim() ||
            [firstName, middleName, lastName].filter(Boolean).join(' ');
        if (!alreadyJoinedByMe) {
            tx.update(ref, {
                status: 'joined',
                joinedAt: firestore_1.FieldValue.serverTimestamp(),
                joinedUid: options.joinedUid,
                profileClaimed: true,
            });
        }
        tx.set(userRef, buildClaimUserPatch(userSnap.data(), invite, {
            token: options.token,
            forceAnchor: options.forceAnchor,
        }), { merge: true });
        if (familySnap?.exists && familyMemberRef) {
            tx.update(familyMemberRef, {
                claimedByUid: options.joinedUid,
                claimedAt: firestore_1.FieldValue.serverTimestamp(),
                displayName: displayName || familySnap.data()?.displayName || null,
            });
        }
    });
    return role;
}
//# sourceMappingURL=inviteAccept.js.map