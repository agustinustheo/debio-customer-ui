<style scoped lang='scss'>
.pop-up-main{
    .pop-up-title{
        width: 462px;
        height: 76px;

        font-family: "Roboto", sans-serif;
        font-style: normal;
        font-weight: bold;
        font-size: 24px;
        line-height: 41px;
        color: #363636;
        margin-top: 20px;
        margin-bottom: 50px;
    }
    .v-btn {
        width: 452px;
        height: 53px !important;
        font-family: "Raleway", sans-serif;
        font-style: normal;
        font-weight: 600;
        font-size: 20px !important;
        line-height: 30px;
        text-transform: none;
    }
}
</style>

<template lang='pug'>
  LandingPagePopUp
    template(v-slot:main)
      div.pop-up-main
        div.pop-up-title The Privacy-First Platform for Personal Genetic and Biomedical Testing
        v-btn.white--text(elevation='0' color='primary' @click='signIn') Sign In
        v-btn(elevation='0' outlined color='primary' @click='generateAccount') Generate Account
        v-btn.white--text(elevation='0' color='primary' @click='enablePolkadotWallet') Use Polkadot Wallet
      v-dialog(v-model='dotAccountDialog' width='500')
        v-card
          v-card-title(class='h3') Available Accounts
          v-list(two-line)
            template(v-for='account in accounts')
              v-list-item(@click='chooseDotAccount(account)' v-bind:key='account.id')
                v-list-item-avatar(class='mr-7')
                  v-img(v-bind:src="require('@/assets/dot-profile.png')")
                v-list-item-content
                  v-list-item-title(v-html='account.name')
                  v-list-item-subtitle(v-html='account.address')
</template>

<script>
import LandingPagePopUp from "@/views/LandingPage/LandingPagePopUp.vue"
import {
  web3Accounts,
  web3Enable
} from "@polkadot/extension-dapp"
import { mapActions } from "vuex"

export default {
  name: "MainPage",

  components: {
    LandingPagePopUp
  },

  data: () => ({
    dotAccountDialog: false,
    accounts: []
  }),

  methods: {
    ...mapActions({
      registerAccount: "substrate/registerAccount"
    }),

    signIn() {
      this.$router.push({name: "sign-in"})
    },

    async enablePolkadotWallet() {
      const ext = await web3Enable("DeBio Network")

      if(ext.length > 0) {
        this.accounts = await web3Accounts()
        this.dotAccountDialog = true
      }
    },

    async chooseDotAccount(account) {
      await this.registerAccount({
        account
      })
      this.dotAccountDialog = false
      this.$router.push({name: "customer-dashboard"})
    },

    generateAccount() {
      this.$router.push({name: "generate-account"})
    }
  }
}
</script>
