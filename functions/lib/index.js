"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptInvitation = exports.getInvitationByToken = exports.createShareInvite = exports.createFamilyMemberInvite = void 0;
const crypto_1 = require("crypto");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
(0, app_1.initializeApp)();
(0, v2_1.setGlobalOptions)({ region: 'us-central1' });
const db = (0, firestore_1.getFirestore)();
const APP_ORIGIN = process.env.APP_ORIGIN ?? 'https://dengitree.web.app';
function roleLabel(role) {
    const map = {
        spouse: 'Spouse',
        parent: 'Parent',
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
    const roleText = roleLabel(options.role);
    const greeting = options.inviteeFirstName
        ? escapeHtml(options.inviteeFirstName)
        : 'there';
    const extra = options.personalMessage
        ? `<p><em>${escapeHtml(options.personalMessage)}</em></p>`
        : '';
    await db.collection('mail').add({
        to: options.to,
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
async function createInvitationRecord(uid, authToken, data) {
    const role = data.role;
    if (!role || !['spouse', 'parent', 'child', 'sibling', 'member'].includes(role)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid invitation role.');
    }
    const firstName = String(data.firstName ?? '').trim();
    const lastName = String(data.lastName ?? '').trim();
    const middleName = String(data.middleName ?? '').trim();
    const inviteeName = [firstName, middleName, lastName].filter(Boolean).join(' ');
    const memberStatus = data.memberStatus === 'deceased' ? 'deceased' : 'living';
    const inviteeEmail = String(data.inviteeEmail ?? '')
        .trim()
        .toLowerCase();
    if (memberStatus === 'living' && role !== 'member' && !inviteeEmail) {
        throw new https_1.HttpsError('invalid-argument', 'Email is required to invite a living relative.');
    }
    const inviterName = (typeof authToken.name === 'string' && authToken.name) ||
        (typeof authToken.email === 'string' && authToken.email) ||
        'A family member';
    const token = newToken();
    const joinUrl = `${APP_ORIGIN}/join/${token}`;
    await db.collection('invitations').doc(token).set({
        token,
        inviterUid: uid,
        inviterName,
        inviterEmail: typeof authToken.email === 'string' ? authToken.email.toLowerCase() : null,
        inviteeEmail: inviteeEmail || null,
        inviteeName: inviteeName || null,
        inviteeFirstName: firstName || null,
        inviteeLastName: lastName || null,
        role,
        status: 'pending',
        memberStatus,
        personalMessage: data.personalMessage?.trim() || null,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        joinedAt: null,
        joinedUid: null,
    });
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
exports.acceptInvitation = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to accept this invitation.');
    }
    const token = String(request.data?.token ?? '').trim();
    if (!token) {
        throw new https_1.HttpsError('invalid-argument', 'Missing invitation token.');
    }
    const ref = db.collection('invitations').doc(token);
    const userEmail = typeof request.auth.token.email === 'string'
        ? request.auth.token.email.toLowerCase()
        : null;
    let role = 'member';
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            throw new https_1.HttpsError('not-found', 'Invitation not found.');
        }
        const doc = snap.data();
        if (doc.status !== 'pending') {
            throw new https_1.HttpsError('failed-precondition', 'Invitation already accepted.');
        }
        const inviteeEmail = doc.inviteeEmail;
        if (inviteeEmail && userEmail && inviteeEmail !== userEmail) {
            throw new https_1.HttpsError('permission-denied', 'Sign in with the email address this invitation was sent to.');
        }
        role = doc.role;
        tx.update(ref, {
            status: 'joined',
            joinedAt: firestore_1.FieldValue.serverTimestamp(),
            joinedUid: request.auth.uid,
        });
        tx.set(db.collection('users').doc(request.auth.uid), {
            familyRole: role,
            invitedByUid: doc.inviterUid,
            inviteToken: token,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    return { ok: true, role, roleLabel: roleLabel(role) };
});
//# sourceMappingURL=index.js.map