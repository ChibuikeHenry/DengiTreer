"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTreeBuildPayment = exports.initializeTreeBuildPayment = exports.TREE_BUILD_AMOUNT_KOBO = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const db = (0, firestore_1.getFirestore)();
const APP_ORIGIN = process.env.APP_ORIGIN ?? 'https://dengitree.web.app';
exports.TREE_BUILD_AMOUNT_KOBO = 25_000_00;
function paystackSecret() {
    return String(process.env.PAYSTACK_SECRET_KEY ?? '').trim();
}
async function paystackRequest(path, init) {
    const secret = paystackSecret();
    if (!secret) {
        throw new https_1.HttpsError('failed-precondition', 'Payments are not configured yet. Contact support or try again later.');
    }
    const response = await fetch(`https://api.paystack.co${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
            ...(init.headers ?? {}),
        },
    });
    const body = (await response.json());
    if (!response.ok || body.status === false) {
        throw new https_1.HttpsError('internal', body.message?.trim() || 'Payment provider error. Try again.');
    }
    return body.data;
}
exports.initializeTreeBuildPayment = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to pay for Build my tree.');
    }
    const requestId = String(request.data?.requestId ?? '').trim();
    if (!requestId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing build request.');
    }
    const reqRef = db.collection('treeBuildRequests').doc(requestId);
    const reqSnap = await reqRef.get();
    if (!reqSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Build request not found.');
    }
    const req = reqSnap.data();
    if (req.uid !== request.auth.uid) {
        throw new https_1.HttpsError('permission-denied', 'This request belongs to another account.');
    }
    if (req.paymentStatus === 'paid') {
        throw new https_1.HttpsError('failed-precondition', 'This request is already paid.');
    }
    const email = (typeof request.auth.token.email === 'string' && request.auth.token.email.trim()) || '';
    if (!email) {
        throw new https_1.HttpsError('failed-precondition', 'Your account needs an email address to pay.');
    }
    const uid = request.auth.uid;
    const callbackUrl = `${APP_ORIGIN}/home/build-my-tree?paid=1`;
    const initData = await paystackRequest('/transaction/initialize', {
        method: 'POST',
        body: JSON.stringify({
            email,
            amount: exports.TREE_BUILD_AMOUNT_KOBO,
            currency: 'NGN',
            callback_url: callbackUrl,
            metadata: {
                uid,
                requestId,
                kind: 'tree_build',
            },
        }),
    });
    const reference = String(initData.reference ?? '').trim();
    if (!reference || !initData.authorization_url) {
        throw new https_1.HttpsError('internal', 'Could not start payment.');
    }
    await db.collection('treeBuildPayments').doc(reference).set({
        uid,
        requestId,
        amountKobo: exports.TREE_BUILD_AMOUNT_KOBO,
        status: 'pending',
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await reqRef.update({
        paymentReference: reference,
        status: 'awaiting_payment',
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { authorizationUrl: initData.authorization_url, reference };
});
exports.verifyTreeBuildPayment = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to confirm payment.');
    }
    const reference = String(request.data?.reference ?? '').trim();
    if (!reference) {
        throw new https_1.HttpsError('invalid-argument', 'Missing payment reference.');
    }
    const uid = request.auth.uid;
    const paymentRef = db.collection('treeBuildPayments').doc(reference);
    const verifyData = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' });
    if (verifyData.status !== 'success') {
        throw new https_1.HttpsError('failed-precondition', 'Payment was not completed.');
    }
    const metaUid = String(verifyData.metadata?.uid ?? '').trim();
    if (metaUid && metaUid !== uid) {
        throw new https_1.HttpsError('permission-denied', 'This payment belongs to another account.');
    }
    const requestId = String(verifyData.metadata?.requestId ?? '').trim();
    if (!requestId) {
        throw new https_1.HttpsError('failed-precondition', 'Payment is not linked to a build request.');
    }
    await db.runTransaction(async (tx) => {
        const paySnap = await tx.get(paymentRef);
        const reqRef = db.collection('treeBuildRequests').doc(requestId);
        const reqSnap = await tx.get(reqRef);
        if (!reqSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Build request not found.');
        }
        const req = reqSnap.data();
        if (req.uid !== uid) {
            throw new https_1.HttpsError('permission-denied', 'This request belongs to another account.');
        }
        if (paySnap.exists && paySnap.data()?.status === 'success') {
            return;
        }
        tx.set(paymentRef, {
            uid,
            requestId,
            status: 'success',
            verifiedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.update(reqRef, {
            paymentStatus: 'paid',
            status: 'queued',
            paidAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    return { ok: true, requestId };
});
//# sourceMappingURL=treeBuildService.js.map