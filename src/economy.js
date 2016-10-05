const BackScraper = require('backscraper')
const fs = require('fs')

let BackpackAPIHandler

class PricesFile {
  constructor (path) {
    this.path = path

    this.syncToMemory()
  }

  syncToMemory () {
    fs.readFile(this.path, (err, data) => {
      if (err) throw err

      this.data = JSON.parse(data)
    })
  }

  syncToDisk () {
    fs.writeFile(this.path, JSON.stringify(this.data))
  }

  getPrice (appId, name, transaction) {
    const alias = this.data[appId].aliases[name] ? this.data[appId].aliases[name] : name
    return this.data[appId].items[alias][transaction]
  }

  setCurrencies (metalRates, keyPrice) {}
}

class EconomyHandler {
  constructor (backpackKey, pricesFile, metalRates) {
    BackpackAPIHandler = new BackScraper.APIHandler(backpackKey)

    this.pricesFile = new PricesFile(pricesFile)
    BackpackAPIHandler.getCurrencies(440, (err, data) => {
      if (err) throw err

      console.log(data.response.currencies.keys.price)
    })
  }

  checkEquality (give, get) {

  }
}

module.exports = EconomyHandler
