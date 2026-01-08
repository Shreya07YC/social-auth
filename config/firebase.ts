import env from '#start/env'

const firebaseConfig = {
  projectId: env.get('FIREBASE_PROJECT_ID'),
  clientEmail: env.get('FIREBASE_CLIENT_EMAIL'),
  // Handle private key - it may come with escaped newlines or actual newlines
  privateKey: (() => {
    const key = env.get('FIREBASE_PRIVATE_KEY')
    if (!key) return undefined
    // Replace literal \n with actual newlines and remove surrounding quotes
    return key
      .replace(/\\n/g, '\n')
      .replace(/^["']|["']$/g, '')
  })(),
}

export default firebaseConfig
