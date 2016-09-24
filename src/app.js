const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const Steam = require('steam')
const getSteamAPIKey = require('steam-web-api-key')
const SteamWebLogOn = require('steam-weblogon')
const SteamTradeOffers = require('steam-tradeoffers')
const MobileAuthHandler = require('./mobileauth.js')
let mobileAuthHandler
let bot = {}

// config.json initializer
let config = {}
fs.readFile(path.join(__dirname, '..', 'cfg', 'config.json'), (err, data) => {
  if (err) throw err

  config = JSON.parse(data)
  steamLogin()
})

// Steam login function
// If login credentials fail, will throw an error
function steamLogin () {
  mobileAuthHandler = new MobileAuthHandler(null, null, config.mobileAuth.desktopAuthPassword)
  let steamClient = new Steam.SteamClient()
  let steamUser = new Steam.SteamUser(steamClient)
  let steamFriends = new Steam.SteamFriends(steamClient)

  steamClient.connect()
  steamClient.on('connected', () => {
    steamUser.logOn({
      account_name: config.steam.username,
      password: config.steam.password,
      two_factor_code: mobileAuthHandler.getTOTPToken(),
      sha_sentryfile: (fs.existsSync(path.join(__dirname, '..', 'mobile_auth', '.sentry')) ? fs.readFileSync(path.join(__dirname, '..', 'mobile_auth', '.sentry')) : undefined)
    })
  })
  // On successful login
  steamClient.on('logOnResponse', (response) => {
    console.log('Steam account successfully authenticated')
    console.log('Session ID:', steamClient.sessionID)
    console.log('Steam ID:', steamClient.steamID)
    bot.steamID = steamClient.steamID
    steamFriends.setPersonaState(Steam.EPersonaState.Online)
  })
  steamUser.on('updateMachineAuth', (sentry, callback) => {
    fs.writeFileSync(path.join(__dirname, '..', 'mobile_auth', '.sentry'), sentry.bytes)
    callback({sha_file: getSHA1(sentry.bytes)})
  })
  steamClient.on('error', () => {
    console.log('Disconnected from steam. Retrying.')
    steamClient.connect()
  })
}

function getSHA1 (bytes) {
  let shaSum = crypto.createHash('sha1')
  shaSum.end(bytes)
  return shaSum.read()
}
