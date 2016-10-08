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

    this.data[440].items['Scrap Metal'] = {
      buy: {
        price: metalRates.scrapMetal,
        units: 'metal'
      },
      sell: {
        price: metalRates.scrapMetal,
        units: 'metal'
      }
    }
    this.data[440].items['Reclaimed Metal'] = {
      buy: {
        price: metalRates.reclaimedMetal,
        units: 'metal'
      },
      sell: {
        price: metalRates.reclaimedMetal,
        units: 'metal'
      }
    }
    this.data[440].items['Refined Metal'] = {
      buy: {
        price: metalRates.refinedMetal,
        units: 'metal'
      },
      sell: {
        price: metalRates.refinedMetal,
        units: 'metal'
      }
    }
    this.data[440].items['Mann Co. Supply Crate Key'] = {
      buy: {
        price: keyPrice.value,
        units: 'metal'
      },
      sell: {
        price: keyPrice.valueHigh,
        units: 'metal'
      }
    }
    this.data[440].currencies = currencies

    this.syncToDisk()
  }

  getPrice (appId, name, transaction) {
    const alias = this.data[appId].aliases[name] ? this.data[appId].aliases[name] : name
    return this.data[appId].items[alias][transaction]
  }

  convertCurrency (value, from, to) {
    if (from === to) return value
    if (this.data[440].currencies[from].conversions[to]) return value / this.data[440].currencies[from].conversions[to]
    else {
      for (const conversion in this.data[440].currencies[from])  {
        if (this.data[440].currencies[conversion][to]) return this.convertCurrency(convertCurrency(value, from, conversion), conversion, to)
      }
    }
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
    let giveValue = {price: 0, currency: ''}
    let getValue = {price: 0, currency: ''}

    for (let item in give) {
      item = give[item]
      const price = this.pricesFile.getPrice(440, item.market_hash_name, 'sell')

      if (giveValue.currency === price.units) giveValue.price = price.price + (giveValue.price * item.amount)
      else if (!giveValue.currency) {
        giveValue.price = price.price + (giveValue.price * item.amount)
        giveValue.currency = price.units
      } else giveValue.price = price.price + this.pricesFile.convertCurrency(giveValue.price * item.amount, giveValue.currency, price.units)
      
      if (giveValue.price % 1 >= 0.96) giveValue.price = Math.round(giveValue.price)
    }

    for (let item in get) {
      item = get[item]
      const price = this.pricesFile.getPrice(440, item.market_hash_name, 'buy')

      if (getValue.currency === price.units) getValue.price = price.price + (getValue.price * item.amount)
      else if (!getValue.currency) {
        getValue.price = price.price + (getValue.price * item.amount)
        getValue.currency = price.units
      } else getValue.price = price.price + this.pricesFile.convertCurrency(getValue.price * item.amount, getValue.currency, price.units)

      if (getValue.price % 1 >= 0.96) getValue.price = Math.round(getValue.price)
    }

    return getValue.price >= giveValue.price
  }
}

module.exports = EconomyHandler
