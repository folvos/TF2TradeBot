// API's and Requirements
const fs = require('fs')
const path = require('path')
const Steam = require('steam')
const getSteamAPIKey = require('steam-web-api-key')
const SteamWebLogOn = require('steam-weblogon')
const SteamTradeOffers = require('steam-tradeoffers')

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
  let steamClient = new Steam.SteamClient()
  let steamUser = new Steam.SteamUser(steamClient)

  steamClient.connect()
  steamClient.on('connected', () => {
    steamUser.logOn({
      account_name: config.steam.username,
      password: config.steam.password
    })
  })
  // On successful login
  steamClient.on('logOnResponse', () => {
    console.log('Steam account successfully authenticated')
    console.log('Steam ID:', steamClient.steamID)
  })
}
