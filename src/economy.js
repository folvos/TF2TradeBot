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

  setCurrencies (metalRates, keyPrice) {
    const currencies = {
      keys: {
        conversions: {
          metal: 1 / keyPrice.high
        }
      },
      metal: {
        conversions: {
          keys: keyPrice.low,
          weapons: metalRates.sellWeapon
        }
      },
      weapons: {
        conversions: {
          metal: Math.round(1 / metalRates.buyWeapon)
        }
      }
    }
    this.data[440].items['Scrap Metal']
    this.data[440].currencies = currencies
    this.syncToDisk()
  }

  convertCurrency (value, from, to) {
    if (from === to) return value
    return value / this.data[440].currencies[from].conversions[to]
  }
}

class EconomyHandler {
  constructor (backpackKey, pricesFile, metalRates) {
    BackpackAPIHandler = new BackScraper.APIHandler(backpackKey)

    this.pricesFile = new PricesFile(pricesFile)
    BackpackAPIHandler.getCurrencies(440, (err, data) => {
      if (err) throw err

      const keyRates = {
        low: data.response.currencies.keys.price.value,
        high: data.response.currencies.keys.price.value_high
      }
      this.pricesFile.setCurrencies(metalRates, keyRates)
    })
  }

  checkEquality (give, get) {

  }
}

module.exports = EconomyHandler
