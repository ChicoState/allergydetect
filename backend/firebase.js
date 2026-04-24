const admin = require('firebase-admin');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const initPromise = (async () => {
  let serviceAccount;

  if (process.env.FIREBASE_SECRET_NAME) {
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const response = await client.send(new GetSecretValueCommand({
      SecretId: process.env.FIREBASE_SECRET_NAME,
    }));
    serviceAccount = JSON.parse(response.SecretString);
  } else {
    serviceAccount = require('./serviceAccountKey.json');
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin.firestore();
})();

module.exports = () => initPromise;