const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const Steam = require('steam')
const SteamWebLogon = require('steam-weblogon')
const TradeOfferManager = require('steam-tradeoffer-manager')
const SteamCommunity = require('steamcommunity')
const steamCommunity = new SteamCommunity()
const MobileAuthHandler = require('./mobileauth.js')
const EconomyHandler = require('./economy.js')
let tradeManager
let mobileAuthHandler
let economyHandler
let bot = {}

// config.json initializer
let config = {}
fs.readFile(path.join(__dirname, '..', 'cfg', 'config.json'), (err, data) => {
  if (err) throw err

  config = JSON.parse(data)
  initEconomy()
  steamLogin()
})

function initEconomy () {
  economyHandler = new EconomyHandler(config.backpackTF.apiKey, path.join(__dirname, '..', 'cfg', 'prices.json'), config.metalRates)
}

// Steam login function
// If login credentials fail, will throw an error
function steamLogin () {
  mobileAuthHandler = new MobileAuthHandler(null, null, config.mobileAuth.desktopAuthPassword)
  let steamClient = new Steam.SteamClient()
  let steamUser = new Steam.SteamUser(steamClient)
  let steamFriends = new Steam.SteamFriends(steamClient)
  const steamWebLogOn = new SteamWebLogon(steamClient, steamUser)

  if (fs.existsSync(path.join(__dirname, '..', 'cfg', 'servers.json'))) steamClient.servers = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'cfg', 'servers.json')))
  steamClient.connect()
  steamClient.on('connected', () => {
    steamUser.logOn({
      account_name: config.steam.username,
      password: config.steam.password,
      two_factor_code: mobileAuthHandler.getTOTPToken(),
      sha_sentryfile: getSHA1(fs.existsSync(path.join(__dirname, '..', 'mobile_auth', '.sentry')) ? fs.readFileSync(path.join(__dirname, '..', 'mobile_auth', '.sentry')) : undefined)
    })
  })

  steamClient.on('servers', (servers) => {
    fs.writeFile(path.join(__dirname, '..', 'cfg', 'servers.json'), JSON.stringify(servers))
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
      steamCommunity.setCookies(cookies)
      steamCommunity.startConfirmationChecker(10000, mobileAuthHandler.getIdentitySecret())
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

// Initializes trade listeners
function initTradeListeners () {
  tradeManager.on('newOffer', (offer) => {
    offer.getUserDetails((err, me, them) => {
      console.log('Received trade offer from ' + them.personaName + '.')
      console.log('Offer is ' + parseItemsToHumanReadable(offer.itemsToGive) + ' for ' + parseItemsToHumanReadable(offer.itemsToReceive) + '.')
      if (err) throw err

      if (offer.isGlitched() || me.escrowDays > 0 || them.escrowDays > 0 || them.probation) declineOffer(offer)
      else if (config.admins.indexOf(offer.partner.accountid) > 0) acceptOffer(offer)
      else if (economyHandler.checkEquality(offer.itemsToGive, offer.itemsToReceive)) acceptOffer(offer)
      else declineOffer(offer)
    })
  })
}

// Function: Declines Offer
function declineOffer (offer) {
  console.log('Declining offer.')
  offer.decline((err) => {
    if (err) throw err

    console.log('Offer successfully declined.')
  })
}

// Function: Accepts Offer
function acceptOffer (offer) {
  console.log('Accepting offer.')
  offer.accept((err, status) => {
    if (err) throw err

    if (status === 'pending') {
      console.log('Offer needs mobile confirmation.')
      steamCommunity.checkConfirmations()
    } else {
      console.log('Offer successfully accepted.')
    }
  })
}

// Function: Parses Items to become human readable
function parseItemsToHumanReadable (items) {
  const items_parsed = []

  let result = ''
  for (let item in items_parsed) {
    const comma = (item !== items.length - 1)
    console.log(comma)
    console.log(item)
    console.log(items.length - 1)
    console.log(comma ? ', ' : '')
    item = items[item]
    result = result + item.amount + ' x ' + item.market_hash_name + (comma ? ', ' : '')
  }
  return result === '' ? 'nothing' : result
}

// Function: Gets hash for sentry file
function getSHA1 (bytes) {
  let shaSum = crypto.createHash('sha1')
  shaSum.end(bytes)
  return shaSum.read()
}
