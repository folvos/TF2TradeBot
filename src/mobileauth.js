const crypto = require('crypto')
const path = require('path')
const fs = require('fs')

function initSecrets (pass) {
  let manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../', 'mobile_auth', 'manifest.json')))
  let maFile = fs.readFileSync(path.join(__dirname, '../', 'mobile_auth', manifest.entries[0].filename))
  let secrets = {}

  if (pass === '' || pass === undefined) {
    maFile = JSON.parse(maFile)
    secrets = {
      sharedSecret: maFile.shared_secret,
      identitySecret: maFile.identity_secret
    }

    console.log('Loaded Steam Desktop Authenticator data.')
  } else {
    console.log('Decryption is currently not supported.')
    process.exit(1)

    /*
    TODO: Fix decryption.
    maFile = decryptMaFile(pass, maFile, manifest)
    secrets = {
      sharedSecret: maFile.shared_secret,
      identitySecret: maFile.identity_secret
    }
    */
  }

  return secrets
}

/*
TODO: Fix decryption.
function decryptMaFile (pass, maFile, manifest) {
  let salt = Buffer.from(manifest.entries[0].encryption_salt, 'base64').toString('binary')
  let key = crypto.pbkdf2Sync(pass, salt, 50000, 32, 'sha256')

  maFile = Buffer.from(maFile, 'base64').toString('binary')
  let decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(manifest.entries[0].encryption_iv, 'base64'))
  decipher.setAutoPadding(true)
  let decoded = decipher.update(maFile, 'binary', 'utf8')

  decoded += decipher.final('utf8')
  return decoded
}
*/

console.log(initSecrets())
