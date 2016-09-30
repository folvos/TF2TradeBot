const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const Steam = require('steam')
const SteamWebLogon = require('steam-weblogon')
const TradeOfferManager = require('steam-tradeoffer-manager')
const SteamCommunity = require('steamcommunity')
const steamCommunity = new SteamCommunity()
const MobileAuthHandler = require('./mobileauth.js')
let tradeManager
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
  const steamWebLogOn = new SteamWebLogon(steamClient, steamUser)

  steamClient.connect()
  steamClient.on('connected', () => {
    steamUser.logOn({
      account_name: config.steam.username,
      password: config.steam.password,
      two_factor_code: mobileAuthHandler.getTOTPToken(),
      sha_sentryfile: getSHA1(fs.existsSync(path.join(__dirname, '..', 'mobile_auth', '.sentry')) ? fs.readFileSync(path.join(__dirname, '..', 'mobile_auth', '.sentry')) : undefined)
    })
  })

  // On successful login
  steamClient.on('logOnResponse', (response) => {
    console.log('Steam account successfully authenticated')
    console.log('Session ID:', steamClient.sessionID)
    console.log('Steam ID:', steamClient.steamID)
    bot.sessionID = steamClient.sessionID
    bot.steamID = steamClient.steamID
    steamFriends.setPersonaState(Steam.EPersonaState.Online)
    steamUser.gamesPlayed([{game_id: 440}])
    steamWebLogOn.webLogOn((sessionID, cookies) => {
      tradeManager.setCookies(cookies, (err) => {
        if (err) {
          console.error(err)
          console.log('Unable to get Steam Web API key. This could be a result of a restricted account. Attempt to get the key online or try again.')
          process.exit(1)
        }

        console.log('Got API key: ' + tradeManager.apiKey)
      })
    })
    tradeManager = new TradeOfferManager({
      steam: steamUser,
      community: steamCommunity,
      language: 'en'
    })
    initTradeListeners()
  })
  // On Machine Authorization
  steamUser.on('updateMachineAuth', (sentry, callback) => {
    fs.writeFileSync(path.join(__dirname, '..', 'mobile_auth', '.sentry'), sentry.bytes)
    console.log('Updated sentry file. Trade will not work from the bot for 7 days.')
    callback({sha_file: getSHA1(sentry.bytes)})
  })
  // Restart on error
  steamClient.on('error', () => {
    console.log('Disconnected from steam. Retrying.')
    steamClient.connect()
  })
}

function initTradeListeners () {
  tradeManager.on('newOffer', (offer) => {
    console.log('Received trade offer.')
    console.log(offer)
  })
}

function getSHA1 (bytes) {
  let shaSum = crypto.createHash('sha1')
  shaSum.end(bytes)
  return shaSum.read()
}
