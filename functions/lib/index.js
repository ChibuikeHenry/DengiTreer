"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFamilyMemberPrivacy = exports.claimPendingInvitationsForEmail = exports.updatePendingFamilyMemberProfile = exports.acceptInvitation = exports.getInvitationByToken = exports.sendShareInviteEmail = exports.createShareInvite = exports.createFamilyMemberInvite = void 0;
const crypto_1 = require("crypto");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
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
async function queueInviteEmail(options) {
    const recipient = String(options.to ?? '').trim().toLowerCase();
    if (!recipient || !recipient.includes('@')) {
        return;
    }
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
    const recipient = String(options.to ?? '').trim().toLowerCase();
    if (!recipient || !recipient.includes('@')) {
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
async function createInvitationRecord(uid, authToken, data) {
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
    const rawEmail = String(data.inviteeEmail ?? '').trim().toLowerCase();
    const inviteeEmail = rawEmail && rawEmail.includes('@') ? rawEmail : null;
    const privacy = parseMemberPrivacy(data.privacy);
    const bio = String(data.bio ?? '').trim();
    const dateOfBirth = String(data.dateOfBirth ?? '').trim() || null;
    const dateOfDeath = String(data.dateOfDeath ?? '').trim() || null;
    const parentSlot = role === 'parent' || role === 'grandparent' || role === 'great-grandparent'
        ? parseParentSlot(data.parentSlot)
        : null;
    const parentKind = role === 'parent' ? parseParentKind(data.parentKind) : null;
    const sharedFatherMemberId = role === 'sibling' ? String(data.sharedFatherMemberId ?? '').trim() || null : null;
    const sharedMotherMemberId = role === 'sibling' ? String(data.sharedMotherMemberId ?? '').trim() || null : null;
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
    if (role === 'parent' && parentSlot && parentSlot !== 'unknown') {
        const userParentPatch = {};
        if (parentSlot === 'father')
            userParentPatch.treeFatherMemberId = token;
        if (parentSlot === 'mother')
            userParentPatch.treeMotherMemberId = token;
        await db.collection('users').doc(uid).set(userParentPatch, { merge: true });
    }
    if (memberStatus === 'living' && inviteeEmail) {
        await queueInviteEmail({
            to: inviteeEmail,
            inviterName,
            inviteeFirstName: firstName,
            role,
            joinUrl,
            personalMessage: data.personalMessage,
        });
    }
    return { token, joinUrl };
}
exports.createFamilyMemberInvite = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to send invitations.');
    }
    const data = (request.data ?? {});
    return createInvitationRecord(request.auth.uid, request.auth.token, data);
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
    const inviteeEmail = String(data.inviteeEmail ?? '').trim().toLowerCase();
    const personalMessage = String(data.personalMessage ?? '').trim();
    if (!token) {
        throw new https_1.HttpsError('invalid-argument', 'Missing invitation link.');
    }
    if (!inviteeName) {
        throw new https_1.HttpsError('invalid-argument', 'Enter the invitee’s name.');
    }
    if (!inviteeEmail.includes('@')) {
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
exports.acceptInvitation = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to accept this invitation.');
    }
    const token = String(request.data?.token ?? '').trim();
    if (!token) {
        throw new https_1.HttpsError('invalid-argument', 'Missing invitation token.');
    }
    const ref = db.collection('invitations').doc(token);
    const userEmail = await callerEmail(request.auth.uid, request.auth.token);
    const joinedUid = request.auth.uid;
    let role = 'member';
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            throw new https_1.HttpsError('not-found', 'Invitation not found.');
        }
        const invite = snap.data();
        const alreadyJoinedByMe = invite.status !== 'pending' && invite.joinedUid === joinedUid;
        if (invite.status !== 'pending' && !alreadyJoinedByMe) {
            throw new https_1.HttpsError('failed-precondition', 'Invitation already accepted.');
        }
        const inviteeEmail = String(invite.inviteeEmail ?? '')
            .trim()
            .toLowerCase();
        if (inviteeEmail && userEmail !== inviteeEmail) {
            throw new https_1.HttpsError('permission-denied', 'Sign in with the email address this invitation was sent to.');
        }
        role = asInviteRole(invite.role);
        const inviterUid = String(invite.inviterUid ?? '').trim();
        const userRef = db.collection('users').doc(joinedUid);
        const userSnap = await tx.get(userRef);
        const familyMemberRef = inviterUid && role !== 'member'
            ? db.collection('users').doc(inviterUid).collection('familyMembers').doc(token)
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
                joinedUid,
                profileClaimed: true,
            });
        }
        tx.set(userRef, buildClaimUserPatch(userSnap.data(), invite, { token, forceAnchor: true }), { merge: true });
        if (familySnap?.exists && familyMemberRef) {
            tx.update(familyMemberRef, {
                claimedByUid: joinedUid,
                claimedAt: firestore_1.FieldValue.serverTimestamp(),
                displayName: displayName || familySnap.data()?.displayName || null,
            });
        }
    });
    return {
        ok: true,
        role,
        roleLabel: roleLabel(role),
        profileClaimed: true,
    };
});
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
    let emailToSend = null;
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
        const familySnap = await tx.get(familyMemberRef);
        const doc = snap.data();
        if (doc.inviterUid !== uid) {
            throw new https_1.HttpsError('permission-denied', 'You can only edit people you invited.');
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
        const previousEmail = String(doc.inviteeEmail ?? '').trim().toLowerCase() || null;
        let newEmail = previousEmail;
        let emailJustAddedOrChanged = false;
        if (data.inviteeEmail !== undefined) {
            const trimmed = String(data.inviteeEmail ?? '').trim().toLowerCase();
            newEmail = trimmed && trimmed.includes('@') ? trimmed : null;
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
            tx.update(familyMemberRef, familyUpdate);
        }
        if (emailJustAddedOrChanged && newEmail && memberStatus === 'living') {
            const joinUrl = `${APP_ORIGIN}/join/${token}`;
            emailToSend = {
                to: newEmail,
                inviterName: doc.inviterName || 'A family member',
                inviteeFirstName: firstName || doc.inviteeFirstName || '',
                role: doc.role,
                joinUrl,
                personalMessage: doc.personalMessage || null,
            };
        }
    });
    if (emailToSend) {
        await queueInviteEmail(emailToSend);
    }
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
            tx.set(userRef, buildClaimUserPatch(userSnap.data(), invite, { token, forceAnchor: false }), { merge: true });
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
            tx.set(userRef, buildClaimUserPatch(userSnap.data(), inviteSnap.data(), {
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
//# sourceMappingURL=index.js.map