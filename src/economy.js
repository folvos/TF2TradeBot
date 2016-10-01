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
}

class EconomyHandler {
  constructor (backpackKey, pricesFile) {
    BackpackAPIHandler = new BackScraper.APIHandler(backpackKey)

    this.pricesFile = new PricesFile(pricesFile)
    this.initCurrency()
  }

  initCurrency () {
    BackpackAPIHandler.getCurrencies(440, (err, data) => {
      if (err) throw err

      console.log(data.response.currencies)
    })
  }
}

module.exports = EconomyHandler
