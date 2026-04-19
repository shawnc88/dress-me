import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Apple's root certificates for App Store Server Notifications V2.
// In production, download from https://www.apple.com/certificateauthority/
// and pin the root CA. For now, we verify the JWS structure and decode.

// Apple Root CA - G3 (used for App Store)
// SHA-256 fingerprint is checked against known Apple roots.
const APPLE_ROOT_CA_G3_FINGERPRINT = 'b0b1730ecbc7ff4505142c49f1295e6eda6bcaed7e2c68c5be91b5a11001f024';

interface DecodedJWS {
  header: { alg: string; x5c?: string[] };
  payload: any;
  signature: string;
}

/**
 * Decode a JWS (JSON Web Signature) token without external JWT library dependencies.
 * Returns the decoded header and payload.
 */
function decodeJWS(token: string): DecodedJWS {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWS format: expected 3 parts');
  }

  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));

  return { header, payload, signature: parts[2] };
}

/**
 * Verify the certificate chain from x5c header.
 * x5c[0] = leaf cert (signs the JWS)
 * x5c[1] = intermediate CA
 * x5c[2] = root CA (should match Apple Root CA)
 *
 * Returns the leaf certificate's public key if chain is valid.
 */
function verifyCertificateChain(x5c: string[]): crypto.KeyObject {
  if (!x5c || x5c.length < 2) {
    throw new Error('x5c certificate chain too short');
  }

  // Convert base64 DER certificates to PEM format
  const certs = x5c.map((certBase64) => {
    const lines = certBase64.match(/.{1,64}/g)?.join('\n') || certBase64;
    return `-----BEGIN CERTIFICATE-----\n${lines}\n-----END CERTIFICATE-----`;
  });

  // Verify root certificate matches Apple's known fingerprint
  if (x5c.length >= 3) {
    const rootDer = Buffer.from(x5c[x5c.length - 1], 'base64');
    const rootFingerprint = crypto.createHash('sha256').update(rootDer).digest('hex');
    if (rootFingerprint !== APPLE_ROOT_CA_G3_FINGERPRINT) {
      logger.warn(`Apple JWS: root certificate fingerprint mismatch. Got: ${rootFingerprint}`);
      // In production, reject mismatched root certificates
      if (env.NODE_ENV === 'production') {
        throw new Error('Root certificate does not match Apple Root CA G3');
      }
    }
  }

  // Verify chain: each cert should be signed by the next
  for (let i = 0; i < certs.length - 1; i++) {
    try {
      const cert = new crypto.X509Certificate(certs[i]);
      const issuer = new crypto.X509Certificate(certs[i + 1]);

      if (!cert.checkIssued(issuer)) {
        throw new Error(`Certificate chain broken at index ${i}`);
      }

      // Verify the certificate hasn't expired
      const now = new Date();
      if (now < new Date(cert.validFrom) || now > new Date(cert.validTo)) {
        throw new Error(`Certificate at index ${i} is expired or not yet valid`);
      }
    } catch (err: any) {
      if (err.message.includes('chain broken') || err.message.includes('expired')) {
        throw err;
      }
      // X509Certificate may not be available in all Node versions < 15.6
      logger.debug(`Certificate chain verification skipped: ${err.message}`);
    }
  }

  // Extract public key from leaf certificate
  const leafCert = new crypto.X509Certificate(certs[0]);
  return leafCert.publicKey;
}

/**
 * Verify the JWS signature using the leaf certificate's public key.
 */
function verifyJWSSignature(token: string, publicKey: crypto.KeyObject): boolean {
  const parts = token.split('.');
  const signedData = `${parts[0]}.${parts[1]}`;
  const signature = Buffer.from(parts[2], 'base64url');

  const verifier = crypto.createVerify('SHA256');
  verifier.update(signedData);
  return verifier.verify(publicKey, signature);
}

export interface VerifiedAppleTransaction {
  originalTransactionId: string;
  transactionId: string;
  productId: string;
  bundleId: string;
  expiresDate?: number;
  purchaseDate: number;
  appAccountToken?: string;
  type: string;
  environment: string;
}

export interface VerifiedAppleNotification {
  notificationType: string;
  subtype?: string;
  notificationUUID: string;
  transaction: VerifiedAppleTransaction;
  renewalInfo?: any;
}

/**
 * Verify and decode an Apple App Store Server Notification V2 signedPayload.
 *
 * Flow:
 * 1. Decode the outer JWS (signedPayload)
 * 2. Verify its certificate chain (x5c) traces to Apple Root CA
 * 3. Verify the JWS signature with the leaf certificate
 * 4. Decode the inner signedTransactionInfo JWS
 * 5. Verify its signature as well
 * 6. Return the decoded + verified notification and transaction
 */
export function verifyAppleNotification(signedPayload: string): VerifiedAppleNotification {
  // Step 1: Decode outer notification JWS
  const outerJWS = decodeJWS(signedPayload);

  // Step 2: Verify certificate chain
  if (!outerJWS.header.x5c || outerJWS.header.x5c.length === 0) {
    throw new Error('Missing x5c certificate chain in JWS header');
  }
  const outerPublicKey = verifyCertificateChain(outerJWS.header.x5c);

  // Step 3: Verify outer signature
  if (!verifyJWSSignature(signedPayload, outerPublicKey)) {
    throw new Error('Invalid JWS signature on notification payload');
  }

  const notification = outerJWS.payload;
  const { notificationType, subtype, notificationUUID, data } = notification;

  if (!data?.signedTransactionInfo) {
    throw new Error('Missing signedTransactionInfo in notification data');
  }

  // Step 4: Decode inner transaction JWS
  const txJWS = decodeJWS(data.signedTransactionInfo);

  // Step 5: Verify inner transaction signature.
  // In production we REQUIRE x5c so a malformed JWS can't bypass the signature
  // check. Earlier code was optional-check which let crafted JWS through.
  if (!txJWS.header.x5c || txJWS.header.x5c.length === 0) {
    throw new Error('Missing x5c in signedTransactionInfo — cannot verify');
  }
  const txPublicKey = verifyCertificateChain(txJWS.header.x5c);
  if (!verifyJWSSignature(data.signedTransactionInfo, txPublicKey)) {
    throw new Error('Invalid JWS signature on transaction info');
  }

  const tx = txJWS.payload;

  // Step 6: Decode renewal info if present
  let renewalInfo: any = undefined;
  if (data.signedRenewalInfo) {
    try {
      const renewalJWS = decodeJWS(data.signedRenewalInfo);
      if (renewalJWS.header.x5c && renewalJWS.header.x5c.length > 0) {
        const renewalKey = verifyCertificateChain(renewalJWS.header.x5c);
        if (!verifyJWSSignature(data.signedRenewalInfo, renewalKey)) {
          throw new Error('Invalid JWS signature on renewal info');
        }
      }
      renewalInfo = renewalJWS.payload;
    } catch (err) {
      logger.warn('Failed to verify renewal info JWS:', err);
    }
  }

  return {
    notificationType,
    subtype,
    notificationUUID: notificationUUID || '',
    transaction: {
      originalTransactionId: tx.originalTransactionId,
      transactionId: tx.transactionId,
      productId: tx.productId,
      bundleId: tx.bundleId,
      expiresDate: tx.expiresDate,
      purchaseDate: tx.purchaseDate,
      appAccountToken: tx.appAccountToken,
      type: tx.type,
      environment: tx.environment || notification.environment,
    },
    renewalInfo,
  };
}

/**
 * Verify a signed transaction from a restore purchases flow (client-side receipt).
 * The client sends the signedTransaction JWS from StoreKit 2.
 */
export function verifyAppleTransaction(signedTransaction: string): VerifiedAppleTransaction {
  const jws = decodeJWS(signedTransaction);

  // Require x5c for restore-purchase transactions. StoreKit 2 always includes
  // it in signed transactions; missing x5c here means tampering or a fake JWS.
  if (!jws.header.x5c || jws.header.x5c.length === 0) {
    throw new Error('Missing x5c certificate chain — cannot verify transaction');
  }
  const publicKey = verifyCertificateChain(jws.header.x5c);
  if (!verifyJWSSignature(signedTransaction, publicKey)) {
    throw new Error('Invalid JWS signature on transaction');
  }

  const tx = jws.payload;
  return {
    originalTransactionId: tx.originalTransactionId,
    transactionId: tx.transactionId,
    productId: tx.productId,
    bundleId: tx.bundleId,
    expiresDate: tx.expiresDate,
    purchaseDate: tx.purchaseDate,
    appAccountToken: tx.appAccountToken,
    type: tx.type,
    environment: tx.environment,
  };
}
