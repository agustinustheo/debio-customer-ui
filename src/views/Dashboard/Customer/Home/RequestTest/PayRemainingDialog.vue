<template lang="pug">
  v-dialog.remaining-dialog(:value="show" width="400" persistent rounded )
    v-card.remaining-dialog__dialog
      v-app-bar(flat dense color="white" )
        v-toolbar-title.remaining-dialog__title Pay remaining amount
      .remaining-dialog__card
        .remaining-dialog__card-text
          .remaining-dialog__card-text-content 1. By clicking Pay button you will use your balance to pay the remaining amount that needed to be completed.
          .remaining-dialog__card-text-content 2. The remaining amount calculated in order summary.
          .remaining-dialog__card-text-content 3. If your balance is not enough to pay the remaining amount, you can top up your balance first and go back to this page.

      .remaining-dialog__input
        .remaining-dialog__input-label Remaining Amount
        ui-debio-input.remaining-dialog__input-field(
          variant="small"
          width="100%"
          outlined
          disabled 
          v-model="formatAmount"
        )

        .remaining-dialog__trans-weight
          .remaining-dialog__trans-weight-text Estimated transaction weight
            v-tooltip.visible(bottom)
              template(v-slot:activator="{on, attrs}")
                v-icon.remaining-dialog__trans-weight-icon(
                  style="font-size: 12px;"
                  color="primary"
                  dark 
                  v-bind="attrs"
                  v-on="on" 
                ) mdi-alert-circle-outline
              span(style="font-size: 8px;") Total fee paid in DBIO to execute this transaction.
          div(style="font-size: 12px;") {{ Number(txWeight).toFixed(4) }} DBIO
        
        .remaining-dialog__button
          v-btn.remaining-dialog__input-button(
            depressed
            outlined 
            color="secondary"
            large
            width="150px"
            height="35" 
            @click="closeDialog"
          ) Back

          v-btn.remaining-dialog__input-button(
            depressed
            color="secondary"
            large
            width="150px"
            height="35" 
            @click="onSubmit"
            :loading="isLoading"
          ) Continue

</template>

<script>
import { mapState } from "vuex"
import CryptoJS from "crypto-js"	
import Kilt from "@kiltprotocol/sdk-js"
import { u8aToHex } from "@polkadot/util"
import { queryLastOrderHashByCustomer, queryOrderDetailByOrderID } from "@debionetwork/polkadot-provider"
import { createOrder } from "@debionetwork/polkadot-provider"
import { processRequest } from "@debionetwork/polkadot-provider"
import { getCreateOrderFee } from "@debionetwork/polkadot-provider"

export default {
  name: "PayRemainingDialog",

  props: {
    show: Boolean,
    amount: { type: [String, Number]},
    amountInDai:  { type: [String, Number]}
  },

  data: () => ({
    currencyType: "DBIO",
    agree: false,
    dialogAlert: false,
    isLoading: false,
    transactionStep: "",
    error: "",
    password: "",
    txWeight: 0
  }),
  computed: {
    ...mapState({
      api: (state) => state.substrate.api,
      pair: (state) => state.substrate.wallet,
      country: state => state.lab.country,
      region: state => state.lab.region,
      city: state => state.lab.city,
      category: state => state.lab.category,
      stakingData: (state) => state.lab.stakingData,
      metamaskWalletAddress: (state) => state.metamask.metamaskWalletAddress,
      selectedService: (state) => state.testRequest.products,
      web3: (state) => state.metamask.web3,
      mnemonicData: (state) => state.substrate.mnemonicData
    }),

    formatAmount() {
      return `${this.amount} DBIO`
    }
  },

  async mounted () {
    await this.getTxWeight()
  },
  
  methods: {
    async getTxWeight() {
      const customerBoxPublicKey = await this.getCustomerPublicKey()
      const txWeight = await getCreateOrderFee(
        this.api, 
        this.pair.address, 
        this.selectedService.serviceId,
        this.selectedService.indexPrice,
        customerBoxPublicKey,
        this.selectedService.serviceFlow

      )
      this.txWeight = this.web3.utils.fromWei(String(txWeight.partialFee), "ether")
    },

    closeDialog() {
      this.$emit("close")
    },

    getCustomerPublicKey() {
      const identity = Kilt.Identity.buildFromMnemonic(this.mnemonicData.toString(CryptoJS.enc.Utf8))
      this.publicKey = u8aToHex(identity.boxKeyPair.publicKey)
      this.secretKey = u8aToHex(identity.boxKeyPair.secretKey)
      return u8aToHex(identity.boxKeyPair.publicKey)
    },

    async onSubmit() {
      this.isLoading = true
      this.error = ""


      const customerBoxPublicKey = await this.getCustomerPublicKey()
      await createOrder(
        this.api,
        this.pair,
        this.selectedService.serviceId,
        customerBoxPublicKey,
        this.selectedService.serviceFlow,
        this.selectedService.indexPrice,
        this.processService
      )
    },

    async processService () {
      this.lastOrder = await queryLastOrderHashByCustomer(
        this.api,
        this.pair.address
      )
      this.detailOrder = await queryOrderDetailByOrderID(this.api, this.lastOrder)
      const orderId = this.detailOrder.id
      const dnaSampleTrackingId = this.detailOrder.dnaSampleTrackingId
      const additional = (this.detailOrder.additionalPrices[0].value).replaceAll(",", "")

      await processRequest(
        this.api,
        this.pair,
        this.stakingData.lab_address,
        this.stakingData.hash,
        orderId,
        dnaSampleTrackingId,
        additional
      )
      this.isLoading = false
    }
  }
}
</script>

<style lang="sass" scoped>
  @import "@/common/styles/mixins.sass"

  .remaining-dialog
    &__title
      display: flex
      align-items: center
      letter-spacing: 0.0075em
      margin-left: 20px
      padding-bottom: 28px
      @include button-1
    
    &__dialog
      padding: 31px 0px

    &__card
      background-color: #F5F7F9
      margin: 0px 30px

    &__card-text
      padding: 18px 12px
      letter-spacing: -0.004em

    &__card-text-content
      @include body-text-3-opensans

    &__input
      margin: 11px 30px

    &__input-label
      display: flex
      align-items: center
      letter-spacing: -0.0075em
      margin-bottom: 11px
      @include button-2
    
    &__input-field
      max-height: 18px
      letter-spacing: -0.004em
      margin-bottom: 50px
      @include body-text-3-opensans
   
    &__trans-weight
      margin-top: 20px
      margin-bottom: 20px
      display: flex
      justify-content: space-between

    &__trans-weight-text
      letter-spacing: -0.004em
      display: flex
      align-items: center
      @include body-text-3-opensans

    &__input-button
      display: flex
      align-items: center
      text-align: center
      letter-spacing: -0.015em
      margin-top: 20px
      @include tiny-semi-bold

    &__trans-weight-icon
      margin-left: 5px

    &__button
      display: flex
      justify-content: space-between

</style>
