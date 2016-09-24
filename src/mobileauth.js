const crypto = require('crypto')
const path = require('path')
const fs = require('fs')

function initSecrets (pass) {
  let manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../', 'mobile_auth', 'manifest.json')))
  let maFile = fs.readFileSync(path.join(__dirname, '../', 'mobile_auth', manifest.entries[0].filename))
  let secrets = {}

  if (pass === '' || pass === undefined) {
    let maFile = JSON.parse(maFile)
    secrets = {
      sharedSecret: maFile.shared_secret,
      identitySecret: maFile.identity_secret
    }

    console.log('Loaded Steam Desktop Authenticator data.')
  } else {
    console.log('Starting decryption')

    maFile = decryptMaFile(pass, maFile, manifest)
    secrets = {
      sharedSecret: maFile.shared_secret,
      identitySecret: maFile.identity_secret
    }
  }

  return secrets
}

function decryptMaFile (pass, maFile, manifest) {
  let salt = Buffer.from(manifest.entries[0].encryption_salt, 'base64')
  let key = ''

  key = crypto.pbkdf2Sync(pass, salt, 50000, 32, 'sha256')

  let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'base64'), Buffer.from(manifest.entries[0].encryption_iv, 'base64'))

  let decrypted = ''
  decipher.on('readable', () => {
    let data = decipher.read()
    if (data) {
      decrypted += data.toString('utf8')
    }
  })
  decipher.on('end', () => {
    console.log(decrypted)
    console.log('Decrypted Steam Desktop Authenticator data.')
  })

  decipher.write(maFile, 'utf8')
  decipher.end()

  return decrypted
}
