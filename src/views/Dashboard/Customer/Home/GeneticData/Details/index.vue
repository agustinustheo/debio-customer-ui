<template lang="pug">
  .ga-order-detail
    .ga-order-detail__title Test Summary

    .ga-order-detail__cards
      ServiceCard(
        :service="serviceDetail"
      )
      StepperStatusCard(
        :analysis="analysisDetail"
        @cancel="showingDialog"
        @reject="showReasonOfRejection"
      )

    ConfirmationDialog(
      :show="showCancelDialog"
      :loading="isLoading"
      :txWeight="Number(txWeight).toFixed(4)"
      title="Cancel"
      btnMessage="Cancel Order"
      message="By cancel this service, your file might not be able to be analyzed, and your balance will be refunded"
      @close="showCancelDialog = false"
      @click="cancelOrder"
    )

    ReasonOfRejection(
      :show="reasonOfRejection"
      :title="title"
      :message="message"
      @close="reasonOfRejection = false"
    )
  
</template>


<script>
import { mapState } from "vuex"
import ServiceCard from "./ServiceCard"
import StepperStatusCard from "./StepperStatusCard"
import ReasonOfRejection from "./ReasonOfRejection"
import ConfirmationDialog from "@/common/components/Dialog/ConfirmationDialog"
import { getOrderDetail } from "@/common/lib/api"
import { queryGeneticAnalysisByGeneticAnalysisTrackingId } from "@debionetwork/polkadot-provider"
import { cancelGeneticAnalysisOrder, cancelGeneticAnalysisOrderFee } from "@debionetwork/polkadot-provider"
import { formatPrice } from "@/common/lib/price-format.js"

export default {
  name: "GAOrderDetail",

  components: {
    ServiceCard,
    StepperStatusCard,
    ConfirmationDialog,
    ReasonOfRejection
  },

  computed: {
    ...mapState({
      api: (state) => state.substrate.api,
      lastEventData: (state) => state.substrate.lastEventData,
      wallet: (state) => state.substrate.wallet,
      web3: (state) => state.metamask.web3
    })
  },

  watch: {
    lastEventData(e) {
      if (e !== null) {
        const dataEvent = JSON.parse(e.data.toString())
        if (e.method === "GeneticAnalysisOrderCancelled") {
          if (dataEvent[0].customerId === this.wallet.address) {
            this.isLoading = false
            this.showCancelDialog = false
            this.toPaymentHistory()
          }
        }
      }
       
    }
  },

  data: () => ({
    showCancelDialog: false,
    orderId: null,
    isLoading: false,
    txWeight: "Calculating...",
    reasonOfRejection: false,
    trackingId: "",
    title: "",
    message: "",
    orderDetail: null,
    serviceDetail: null,
    analysisDetail: null
  }),

  async mounted() {
    this.orderId = null

    if(this.$route.params.id) {
      this.orderId = this.$route.params.id
      await this.getOrderDetail()
    }

    await this.getCancelFee()
  },

  methods: {

    async getOrderDetail() {
      const detail = await getOrderDetail(this.orderId)
      this.serviceDetail = {
        analystName: `${detail.genetic_analyst_info.first_name} ${detail.genetic_analyst_info.last_name}`,
        analystProfileImage: detail.genetic_analyst_info.profile_image,
        analystSpecialization: detail.genetic_analyst_info.specialization,
        serviceName: detail.service_info.name,
        serviceDescription: detail.service_info.description,
        serviceDuration: `${detail.service_info.expected_duration.duration} ${detail.service_info.expected_duration.duration_type}`,
        servicePrice: `${formatPrice(detail.service_info.prices_by_currency[0].total_price)} ${detail.service_info.prices_by_currency[0].currency}`
      }

      const trackingId = detail.genetic_analysis_tracking_id
      this.analysisDetail = await queryGeneticAnalysisByGeneticAnalysisTrackingId(this.api, trackingId)
      this.title = this.analysisDetail.rejectedTitle
      this.message = this.analysisDetail.rejectedDescription
    },

    showingDialog() {
      this.showCancelDialog = true
    },

    async getCancelFee() {
      const txWeight = await cancelGeneticAnalysisOrderFee(this.api, this.wallet.address, this.orderId)
      this.txWeight = this.web3.utils.fromWei(String(txWeight.partialFee), "ether")
    },

    async cancelOrder() {
      this.isLoading = true
      await cancelGeneticAnalysisOrder(this.api, this.wallet, this.orderId)
    },

    showReasonOfRejection() {
      this.reasonOfRejection = true
    },

    toPaymentHistory() {
      this.$router.push({ name: "customer-payment-history" })
    }
  }

}
</script>

<style lang="sass" scoped>
  @import "@/common/styles/mixins.sass"
  @import "@/common/styles/functions.sass"


  .ga-order-detail
    &__title
      display: flex
      justify-content: center
      align-items: center
      letter-spacing: 0.0044em
      margin-top: toRem(52px)
      @include h6-opensans

    &__cards
      display: flex
      padding: toRem(52px)
      gap: toRem(14px)

      

</style>
