import localStorage from "./local-storage"
import store from "@/store/index"

async function dispatchGetAccount(wallet, address, func){
  if (wallet == null) {
    const extensionAccount = localStorage.getLocalStorageByName("ext_account_data")
    if (address != "" && !extensionAccount) {
      await store.dispatch("substrate/getAllAccounts", {
        address: address
      })
    }
  }
  func()
}

export async function checkIsLoggedIn(to, from, next) {
  const address = localStorage.getAddress()
  let api = store.getters["substrate/getAPI"]
  if (api == null) {
    await store.dispatch("substrate/connect", address)
  }

  let wallet = store.getters["substrate/wallet"]
  const extensionAccount = localStorage.getLocalStorageByName("ext_account_data")
  if (extensionAccount) {
    await store.dispatch("substrate/setExtensionAccountData", {
      address: extensionAccount
    })
  }
  const isLoggedIn = !!address || !!extensionAccount

  if (to.path == "/sign-in" || to.path == "/generate") {
    if (isLoggedIn) {
      await dispatchGetAccount(wallet, address, () => {
        next("/customer")
      })
      return address
    } 

    next()
    return ""
  } 

  if (isLoggedIn) {
    await dispatchGetAccount(wallet, address, () => {
      next()
    })
    return address
  }

  next("/landing-page")
  return ""
}
