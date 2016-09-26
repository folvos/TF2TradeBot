const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const steamTOTP = require('steam-totp')
const crypt = require('js-rijndael')

class MobileAuthHandler {
  constructor (sharedSecret, identitySecret, pass) {
    if (sharedSecret == null || identitySecret == null) {
      let secrets = this.initSecrets(pass)
      this.sharedSecret = secrets.sharedSecret
      this.identitySecret = secrets.identitySecret
    } else {
      this.sharedSecret = sharedSecret
      this.identitySecret = identitySecret
    }
  }

  initSecrets (pass) {
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

      // TODO: Fix decryption.
      maFile = this.decryptMaFile(pass, maFile, manifest)
      secrets = {
        sharedSecret: maFile.shared_secret,
        identitySecret: maFile.identity_secret
      }
    }

    return secrets
  }

  // TODO: Fix decryption.
  decryptMaFile (pass, maFile, manifest) {
    let salt = Buffer.from(manifest.entries[0].encryption_salt, 'base64').toString('binary')
    let key = crypto.pbkdf2Sync(pass, salt, 50000, 32, 'sha256')

    maFile = Buffer.from(maFile, 'base64')
    console.log(maFile.length)

    // The cipher-block chaining mode of operation maintains internal
    // state, so to decrypt a new instance must be instantiated.
    /*
    const aesCbc = new aesjs.ModeOfOperation.cbc(key, Buffer.from(manifest.entries[0].encryption_iv, 'base64'))
    const decryptedBytes = aesCbc.decrypt(maFile)
    console.log(decryptedBytes)

    // Convert our bytes back into text
    const decryptedText = aesjs.util.convertBytesToString(decryptedBytes)
    return JSON.parse(decryptedText)
    */
  }

  getTOTPToken () {
    return steamTOTP.generateAuthCode(this.sharedSecret)
  }
}

module.exports = MobileAuthHandler
