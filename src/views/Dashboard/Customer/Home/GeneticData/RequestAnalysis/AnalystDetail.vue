<template lang="pug">
  v-dialog.analyst-detail(:value="show" max-width="440" overflow-hidden persistent rounded )
    ui-debio-error-dialog(
      :show="errorAlert"
      title="Insufficient Balance"
      message="Your transaction cannot succeed due to insufficient balance, check your account balance"
      @close="errorAlert = false"
    )
    v-card.analyst-detail__card
      .analyst-detail__close
        v-btn.fixed-button(v-if="!isLoading" icon @click="closeDialog")
          v-icon mdi-close

      div(v-if="!isLoading")
        .analyst-detail__service
          .analyst-detail__service-name {{ service.serviceName }}

          .analyst-detail__service-description {{ service.description }}


          .analyst-detail__service-info
            v-row
              v-col(cols="8")
                v-icon(size="14" outlined ) mdi-timer 
                span.analyst-detail__service-info-duration {{ service.duration }} {{ service.durationType }}
              v-col(cols="4")
                b.analyst-detail__service-info-price {{ price }}
          hr

        v-row.analyst-detail__profil
          v-col(cols="3")
            ui-debio-avatar.service-analysis-card__avatar(
              :src="computeAvatar" 
              size="75"
              rounded
            )

          v-col(cols="9")
            .analyst-detail__profil-name {{ service.analystsInfo.info.firstName }} {{ service.analystsInfo.info.lastName }}
            .analyst-detail__profil-desc {{ service.analystsInfo.info.specialization }}

            a(:href="service.analystsInfo.info.profileLink" target="_blank")
              v-img.analyst-detail__profil-social(
                alt="linkedin"
                center
                src="@/assets/linkedin-logo.png"
                height="15" 
                width="15"
              )

        .analyst-detail__profil-experience Experience
        ul.analyst-detail__profil-experience-list(
          v-for="(experience, i) in experiences"
          :key="i"
        ) - {{ experience.title }}

        .analyst-detail__tx-weight
          .analyst-detail__data-tx-weight Estimated transaction weight 
            v-tooltip.visible(bottom )
              template(v-slot:activator="{ on, attrs }")
                v-icon(
                  style="font-size: 12px;"
                  color="primary"
                  dark
                  v-bind="attrs"
                  v-on="on"
                ) mdi-alert-circle-outline
              span(style="font-size: 10px;") Total fee paid in DBIO to execute this transaction.
          .analyst-detail__data-tx-weight {{ txWeight }}


        .analyst-detail__button
          ui-debio-button.analyst-detail__button-text(
            color="secondary" 
            width="48%"
            height="38"
            outlined
            @click="handleDownloadReport"
          ) Download Sample Report

          ui-debio-button.analyst-detail__button-text(
            color="secondary" 
            width="48%"
            height="38" 
            @click="onSelect"
          ) Checkout Order

      UploadingDialog(
        :show="isLoading"
        type="Processing"
      )

    ui-debio-alert-dialog(
      :show="showAlert"
      :width="289"
      title="Unpaid Order"
      message="Complete your unpaid order first before requesting a new one. "
      imgPath="alert-circle-primary.png"
      btn-message="Go to My Payment"
      @click="toPaymentHistory"
      )
</template>

<script>

import { mapState } from "vuex"
import Kilt from "@kiltprotocol/sdk-js"
import CryptoJS from "crypto-js"
import cryptWorker from "@/common/lib/ipfs/crypt-worker"
import { u8aToHex } from "@polkadot/util"
import { 
  queryLastGeneticAnalysisOrderByCustomerId,
  queryGeneticAnalystByAccountId, 
  createGeneticAnalysisOrder, 
  createGeneticAnalysisOrderFee } from "@debionetwork/polkadot-provider"
import { queryLastGeneticAnalysisOrderByCustomer } from "@/common/lib/polkadot-provider/query/genetic-analysis-orders.js"
import { downloadWithProgress, uploadFile, getFileUrl } from "@/common/lib/pinata-proxy"
// import SpinnerLoader from "@bit/joshk.vue-spinners-css.spinner-loader"
import UploadingDialog from "@/common/components/Dialog/UploadingDialog"

export default {
  name: "AnalystDetail",

  data: () => ({
    price: null,
    publicKey: "",
    privateKey: "",
    fileType: "",
    fileName: "",
    links: [],
    files: [],
    file: "",
    geneticLink: "",
    isLoading: false,
    txWeight: "Calculating...",
    showAlert: false,
    errorAlert: false
  }),

  components: {
    UploadingDialog
  },

  props: {
    show: Boolean,
    experiences: Array
  },

  async created() {
    if (this.mnemonicData) {
      await this.getCustomerPublicKey() 
      await this.getTxWeight()
    } 
  },

  computed: {
    ...mapState({
      api: (state) => state.substrate.api,
      wallet: (state) => state.substrate.wallet,
      walletBalance: (state) => state.substrate.walletBalance,
      web3: (state) => state.metamask.web3,
      mnemonicData: (state) => state.substrate.mnemonicData,
      lastEventData: (state) => state.substrate.lastEventData,
      selectedGeneticData: (state) => state.geneticData.selectedData,
      service: (state) => state.geneticData.selectedAnalysisSerivice
    }),

    computeAvatar() {
      const profile = this.service.analystsInfo.info.profileImage
      return profile ? profile : require("@/assets/defaultAvatar.svg")
    }
  },

  watch: {
    lastEventData(e) {
      if (e !== null) {
        const dataEvent = JSON.parse(e.data.toString())
        if (e.method === "GeneticAnalysisOrderCreated") {
          if (dataEvent[0].customerId === this.wallet.address) {
            this.isLoading = false
            this.toCheckoutPage()
          }
        }
      }
    }
  },

  methods: {
    async getLastOrderStatus () {
      let lastOrder 
      try {
        lastOrder = await queryLastGeneticAnalysisOrderByCustomerId(this.api, this.wallet.address)
        console.log(lastOrder)

        return lastOrder.status
      } catch (error) {
        lastOrder = null
        return lastOrder
      }
    },

    async getTxWeight(){
      const txWeight = await createGeneticAnalysisOrderFee(
        this.api,
        this.wallet.address,
        this.selectedGeneticData.id,
        this.service.serviceId,
        0,
        this.publicKey,
        this.geneticLink
      )
      this.txWeight = `${Number(this.web3.utils.fromWei(String(txWeight.partialFee), "ether")).toFixed(4)} DBIO`
      await this.getPrice()
    },

    async getCustomerPublicKey() {
      const identity = Kilt.Identity.buildFromMnemonic(this.mnemonicData.toString(CryptoJS.enc.Utf8))
      this.publicKey = u8aToHex(identity.boxKeyPair.publicKey)
      this.privateKey = u8aToHex(identity.boxKeyPair.secretKey)
    },

    async getAnalystPublicKey () {
      const id = this.service.analystId
      const analystDetail = await queryGeneticAnalystByAccountId(this.api, id)
      const analystPublicKey = analystDetail.info.boxPublicKey
      return analystPublicKey
    },

    async getPrice() {
      this.price = `${this.formatBalance(this.service.priceDetail[0].totalPrice)} ${this.service.priceDetail[0].currency}`
    },

    closeDialog() {
      this.$emit("close")
    },

    async handleDownloadReport() {
      window.open(this.service.testResultSample)
    },

    async onSelect() {
      const status = await this.getLastOrderStatus()
      if (status === "Unpaid") {
        this.showAlert = true 
        return
      }

      const txWeight = Number(this.txWeight.split(" ")[0])
      if (this.walletBalance < txWeight) {
        this.errorAlert = true 
        this.closeDialog()
        return
      }

      this.isLoading = true
      this.geneticLink = ""
      this.links = []
      const links = JSON.parse(this.selectedGeneticData.reportLink)

      let download = []
      let fileType
      let fileName
      for (let i = 0; i < links.length; i++) {
        const { name, type, data } = await downloadWithProgress(links[i], true)
        fileType = type
        fileName = name
        download.push(data)
      }

      let arr = []
      for (let i = 0; i < download.length; i++) {
        let { box, nonce } = download[i].data
        box = Object.values(box) // Convert from object to Array
        nonce = Object.values(nonce) // Convert from object to Array

        const toDecrypt = {
          box: Uint8Array.from(box),
          nonce: Uint8Array.from(nonce)
        }

        console.log("Decrypting...")
        const decryptedObject = await Kilt.Utils.Crypto.decryptAsymmetric(
          toDecrypt,
          this.publicKey,
          this.privateKey
        )
        arr = [...arr, ...decryptedObject]
      }
      console.log("Decrypted!")

      const unit8Arr = new Uint8Array(arr)
      const blob = new Blob([unit8Arr], { type: fileType })
      this.file = new File([blob], fileName)

      const dataFile = await this.setupFileReader(this.file)
      
      await this.upload({
        encryptedFileChunks: dataFile.chunks,
        fileName: dataFile.fileName,
        fileType: fileType
      })
    },

    setupFileReader(file) {
      return new Promise((res, rej) => {
        const context = this
        const fr = new FileReader()
        fr.onload = async function () {
          try {
            const encrypted = await context.encrypt({
              text: fr.result,
              fileType: file.type,
              fileName: file.name
            })

            const { chunks, fileName, fileType } = encrypted
            const dataFile = {
              title: "title",
              description: "description",
              file,
              chunks,
              fileName,
              fileType,
              createdAt: new Date().getTime()
            }

            res(dataFile)
          } catch (e) {
            console.error(e)
          }
        }
        fr.onerror = rej
        fr.readAsArrayBuffer(file)
      })
    },

    async encrypt({ text, fileType, fileName}) {
      console.log("encrypting..")
      const analystPublicKey = await this.getAnalystPublicKey()
      const context = this
      const arrChunks = []
      let chunksAmount
      const pair = {
        secretKey: this.privateKey,
        publicKey: analystPublicKey
      }

      return await new Promise((res, rej) => {
        try {
          cryptWorker.workerEncryptFile.postMessage({
            pair,
            text,
            fileType
          })

          cryptWorker.workerEncryptFile.onmessage = async (event) => {
            if (event.data.chunksAmount) {
              chunksAmount = event.data.chunksAmount
              return
            }

            arrChunks.push(event.data)
            context.encryptProgress = (arrChunks.length / chunksAmount) * 100

            if (arrChunks.length === chunksAmount ) {
              res({
                fileName: fileName,
                chunks: arrChunks,
                fileType: fileType
              })
            }
          }
          console.log("encrypted")
        } catch (e) {
          rej(new Error(e.message))
        }
      })

    },

    async upload({ encryptedFileChunks, fileName, fileType }) {
      for (let i = 0; i < encryptedFileChunks.length; i++) {
        const data = JSON.stringify(encryptedFileChunks[i]) // not working if the size is large
        const blob = new Blob([data], { type: fileType })

        // UPLOAD TO PINATA API
        const result = await uploadFile({
          title: fileName,
          type: fileType,
          file: blob
        })
        const link = await getFileUrl(result.IpfsHash)
        this.links.push(link)
      }

      this.geneticLink = JSON.stringify(this.links)
      if (this.geneticLink) {
        await this.createOrder()
      }


    },

    formatBalance(balance) {
      const formatedBalance = this.web3.utils.fromWei(String(balance.replaceAll(",", "")), "ether")
      return Number(formatedBalance).toPrecision()
    },

    async createOrder() {
      const priceIndex = 0
      await createGeneticAnalysisOrder(
        this.api,
        this.wallet,
        this.selectedGeneticData.id,
        this.service.serviceId,
        priceIndex,
        this.geneticLink,
        this.publicKey
      )
    },

    async toCheckoutPage() {
      const lastOrder = await queryLastGeneticAnalysisOrderByCustomer(this.api, this.wallet.address)
      this.$router.push({name: "customer-request-analysis-payment", params: { id: lastOrder}})
    },

    toPaymentHistory() {
      this.$router.push({ name: "customer-payment-history" })
    }
  }
}
</script>

<style lang="sass" scoped>
  @import "@/common/styles/mixins.sass"

  .analyst-detail
    &__card
      padding: 5px
      
    &__service
      margin: 15px 30px 0 30px

    &__service-name
      @include button-2

    &__service-description
      height: 100px
      margin-top: 8px
      @include body-text-3-opensans

      &::-webkit-scrollbar-track
        background-color: #f2f2ff

      &::-webkit-scrollbar
        width: 0.25rem

      &::-webkit-scrollbar-thumb
        border-radius: 0.625rem
        background: #a1a1ff

    &__service-info
      margin-top: 16px
      margin-bottom: 20px

    &__service-info-duration
      letter-spacing: -0.004em
      margin-left: 5px
      @include body-text-3-opensans-medium

    &__service-info-price
      color: #F006CB
      @include body-text-3-opensans

    &__profil
      margin-left: 0 !important
      margin-right: 0 !important
      padding: 12px 23px

    &__profil-name
      margin-top: 12px
      @include body-text-1

    &__profil-desc
      color: #8C8C8C
      @include body-text-3

    &__profil-social
      margin-top: 16px
      
    &__img
      margin-top: 12px


    &__profil-experience
      margin-left: 0 !important
      padding: 12px 35px
      @include button-2

    &__tx-weight
      display: flex
      align-items: center
      justify-content: space-between
      margin-top: 10px
      padding: 0 35px

    &__data-tx-weight
      @include tiny-reg

    &__profil-experience-list
      margin-left: 0 !important
      padding-left: 35px
      @include body-text-3
    
    &__button
      display: flex
      align-items: center
      justify-content: space-between
      padding: 29px 35px 55px 35px
      gap: 10px

    &__button-text
      @include body-text-5-opensans

    &__close
      display: flex
      justify-content: flex-end
      padding: 1.013rem !important

    &__loading-title
      display: flex
      justify-content: center
      align-items: center
      letter-spacing: 0.0044em
      margin-top: 80px
      @include h6-opensans

    &__loading-spin
      display: flex
      justify-content: center
      align-items: center
      padding: 50px 0px

    &__loading-message
      display: flex
      flex-direction: column
      justify-content: center
      align-items: center
      text-align: center
      letter-spacing: -0.0075em
      text-transform: initial
      @include button-2

    &__loading-border-text
      display: flex
      padding: 24px 0 154px 0
      justify-content: center
      letter-spacing: -0.004em
      @include body-text-3-opensans
    

    
  .fixed-button
    position: fixed
    width: 50px

</style>
