"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unmergeFamilyTrees = exports.syncTreeMergeOffers = exports.getTreeMergeRequest = exports.getMergeRequesterFamily = exports.declineTreeMerge = exports.checkInviteeEmailForMerge = exports.acceptTreeMerge = exports.verifyPremiumPayment = exports.initializePremiumPayment = exports.submitTreeMergeRequest = exports.updateFamilyMemberPrivacy = exports.claimPendingInvitationsForEmail = exports.removeFamilyMemberFromTree = exports.updatePendingFamilyMemberProfile = exports.acceptInvitation = exports.getInvitationByToken = exports.sendShareInviteEmail = exports.createShareInvite = exports.createFamilyMemberInvite = void 0;
const crypto_1 = require("crypto");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const inviteAccept_1 = require("./inviteAccept");
const treeMerge_1 = require("./treeMerge");
(0, app_1.initializeApp)();
(0, v2_1.setGlobalOptions)({ region: 'us-central1' });
const db = (0, firestore_1.getFirestore)();
const APP_ORIGIN = process.env.APP_ORIGIN ?? 'https://dengitree.web.app';
function parseParentKind(value) {
    const v = String(value ?? '').trim();
    if (v === 'step' || v === 'adoptive' || v === 'biological')
        return v;
    return 'biological';
}
function isPrimaryParentKind(kind) {
    return kind !== 'step';
}
function primaryParentSlotTaken(members, slot, exceptToken) {
    if (!slot || slot === 'unknown')
        return false;
    return members.some((doc) => {
        if (exceptToken && doc.id === exceptToken)
            return false;
        const data = doc.data();
        if (data.role !== 'parent')
            return false;
        const memberSlot = parseParentSlot(data.parentSlot);
        const memberKind = parseParentKind(data.parentKind);
        return memberSlot === slot && isPrimaryParentKind(memberKind);
    });
}
function primaryParentSlotError(slot) {
    if (slot === 'father') {
        return 'You already have a father on your tree. Add a step-father instead, or edit the existing person.';
    }
    if (slot === 'mother') {
        return 'You already have a mother on your tree. Add a step-mother instead, or edit the existing person.';
    }
    return 'That parent slot is already filled on your tree.';
}
function grandparentSlotsConflict(aSide, aSlot, bSide, bSlot) {
    if (!aSlot || !bSlot || aSlot === 'unknown' || bSlot === 'unknown')
        return false;
    if (aSlot !== bSlot)
        return false;
    if (aSide === bSide)
        return true;
    if (aSide === null || bSide === null)
        return true;
    return false;
}
function grandparentSlotTaken(members, lineageSide, parentSlot, exceptToken) {
    if (!parentSlot || parentSlot === 'unknown')
        return false;
    return members.some((doc) => {
        if (exceptToken && doc.id === exceptToken)
            return false;
        const data = doc.data();
        if (data.role !== 'grandparent')
            return false;
        if (parseParentKind(data.parentKind) === 'step')
            return false;
        return grandparentSlotsConflict(lineageSide, parentSlot, parseLineageSide(data.lineageSide), parseParentSlot(data.parentSlot));
    });
}
function grandparentSlotError(lineageSide, parentSlot) {
    const side = lineageSide === 'maternal'
        ? "Mother's"
        : lineageSide === 'paternal'
            ? "Father's"
            : '';
    const rel = parentSlot === 'father' ? 'father' : 'mother';
    const label = side ? `${side} ${rel}` : `Grand${rel === 'father' ? 'father' : 'mother'}`;
    return `You already have ${label} on your tree. Edit the existing person instead of adding another.`;
}
function parseLineageSide(value) {
    const v = String(value ?? '').trim();
    if (v === 'paternal' || v === 'maternal')
        return v;
    return null;
}
function parseParentSlot(value) {
    const v = String(value ?? '').trim();
    if (v === 'father' || v === 'mother' || v === 'unknown')
        return v;
    return null;
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
function roleLabel(role) {
    const map = {
        spouse: 'Spouse',
        parent: 'Parent',
        grandparent: 'Grandparent',
        'great-grandparent': 'Great-grandparent',
        child: 'Child',
        sibling: 'Sibling',
        member: 'Family Member',
    };
    return map[role] ?? 'Family Member';
}
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function newToken() {
    return (0, crypto_1.randomBytes)(6).toString('hex');
}
/** Returns a normalized email or null when blank / not a plausible address. */
function normalizeInviteeEmail(raw) {
    const trimmed = String(raw ?? '').trim().toLowerCase();
    if (!trimmed)
        return null;
    const at = trimmed.indexOf('@');
    if (at <= 0 || at >= trimmed.length - 1)
        return null;
    const domain = trimmed.slice(at + 1);
    if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.'))
        return null;
    return trimmed;
}
async function queueInviteEmail(options) {
    const recipient = normalizeInviteeEmail(options.to);
    if (!recipient)
        return;
    const roleText = roleLabel(options.role);
    const greeting = options.inviteeFirstName
        ? escapeHtml(options.inviteeFirstName)
        : 'there';
    const extra = options.personalMessage
        ? `<p><em>${escapeHtml(options.personalMessage)}</em></p>`
        : '';
    await db.collection('mail').add({
        to: recipient,
        message: {
            subject: `${options.inviterName} invited you to DengiTree as their ${roleText}`,
            html: `
        <p>Hi ${greeting},</p>
        <p><strong>${escapeHtml(options.inviterName)}</strong> added you to their family tree on DengiTree as their <strong>${roleText}</strong>.</p>
        ${extra}
        <p><a href="${options.joinUrl}">Accept invitation and join DengiTree</a></p>
        <p>If the button does not work, copy this link:<br>${options.joinUrl}</p>
        <p>— DengiTree</p>
      `.trim(),
        },
    });
}
async function queueShareInviteEmail(options) {
    const recipient = normalizeInviteeEmail(options.to);
    if (!recipient) {
        throw new https_1.HttpsError('invalid-argument', 'Enter a valid email address.');
    }
    const bodyHtml = escapeHtml(options.personalMessage).replace(/\n/g, '<br>');
    await db.collection('mail').add({
        to: recipient,
        message: {
            subject: `${options.inviterName} invited you to join DengiTree`,
            html: `
        <p>${bodyHtml}</p>
        <p><a href="${options.joinUrl}">Join DengiTree</a></p>
        <p>If the button does not work, copy this link:<br>${options.joinUrl}</p>
        <p>— DengiTree</p>
      `.trim(),
        },
    });
}
async function createInvitationRecord(uid, authToken, data, options) {
    const role = data.role;
    if (!role ||
        !['spouse', 'parent', 'grandparent', 'great-grandparent', 'child', 'sibling', 'member'].includes(role)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid invitation role.');
    }
    const firstName = String(data.firstName ?? '').trim();
    const lastName = String(data.lastName ?? '').trim();
    const middleName = String(data.middleName ?? '').trim();
    const inviteeName = [firstName, middleName, lastName].filter(Boolean).join(' ');
    const memberStatus = data.memberStatus === 'deceased' ? 'deceased' : 'living';
    const inviteeEmail = normalizeInviteeEmail(data.inviteeEmail);
    const privacy = parseMemberPrivacy(data.privacy);
    const bio = String(data.bio ?? '').trim();
    const dateOfBirth = String(data.dateOfBirth ?? '').trim() || null;
    const dateOfDeath = String(data.dateOfDeath ?? '').trim() || null;
    const parentSlot = role === 'parent' || role === 'grandparent' || role === 'great-grandparent'
        ? parseParentSlot(data.parentSlot)
        : null;
    const parentKind = role === 'parent' ? parseParentKind(data.parentKind) : null;
    const lineageSide = role === 'grandparent' || role === 'great-grandparent'
        ? parseLineageSide(data.lineageSide)
        : null;
    const sharedFatherMemberId = role === 'sibling' || role === 'child'
        ? String(data.sharedFatherMemberId ?? '').trim() || null
        : null;
    const sharedMotherMemberId = role === 'sibling' || role === 'child'
        ? String(data.sharedMotherMemberId ?? '').trim() || null
        : null;
    const siblingRelationship = role === 'sibling' && data.siblingRelationship
        ? String(data.siblingRelationship).trim()
        : null;
    const inviterName = (typeof authToken.name === 'string' && authToken.name) ||
        (typeof authToken.email === 'string' && authToken.email) ||
        'A family member';
    const token = newToken();
    const joinUrl = `${APP_ORIGIN}/join/${token}`;
    const invitationPayload = {
        token,
        inviterUid: uid,
        inviterName,
        inviterEmail: typeof authToken.email === 'string' ? authToken.email.toLowerCase() : null,
        inviteeEmail: inviteeEmail || null,
        inviteeName: inviteeName || null,
        inviteeFirstName: firstName || null,
        inviteeMiddleName: middleName || null,
        inviteeLastName: lastName || null,
        role,
        status: 'pending',
        memberStatus,
        personalMessage: data.personalMessage?.trim() || null,
        photoURL: data.photoURL?.trim() || null,
        privacy,
        bio: bio || null,
        parentSlot,
        parentKind,
        lineageSide,
        sharedFatherMemberId,
        sharedMotherMemberId,
        siblingRelationship,
        dateOfBirth,
        dateOfDeath,
        gender: String(data.gender ?? '').trim() || null,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        joinedAt: null,
        joinedUid: null,
    };
    if (role === 'parent' &&
        parentSlot &&
        parentSlot !== 'unknown' &&
        parentKind &&
        isPrimaryParentKind(parentKind)) {
        const existingParents = await db
            .collection('users')
            .doc(uid)
            .collection('familyMembers')
            .where('role', '==', 'parent')
            .get();
        if (primaryParentSlotTaken(existingParents.docs, parentSlot)) {
            throw new https_1.HttpsError('failed-precondition', primaryParentSlotError(parentSlot));
        }
    }
    if (role === 'grandparent' && parentSlot && parentSlot !== 'unknown') {
        const existingGrandparents = await db
            .collection('users')
            .doc(uid)
            .collection('familyMembers')
            .where('role', '==', 'grandparent')
            .get();
        if (grandparentSlotTaken(existingGrandparents.docs, lineageSide, parentSlot)) {
            throw new https_1.HttpsError('failed-precondition', grandparentSlotError(lineageSide, parentSlot));
        }
    }
    await db.collection('invitations').doc(token).set(invitationPayload);
    if (role !== 'member') {
        await db
            .collection('users')
            .doc(uid)
            .collection('familyMembers')
            .doc(token)
            .set({
            inviteToken: token,
            firstName: firstName || null,
            middleName: middleName || null,
            lastName: lastName || null,
            displayName: inviteeName || null,
            role,
            memberStatus,
            photoURL: data.photoURL?.trim() || null,
            inviteeEmail: inviteeEmail || null,
            privacy,
            bio: bio || null,
            parentSlot,
            parentKind,
            lineageSide,
            sharedFatherMemberId,
            sharedMotherMemberId,
            siblingRelationship,
            dateOfBirth,
            dateOfDeath,
            gender: String(data.gender ?? '').trim() || null,
            claimedByUid: null,
            claimedAt: null,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    if (role === 'parent' &&
        parentSlot &&
        parentSlot !== 'unknown' &&
        parentKind &&
        isPrimaryParentKind(parentKind)) {
        const userParentPatch = {};
        if (parentSlot === 'father')
            userParentPatch.treeFatherMemberId = token;
        if (parentSlot === 'mother')
            userParentPatch.treeMotherMemberId = token;
        await db.collection('users').doc(uid).set(userParentPatch, { merge: true });
    }
    let treeMergeOffered = false;
    let mergeNotice = null;
    if (memberStatus === 'living' && inviteeEmail && !options?.skipAutoMerge) {
        const mergeResult = await (0, treeMerge_1.offerTreeMergeForInvitation)({
            invitationToken: token,
            inviterUid: uid,
            inviterName,
            inviteeEmail,
            roleLabel: roleLabel(role),
            joinUrl,
            personalMessage: data.personalMessage,
        });
        treeMergeOffered = mergeResult.offered;
        mergeNotice = mergeResult.notice;
        if (!mergeResult.offered) {
            await queueInviteEmail({
                to: inviteeEmail,
                inviterName,
                inviteeFirstName: firstName,
                role,
                joinUrl,
                personalMessage: data.personalMessage,
            });
        }
    }
    return { token, joinUrl, treeMergeOffered, mergeNotice };
}
exports.createFamilyMemberInvite = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to send invitations.');
    }
    const data = (request.data ?? {});
    const { skipAutoMerge, ...invite } = data;
    return createInvitationRecord(request.auth.uid, request.auth.token, invite, { skipAutoMerge: skipAutoMerge === true });
});
exports.createShareInvite = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to create an invite link.');
    }
    const data = (request.data ?? {});
    return createInvitationRecord(request.auth.uid, request.auth.token, {
        role: 'member',
        memberStatus: 'living',
        personalMessage: data.personalMessage,
    });
});
exports.sendShareInviteEmail = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to send invitations.');
    }
    const data = (request.data ?? {});
    const token = String(data.token ?? '').trim();
    const inviteeName = String(data.inviteeName ?? '').trim();
    const inviteeEmail = normalizeInviteeEmail(data.inviteeEmail);
    const personalMessage = String(data.personalMessage ?? '').trim();
    if (!token) {
        throw new https_1.HttpsError('invalid-argument', 'Missing invitation link.');
    }
    if (!inviteeName) {
        throw new https_1.HttpsError('invalid-argument', 'Enter the invitee’s name.');
    }
    if (!inviteeEmail) {
        throw new https_1.HttpsError('invalid-argument', 'Enter a valid email address.');
    }
    if (!personalMessage) {
        throw new https_1.HttpsError('invalid-argument', 'Add a message for your invitation.');
    }
    const ref = db.collection('invitations').doc(token);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new https_1.HttpsError('not-found', 'Invitation not found.');
    }
    const invitation = snap.data();
    if (invitation.inviterUid !== request.auth.uid) {
        throw new https_1.HttpsError('permission-denied', 'You cannot send this invitation.');
    }
    if (invitation.role !== 'member') {
        throw new https_1.HttpsError('invalid-argument', 'This invitation cannot be sent by email.');
    }
    const nameParts = inviteeName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.length > 1 ? (nameParts[nameParts.length - 1] ?? '') : '';
    const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
    const inviterName = invitation.inviterName ||
        (typeof request.auth.token.name === 'string' && request.auth.token.name) ||
        (typeof request.auth.token.email === 'string' && request.auth.token.email) ||
        'A family member';
    const joinUrl = `${APP_ORIGIN}/join/${token}`;
    await ref.update({
        inviteeEmail,
        inviteeName,
        inviteeFirstName: firstName || null,
        inviteeMiddleName: middleName || null,
        inviteeLastName: lastName || null,
        personalMessage,
    });
    await queueShareInviteEmail({
        to: inviteeEmail,
        inviterName,
        personalMessage,
        joinUrl,
    });
    return { ok: true };
});
exports.getInvitationByToken = (0, https_1.onCall)(async (request) => {
    const token = String(request.data?.token ?? '').trim();
    if (!token) {
        throw new https_1.HttpsError('invalid-argument', 'Missing invitation token.');
    }
    const snap = await db.collection('invitations').doc(token).get();
    if (!snap.exists) {
        throw new https_1.HttpsError('not-found', 'This invitation link is invalid or expired.');
    }
    const doc = snap.data();
    if (doc.status !== 'pending') {
        throw new https_1.HttpsError('failed-precondition', 'This invitation has already been used.');
    }
    return {
        token,
        inviteeName: doc.inviteeName,
        inviteeEmail: doc.inviteeEmail,
        role: doc.role,
        roleLabel: roleLabel(doc.role),
        inviterName: doc.inviterName,
        personalMessage: doc.personalMessage,
    };
});
const FAMILY_ROLE_RANK = {
    child: 0,
    spouse: 1,
    sibling: 2,
    parent: 3,
    grandparent: 4,
    'great-grandparent': 5,
    member: 6,
};
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
async function callerEmail(uid, token) {
    const fromToken = typeof token?.email === 'string' ? token.email.trim().toLowerCase() : '';
    if (fromToken)
        return fromToken;
    const snap = await db.collection('users').doc(uid).get();
    const fromProfile = String(snap.data()?.email ?? '')
        .trim()
        .toLowerCase();
    return fromProfile || null;
}
exports.acceptInvitation = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to accept this invitation.');
    }
    const token = String(request.data?.token ?? '').trim();
    if (!token) {
        throw new https_1.HttpsError('invalid-argument', 'Missing invitation token.');
    }
    const userEmail = await callerEmail(request.auth.uid, request.auth.token);
    const role = await (0, inviteAccept_1.completeInvitationAccept)({
        token,
        joinedUid: request.auth.uid,
        userEmail,
        forceAnchor: true,
    });
    return {
        ok: true,
        role,
        roleLabel: roleLabel(role),
        profileClaimed: true,
    };
});
function inviterSelfMemberIds(userData) {
    const ids = [];
    const inviteToken = String(userData?.inviteToken ?? '').trim();
    const claimed = String(userData?.claimedInviteToken ?? '').trim();
    if (inviteToken)
        ids.push(inviteToken);
    if (claimed)
        ids.push(claimed);
    return ids;
}
function assertChildCoParentId(allFamilyDocs, selfMemberIds, id, label) {
    if (!id)
        return;
    const onTree = allFamilyDocs.some((doc) => doc.id === id);
    const isSelf = selfMemberIds.includes(id);
    if (!onTree && !isSelf) {
        throw new https_1.HttpsError('invalid-argument', `${label} must be you or someone on your tree.`);
    }
}
function assertSiblingParentId(allFamilyDocs, id, label) {
    if (!id)
        return;
    const doc = allFamilyDocs.find((entry) => entry.id === id);
    if (!doc || doc.data().role !== 'parent') {
        throw new https_1.HttpsError('invalid-argument', `${label} must be a parent on your tree.`);
    }
}
exports.updatePendingFamilyMemberProfile = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to update this family member.');
    }
    const data = (request.data ?? {});
    const token = String(data.token ?? '').trim();
    if (!token) {
        throw new https_1.HttpsError('invalid-argument', 'Missing invitation token.');
    }
    const firstName = String(data.firstName ?? '').trim();
    const lastName = String(data.lastName ?? '').trim();
    const middleName = String(data.middleName ?? '').trim();
    if (!firstName || !lastName) {
        throw new https_1.HttpsError('invalid-argument', 'First and last name are required.');
    }
    const inviteeName = [firstName, middleName, lastName].filter(Boolean).join(' ');
    const photoURL = data.photoURL === null || data.photoURL === undefined
        ? undefined
        : String(data.photoURL).trim() || null;
    const bio = data.bio === undefined ? undefined : String(data.bio ?? '').trim() || null;
    const dateOfBirth = data.dateOfBirth === undefined ? undefined : String(data.dateOfBirth ?? '').trim() || null;
    const dateOfDeath = data.dateOfDeath === undefined ? undefined : String(data.dateOfDeath ?? '').trim() || null;
    const memberStatus = data.memberStatus === 'deceased' ? 'deceased' : 'living';
    const privacy = data.privacy ? parseMemberPrivacy(data.privacy) : undefined;
    const gender = data.gender === undefined ? undefined : String(data.gender ?? '').trim() || null;
    const ref = db.collection('invitations').doc(token);
    const uid = request.auth.uid;
    const emailOut = { payload: null };
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            throw new https_1.HttpsError('not-found', 'Invitation not found.');
        }
        const familyMemberRef = db
            .collection('users')
            .doc(uid)
            .collection('familyMembers')
            .doc(token);
        const familyMembersCol = db.collection('users').doc(uid).collection('familyMembers');
        const familySnap = await tx.get(familyMemberRef);
        const allFamilySnap = await tx.get(familyMembersCol);
        const inviterUserSnap = await tx.get(db.collection('users').doc(uid));
        const selfMemberIds = inviterSelfMemberIds(inviterUserSnap.data());
        const doc = snap.data();
        if (doc.inviterUid !== uid) {
            throw new https_1.HttpsError('permission-denied', 'You can only edit people you invited.');
        }
        if (doc.role === 'member') {
            throw new https_1.HttpsError('failed-precondition', 'This invite is only for joining DengiTree, not a family tree profile you can edit.');
        }
        if (doc.status !== 'pending' || doc.profileClaimed === true || doc.joinedUid != null) {
            throw new https_1.HttpsError('failed-precondition', 'This person has claimed their profile. You can no longer edit their details.');
        }
        const invitationUpdate = {
            inviteeFirstName: firstName,
            inviteeMiddleName: middleName || null,
            inviteeLastName: lastName,
            inviteeName: inviteeName,
            memberStatus,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        const previousEmail = normalizeInviteeEmail(doc.inviteeEmail);
        let newEmail = previousEmail;
        let emailJustAddedOrChanged = false;
        if (data.inviteeEmail !== undefined) {
            newEmail = normalizeInviteeEmail(data.inviteeEmail);
            invitationUpdate.inviteeEmail = newEmail;
            if (newEmail && newEmail !== previousEmail) {
                emailJustAddedOrChanged = true;
            }
        }
        if (photoURL !== undefined) {
            invitationUpdate.photoURL = photoURL;
        }
        if (bio !== undefined) {
            invitationUpdate.bio = bio;
        }
        if (dateOfBirth !== undefined) {
            invitationUpdate.dateOfBirth = dateOfBirth;
        }
        if (dateOfDeath !== undefined) {
            invitationUpdate.dateOfDeath = dateOfDeath;
        }
        if (privacy !== undefined) {
            invitationUpdate.privacy = privacy;
        }
        if (gender !== undefined) {
            invitationUpdate.gender = gender;
        }
        if (doc.role === 'parent') {
            if (data.parentKind !== undefined) {
                invitationUpdate.parentKind = parseParentKind(data.parentKind);
            }
            if (data.parentSlot !== undefined) {
                invitationUpdate.parentSlot = parseParentSlot(data.parentSlot);
            }
            const nextSlot = parseParentSlot(data.parentSlot !== undefined ? data.parentSlot : doc.parentSlot);
            const nextKind = parseParentKind(data.parentKind !== undefined ? data.parentKind : doc.parentKind);
            if (nextSlot &&
                nextSlot !== 'unknown' &&
                isPrimaryParentKind(nextKind) &&
                primaryParentSlotTaken(allFamilySnap.docs, nextSlot, token)) {
                throw new https_1.HttpsError('failed-precondition', primaryParentSlotError(nextSlot));
            }
        }
        if (doc.role === 'child' || doc.role === 'sibling') {
            if (data.sharedFatherMemberId !== undefined) {
                const fatherId = data.sharedFatherMemberId === null
                    ? null
                    : String(data.sharedFatherMemberId ?? '').trim() || null;
                if (doc.role === 'child') {
                    assertChildCoParentId(allFamilySnap.docs, selfMemberIds, fatherId, 'Father');
                }
                else {
                    assertSiblingParentId(allFamilySnap.docs, fatherId, 'Father');
                }
                invitationUpdate.sharedFatherMemberId = fatherId;
            }
            if (data.sharedMotherMemberId !== undefined) {
                const motherId = data.sharedMotherMemberId === null
                    ? null
                    : String(data.sharedMotherMemberId ?? '').trim() || null;
                if (doc.role === 'child') {
                    assertChildCoParentId(allFamilySnap.docs, selfMemberIds, motherId, 'Mother');
                }
                else {
                    assertSiblingParentId(allFamilySnap.docs, motherId, 'Mother');
                }
                invitationUpdate.sharedMotherMemberId = motherId;
            }
        }
        tx.update(ref, invitationUpdate);
        if (familySnap.exists) {
            const familyUpdate = {
                firstName,
                middleName: middleName || null,
                lastName,
                displayName: inviteeName,
                memberStatus,
            };
            if (data.inviteeEmail !== undefined) {
                familyUpdate.inviteeEmail = newEmail;
            }
            if (photoURL !== undefined) {
                familyUpdate.photoURL = photoURL;
            }
            if (bio !== undefined) {
                familyUpdate.bio = bio;
            }
            if (dateOfBirth !== undefined) {
                familyUpdate.dateOfBirth = dateOfBirth;
            }
            if (dateOfDeath !== undefined) {
                familyUpdate.dateOfDeath = dateOfDeath;
            }
            if (privacy !== undefined) {
                familyUpdate.privacy = privacy;
            }
            if (gender !== undefined) {
                familyUpdate.gender = gender;
            }
            if (doc.role === 'parent') {
                if (data.parentKind !== undefined) {
                    familyUpdate.parentKind = parseParentKind(data.parentKind);
                }
                if (data.parentSlot !== undefined) {
                    familyUpdate.parentSlot = parseParentSlot(data.parentSlot);
                }
            }
            if (doc.role === 'child' || doc.role === 'sibling') {
                if (data.sharedFatherMemberId !== undefined) {
                    familyUpdate.sharedFatherMemberId =
                        data.sharedFatherMemberId === null
                            ? null
                            : String(data.sharedFatherMemberId ?? '').trim() || null;
                }
                if (data.sharedMotherMemberId !== undefined) {
                    familyUpdate.sharedMotherMemberId =
                        data.sharedMotherMemberId === null
                            ? null
                            : String(data.sharedMotherMemberId ?? '').trim() || null;
                }
            }
            tx.update(familyMemberRef, familyUpdate);
        }
        if (emailJustAddedOrChanged && newEmail && memberStatus === 'living') {
            const joinUrl = `${APP_ORIGIN}/join/${token}`;
            emailOut.payload = {
                to: newEmail,
                inviterName: doc.inviterName || 'A family member',
                inviteeFirstName: firstName || doc.inviteeFirstName || '',
                role: doc.role,
                joinUrl,
                personalMessage: doc.personalMessage || null,
            };
        }
    });
    const emailToSend = emailOut.payload;
    let treeMergeOffered = false;
    let mergeNotice = null;
    if (emailToSend) {
        const mergeResult = await (0, treeMerge_1.offerTreeMergeForInvitation)({
            invitationToken: token,
            inviterUid: uid,
            inviterName: emailToSend.inviterName,
            inviteeEmail: emailToSend.to,
            roleLabel: roleLabel(emailToSend.role),
            joinUrl: emailToSend.joinUrl,
            personalMessage: emailToSend.personalMessage,
        });
        treeMergeOffered = mergeResult.offered;
        mergeNotice = mergeResult.notice;
        if (!mergeResult.offered) {
            await queueInviteEmail(emailToSend);
        }
    }
    else {
        const inviteSnap = await ref.get();
        const invite = inviteSnap.data();
        const existingEmail = normalizeInviteeEmail(invite?.inviteeEmail);
        if (existingEmail &&
            invite?.memberStatus !== 'deceased' &&
            invite?.status === 'pending' &&
            invite?.treeMergeOffered !== true) {
            const joinUrl = `${APP_ORIGIN}/join/${token}`;
            const mergeResult = await (0, treeMerge_1.offerTreeMergeForInvitation)({
                invitationToken: token,
                inviterUid: uid,
                inviterName: String(invite?.inviterName ?? 'A family member'),
                inviteeEmail: existingEmail,
                roleLabel: roleLabel(asInviteRole(invite?.role)),
                joinUrl,
                personalMessage: invite?.personalMessage ?? null,
                sendEmail: false,
            });
            treeMergeOffered = mergeResult.offered;
            mergeNotice = mergeResult.notice;
        }
    }
    return { ok: true, treeMergeOffered, mergeNotice };
});
exports.removeFamilyMemberFromTree = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to remove this family member.');
    }
    const token = String(request.data?.token ?? '').trim();
    if (!token) {
        throw new https_1.HttpsError('invalid-argument', 'Missing invitation token.');
    }
    const uid = request.auth.uid;
    const inviteRef = db.collection('invitations').doc(token);
    const familyMemberRef = db
        .collection('users')
        .doc(uid)
        .collection('familyMembers')
        .doc(token);
    const mergeRef = db.collection('treeMergeRequests').doc(token);
    await db.runTransaction(async (tx) => {
        const inviteSnap = await tx.get(inviteRef);
        if (!inviteSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Family member not found.');
        }
        const doc = inviteSnap.data();
        if (doc.inviterUid !== uid) {
            throw new https_1.HttpsError('permission-denied', 'You can only remove people you added to your tree.');
        }
        if (doc.role === 'member') {
            throw new https_1.HttpsError('failed-precondition', 'This is a platform invite, not a family tree member you can remove here.');
        }
        const joinedUid = doc.joinedUid != null ? String(doc.joinedUid).trim() : '';
        if (joinedUid && joinedUid === uid) {
            throw new https_1.HttpsError('failed-precondition', 'You cannot remove yourself from your tree.');
        }
        let inviteeUserSnap = null;
        if (joinedUid) {
            inviteeUserSnap = await tx.get(db.collection('users').doc(joinedUid));
        }
        tx.delete(inviteRef);
        tx.delete(familyMemberRef);
        tx.delete(mergeRef);
        if (inviteeUserSnap?.exists) {
            const invitee = inviteeUserSnap.data();
            const anchorToken = String(invitee.claimedInviteToken ?? invitee.inviteToken ?? '').trim();
            if (String(invitee.invitedByUid ?? '') === uid && anchorToken === token) {
                tx.update(inviteeUserSnap.ref, {
                    invitedByUid: firestore_1.FieldValue.delete(),
                    inviteToken: firestore_1.FieldValue.delete(),
                    claimedInviteToken: firestore_1.FieldValue.delete(),
                    familyRole: firestore_1.FieldValue.delete(),
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                });
            }
        }
    });
    return { ok: true };
});
exports.claimPendingInvitationsForEmail = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to claim invitations.');
    }
    const userEmail = await callerEmail(request.auth.uid, request.auth.token);
    if (!userEmail)
        return { claimedCount: 0 };
    const joinedUid = request.auth.uid;
    const snap = await db
        .collection('invitations')
        .where('inviteeEmail', '==', userEmail)
        .get();
    if (snap.empty)
        return { claimedCount: 0 };
    const pending = snap.docs.filter((docSnap) => {
        const data = docSnap.data();
        return data.status === 'pending' && data.profileClaimed !== true && data.joinedUid == null;
    });
    const alreadyMine = snap.docs.filter((docSnap) => docSnap.data().joinedUid === joinedUid);
    const byRole = (a, b) => FAMILY_ROLE_RANK[asInviteRole(a.data().role)] - FAMILY_ROLE_RANK[asInviteRole(b.data().role)];
    pending.sort(byRole);
    alreadyMine.sort(byRole);
    let count = 0;
    for (const docSnap of pending) {
        const claimed = await db.runTransaction(async (tx) => {
            const inviteSnap = await tx.get(docSnap.ref);
            if (!inviteSnap.exists)
                return false;
            const invite = inviteSnap.data();
            if (invite.status !== 'pending' || invite.profileClaimed === true || invite.joinedUid != null) {
                return false;
            }
            const token = docSnap.id;
            const role = asInviteRole(invite.role);
            const inviterUid = String(invite.inviterUid ?? '').trim();
            const userRef = db.collection('users').doc(joinedUid);
            const userSnap = await tx.get(userRef);
            const familyMemberRef = inviterUid && role !== 'member'
                ? db.collection('users').doc(inviterUid).collection('familyMembers').doc(token)
                : null;
            const familySnap = familyMemberRef ? await tx.get(familyMemberRef) : null;
            tx.update(docSnap.ref, {
                status: 'joined',
                joinedAt: firestore_1.FieldValue.serverTimestamp(),
                joinedUid,
                profileClaimed: true,
            });
            tx.set(userRef, (0, inviteAccept_1.buildClaimUserPatch)(userSnap.data(), invite, { token, forceAnchor: false }), { merge: true });
            if (familySnap?.exists && familyMemberRef) {
                tx.update(familyMemberRef, {
                    claimedByUid: joinedUid,
                    claimedAt: firestore_1.FieldValue.serverTimestamp(),
                });
            }
            return true;
        });
        if (claimed)
            count++;
    }
    if (alreadyMine.length > 0) {
        const best = alreadyMine[0];
        await db.runTransaction(async (tx) => {
            const userRef = db.collection('users').doc(joinedUid);
            const userSnap = await tx.get(userRef);
            if (String(userSnap.data()?.invitedByUid ?? '').trim())
                return;
            const inviteSnap = await tx.get(best.ref);
            if (!inviteSnap.exists)
                return;
            tx.set(userRef, (0, inviteAccept_1.buildClaimUserPatch)(userSnap.data(), inviteSnap.data(), {
                token: best.id,
                forceAnchor: false,
            }), { merge: true });
        });
    }
    return { claimedCount: count };
});
exports.updateFamilyMemberPrivacy = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to update privacy settings.');
    }
    const data = (request.data ?? {});
    const token = String(data.token ?? '').trim();
    if (!token) {
        throw new https_1.HttpsError('invalid-argument', 'Missing invitation token.');
    }
    const privacy = parseMemberPrivacy(data.privacy);
    const uid = request.auth.uid;
    const ref = db.collection('invitations').doc(token);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            throw new https_1.HttpsError('not-found', 'Invitation not found.');
        }
        const doc = snap.data();
        if (doc.inviterUid !== uid) {
            throw new https_1.HttpsError('permission-denied', 'You can only update people you added.');
        }
        const familyMemberRef = db
            .collection('users')
            .doc(uid)
            .collection('familyMembers')
            .doc(token);
        const familySnap = await tx.get(familyMemberRef);
        tx.update(ref, {
            privacy,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        if (familySnap.exists) {
            tx.update(familyMemberRef, { privacy });
        }
    });
    return { ok: true };
});
exports.submitTreeMergeRequest = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to send a merge request.');
    }
    const data = (request.data ?? {});
    const mergeMessage = String(data.mergeMessage ?? '').trim();
    const inviteeEmail = normalizeInviteeEmail(data.inviteeEmail);
    if (!inviteeEmail) {
        throw new https_1.HttpsError('invalid-argument', 'Email is required for a merge request.');
    }
    const uid = request.auth.uid;
    const inviterName = (typeof request.auth.token.name === 'string' && request.auth.token.name) ||
        (typeof request.auth.token.email === 'string' && request.auth.token.email) ||
        'A family member';
    const result = await createInvitationRecord(uid, request.auth.token, data, {
        skipAutoMerge: true,
    });
    await (0, treeMerge_1.offerTreeMergeForInvitation)({
        invitationToken: result.token,
        inviterUid: uid,
        inviterName,
        inviteeEmail,
        roleLabel: roleLabel(data.role ?? 'member'),
        joinUrl: result.joinUrl,
        personalMessage: data.personalMessage,
        mergeMessage: mergeMessage || null,
        sendEmail: true,
    });
    return { ok: true, token: result.token, joinUrl: result.joinUrl };
});
var premiumPayments_1 = require("./premiumPayments");
Object.defineProperty(exports, "initializePremiumPayment", { enumerable: true, get: function () { return premiumPayments_1.initializePremiumPayment; } });
Object.defineProperty(exports, "verifyPremiumPayment", { enumerable: true, get: function () { return premiumPayments_1.verifyPremiumPayment; } });
var treeMerge_2 = require("./treeMerge");
Object.defineProperty(exports, "acceptTreeMerge", { enumerable: true, get: function () { return treeMerge_2.acceptTreeMerge; } });
Object.defineProperty(exports, "checkInviteeEmailForMerge", { enumerable: true, get: function () { return treeMerge_2.checkInviteeEmailForMerge; } });
Object.defineProperty(exports, "declineTreeMerge", { enumerable: true, get: function () { return treeMerge_2.declineTreeMerge; } });
Object.defineProperty(exports, "getMergeRequesterFamily", { enumerable: true, get: function () { return treeMerge_2.getMergeRequesterFamily; } });
Object.defineProperty(exports, "getTreeMergeRequest", { enumerable: true, get: function () { return treeMerge_2.getTreeMergeRequest; } });
Object.defineProperty(exports, "syncTreeMergeOffers", { enumerable: true, get: function () { return treeMerge_2.syncTreeMergeOffers; } });
Object.defineProperty(exports, "unmergeFamilyTrees", { enumerable: true, get: function () { return treeMerge_2.unmergeFamilyTrees; } });
//# sourceMappingURL=index.js.map