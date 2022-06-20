<template lang="pug">
  .customer-create-emr
    ui-debio-error-dialog(
      :show="!!error"
      :title="error ? error.title : ''"
      :message="error ? error.message : ''"
      @close="error = null"
    )

    ui-debio-modal(
      :show="showModal"
      :title="isEdit ? 'Edit EMR File' : 'Add EMR File'"
      cta-title="Submit"
      :cta-action="handleNewFile"
      :cta-outlined="false"
      @onClose="onCloseModalDocument"
    )
      ui-debio-input(
        :error="isDirty.document && isDirty.document.title"
        :rules="$options.rules.document.title"
        variant="small"
        label="Document Title"
        placeholder="Add Title"
        v-model="document.title"
        outlined
        block
        validate-on-blur
        @isError="handleError"
      )
      ui-debio-textarea(
        :error="isDirty.document && isDirty.document.description"
        :rules="$options.rules.document.description"
        variant="small"
        label="Description"
        placeholder="Add Description"
        v-model="document.description"
        validate-on-blur
        outlined
        block
        @isError="handleError"
      )
      ui-debio-file(
        v-model="document.file"
        :error="isDirty.document && isDirty.document.file"
        :rules="$options.rules.document.file"
        variant="small"
        accept=".pdf"
        label="File input"
        :clearFile="!isEdit && clearFile"
        @isError="handleError"
        validate-on-blur
      )

    .customer-create-emr__wrapper
      .customer-create-emr__title Edit EMR
      .customer-create-emr__forms
        ui-debio-input(
          :rules="$options.rules.emr.title"
          variant="small"
          label="EMR Title"
          :error="isDirty.emr && isDirty.emr.title"
          placeholder="Type EMR Title"
          v-model="emr.title"
          outlined
          block
          validate-on-blur
          @isError="handleError"
        )

        ui-debio-dropdown(
          :items="categories"
          :error="isDirty.emr && isDirty.emr.category"
          :rules="$options.rules.emr.category"
          variant="small"
          label="EMR Category"
          placeholder="Select EMR Category"
          v-model="emr.category"
          item-text="category"
          item-value="category"
          outlined
          close-on-select
          validate-on-blur
          block
          @isError="handleError"
        )

        ui-debio-button.secondary--text(
          color="secondary"
          height="2.5rem"
          block
          outlined
          @click="handleAddFile"
        ) Add file

        .customer-create-emr__files
          .customer-create-emr__files-title Uploaded Files
          .customer-create-emr__files-items
            template(v-if="isDocumentLoading")
              .customer-create-emr__file-item.customer-create-emr__file-item--skeleton(v-for="n in 3" :key="n")
            .customer-create-emr__file-item.customer-create-emr__file-item--no-file.d-flex.align-center(
              :class="{ 'customer-create-emr__file-item--error': fileEmpty }"
              v-if="!computeFiles.length && !isDocumentLoading"
              @click="showModal = true"
            )
              .customer-create-emr__file-details.mt-0
                .customer-create-emr__file-details--left
                  ui-debio-icon.customer-create-emr__file-icon(
                    :icon="fileTextIcon"
                    size="28"
                    color="#D3C9D1"
                    fill
                  )
                  .customer-create-emr__file-name No File uploaded, Please add file to upload

            template(v-else)
              .customer-create-emr__file-item(v-for="(item, idx) in computeFiles" :key="item.id")
                ui-debio-modal.modal-confirm(
                  :show="showModalConfirm === item.id"
                  title="Do you want to delete ?"
                  @onClose="showModalConfirm = null"
                )
                  span.modal-confirm__title By deleting this file, your file will not be uploaded
                  .modal-confirm__cta.d-flex.justify-space-between(slot="cta")
                    ui-debio-button(
                      outlined
                      width="100"
                      color="secondary"
                      @click="showModalConfirm = null"
                    ) No
                    ui-debio-button(
                      width="100"
                      color="secondary"
                      @click="onDelete(item.id)"
                    ) Yes

                .customer-create-emr__file-title(:title="`Title: ${item.title}`") {{ item.title }}
                .customer-create-emr__file-description(:title="`Description: ${item.description}`") {{ item.description }}
                .customer-create-emr__file-details
                  .customer-create-emr__file-details--left
                    ui-debio-icon.customer-create-emr__file-icon(
                      :icon="fileTextIcon"
                      size="28"
                      color="#D3C9D1"
                      fill
                    )
                    .customer-create-emr__file-name(v-if="item.file" :title="`File: ${item.file.name}`") {{ item.file.name }}

                  .customer-create-emr__file-details--right
                    ui-debio-icon.customer-create-emr__file-edit(
                      :icon="pencilIcon"
                      size="15"
                      color="#989898"
                      stroke
                      @click="onEdit(item)"
                    )
                    ui-debio-icon.customer-create-emr__file-delete(
                      :icon="trashIcon"
                      size="15"
                      color="#989898"
                      fill
                      @click="showModalConfirm = item.id"
                    )

        p.modal-password__tx-info.mb-0.d-flex.justify-space-between
          span.modal-password__tx-text.d-flex.align-center
            | Estimated transaction weight
            ui-debio-icon.ml-1(
              :icon="alertIcon"
              size="14"
              stroke
              @mouseenter="handleShowTooltip"
            )
            span.modal-password__tooltip(
              @mouseleave="handleShowTooltip"
              :class="{ 'modal-password__tooltip--show': showTooltip }"
            ) Total fee paid in DBIO to execute this transaction.
          span {{ txWeight }}

        ui-debio-button.white--text(
          color="secondary"
          height="2.5rem"
          :disabled="disabledButton"
          :loading="isLoading"
          @click="handleModalPassword"
          block
        ) Submit
</template>

<script>
import { mapState } from "vuex"

import Kilt from "@kiltprotocol/sdk-js"
import CryptoJS from "crypto-js"
import cryptWorker from "@/common/lib/ipfs/crypt-worker"
import { getEMRCategories } from "@/common/lib/api"
import {
  queryElectronicMedicalRecordById,
  queryElectronicMedicalRecordFileById,
  updateElectronicMedicalRecord,
  registerElectronicMedicalRecordFee
} from "@debionetwork/polkadot-provider"

import { uploadFile, getFileUrl, getIpfsMetaData, downloadFile, decryptFile } from "@/common/lib/pinata-proxy"
import { u8aToHex } from "@polkadot/util"
import { generalDebounce } from "@/common/lib/utils"
import { validateForms } from "@/common/lib/validate"
import { errorHandler } from "@/common/lib/error-handler"
import errorMessage from "@/common/constants/error-messages"
import { fileTextIcon, alertIcon, pencilIcon, trashIcon, eyeOffIcon, eyeIcon } from "@debionetwork/ui-icons"

const englishAlphabet = val => (val && /^[A-Za-z0-9!@#$%^&*\\(\\)\-_=+:;"',.\\/? ]+$/.test(val)) || errorMessage.INPUT_CHARACTER("English alphabet")

export default {
  name: "CustomerEmrEdit",

  mixins: [validateForms],

  data: () => ({
    errorMessage,
    fileTextIcon,
    pencilIcon,
    trashIcon,
    eyeOffIcon,
    alertIcon,
    eyeIcon,

    isEdit: false,
    showModal: false,
    showPassword: false,
    showModalConfirm: null,
    error: null,
    isLoading: false,
    isDocumentLoading: false,
    disabledButton: false,
    fileEmpty: false,
    clearFile: false,
    showTooltip: false,
    password: "",
    publicKey: null,
    secretKey: null,
    txWeight: null,
    emr: {
      id: "",
      title: "",
      category: "",
      files: []
    },
    document: {
      title: "",
      description: "",
      file: null
    },
    categories: []
  }),

  computed: {
    ...mapState({
      api: (state) => state.substrate.api,
      wallet: (state) => state.substrate.wallet,
      lastEventData: (state) => state.substrate.lastEventData,
      mnemonicData: (state) => state.substrate.mnemonicData,
      web3: (state) => state.metamask.web3
    }),

    computeFiles() {
      return this.emr.files.map(file => ({ ...file, percent: 0 })).reverse()
    },

    disabledDocumentForm() {
      return this.document.title === "" || this.document.description === "" || this.document.file === null
    },

    disabledFinish() {
      return this.computeFiles?.some(file => file.percent !== 100)
    }
  },

  watch: {
    lastEventData(event) {
      if (event !== null) {
        const dataEvent = JSON.parse(event.data.toString())
        if (event.method === "ElectronicMedicalRecordUpdated") {
          if (dataEvent[1] === this.wallet.address) {
            this.resetState()
            this.$router.push({ name: "customer-emr" })
          }
        }
      }
    },

    mnemonicData(val) {
      if (val) this.initialData()
    },

    emr: {
      deep: true,
      immediate: true,
      handler: generalDebounce(async function() {
        await this.calculateTxWeight()
      }, 500)
    }
  },

  rules: {
    password: [ val => !!val || errorMessage.PASSWORD(8) ],
    emr: {
      title: [
        val => !!val || errorMessage.REQUIRED,
        val => val && val.length < 50 || errorMessage.MAX_CHARACTER(50),
        englishAlphabet
      ],
      category: [ val => !!val || errorMessage.REQUIRED ]
    },
    document: {
      title: [
        val => !!val || errorMessage.REQUIRED,
        val => val && val.length < 50 || errorMessage.MAX_CHARACTER(50),
        englishAlphabet
      ],
      description: [
        val => !!val || errorMessage.REQUIRED,
        val => val && val.length < 255 || errorMessage.MAX_CHARACTER(255),
        englishAlphabet
      ],
      file: [
        val => !!val || errorMessage.REQUIRED,
        val => (val && val.size < 2000000) || errorMessage.FILE_SIZE(2),
        val => (val && val.type === "application/pdf") || errorMessage.FILE_FORMAT("PDF")
      ]
    }
  },

  async created() {
    this.fetchCategories()
    if (this.mnemonicData) {
      await this.initialData()
      this.calculateTxWeight()
    }
  },

  methods: {
    async initialData() {
      const cred = Kilt.Identity.buildFromMnemonic(this.mnemonicData.toString(CryptoJS.enc.Utf8))

      this.publicKey = u8aToHex(cred.boxKeyPair.publicKey)
      this.secretKey = u8aToHex(cred.boxKeyPair.secretKey)

      if (cred) await this.prepareData()
    },

    async prepareData() {
      try {
        this.isDocumentLoading = true
        const { id } = this.$route.params
        const data = await queryElectronicMedicalRecordById(this.api, id)
        let files = []

        if (!id || !data) {
          this.messageError = "Oh no! We can't find your selected order. Please select another one or try again"

          return
        }

        this.emr.id = id
        this.emr.title = data.title
        this.emr.category = data.category

        for (const file of data.files) {
          const dataFile = await queryElectronicMedicalRecordFileById(this.api, file)
          dataFile.id = file
          files.push(dataFile)
        }

        let completeFiles = []

        for (const file of files) {
          const details = await getIpfsMetaData(file.recordLink.split("/").pop())
          const pair = { publicKey: this.publicKey, secretKey: this.secretKey }
          const { type, data } = await downloadFile(file.recordLink, true)

          const decryptedFile = decryptFile(data, pair, type)

          const blobData = new Blob([decryptedFile], { type })

          completeFiles.push({
            ...file,
            file: new File([blobData], details.rows[0].metadata.name, {type: "application/pdf"}),
            oldFile: new File([blobData], details.rows[0].metadata.name, {type: "application/pdf"}),
            recordLink: file.recordLink
          })
        }

        this.emr.files = completeFiles
        this.isDocumentLoading = false
      } catch (error) {
        this.isDocumentLoading = false
        console.error(error)
      }
    },

    async fetchCategories() {
      this.categories = await getEMRCategories()
    },

    resetState() {
      Object.assign(this.emr, { title: "", category: "", files: [] })
      Object.assign(this.document, { title: "", description: "", file: null })

      this.password = ""
    },

    handleNewFile() {
      this._touchForms("document")
      const { title: docTitle, description: docDescription, file: docFile } = this.isDirty?.document
      if (docTitle || docDescription || docFile) return

      const { title, description, file, id } = this.document

      const context = this
      const fr = new FileReader()

      fr.onload = async function() {
        try {
          const encrypted = await context.encrypt({
            text: fr.result,
            fileType: file.type,
            fileName: file.name
          })

          const { chunks, fileName, fileType } = encrypted

          const dataFile = {
            title,
            description,
            file,
            chunks,
            id,
            fileName,
            fileType,
            createdAt: new Date().getTime()
          }

          if (context.isEdit) {
            const index = context.emr.files.findIndex(emrFile => emrFile.id === id)

            context.emr.files[index] = dataFile

            context.emr.files = context.emr.files.map(file => file)
            context.isEdit = false
          } else {
            context.emr.files.push(dataFile)
          }

        } catch(e) {
          this.error = e.message
        }
      }

      fr.readAsArrayBuffer(file)
      this.onCloseModalDocument()
    },

    onEdit(item) {
      Object.assign(this.document, { ...item })
      this.showModal = true
      this.isEdit = true
      this.clearFile = false
    },

    handleCancelUpload() {
      this.showLoadingFiles = false
      this.resetState()
    },

    onCloseModalDocument() {
      setTimeout(() => {
        this.isEdit = false
      }, 350)
      this.showModal = false
      Object.assign(this.document, { title: "", description: "", file: null })
      this.clearFile = true
      this._resetForms("document")
    },

    onDelete(id) {
      this.showModalConfirm = null
      this.emr.files = this.emr.files.filter(file => file.id !== id)
    },

    handleAddFile() {
      this.showModal = true
      this.isEdit = false
      this.clearFile = false
    },

    handleModalPassword() {
      this._touchForms("emr")
      const isEMRValid = Object.values(this.isDirty?.emr).every(v => v !== null && v === false)
      const isDocumentValid = Object.values(this.isDirty?.document).every(v => v !== null && v === false)

      if (!isEMRValid || (!isDocumentValid && this.emr.files.length < 1)) {
        if (!this.emr.files.length) this.fileEmpty = true

        return
      }

      this.fileEmpty = false
      this.clearFile = true

      this.finalSubmit()
    },

    async calculateTxWeight() {
      this.txWeight = "Calculating..."

      const txWeight = await registerElectronicMedicalRecordFee(this.api, this.wallet.address, this.emr)
      this.txWeight = `${Number(this.web3.utils.fromWei(String(txWeight.partialFee), "ether")).toFixed(4)} DBIO`
    },

    handleShowPassword() {
      this.showPassword = !this.showPassword
    },

    async finalSubmit() {
      this.isLoading = true
      this.disabledButton = true

      try {
        if (this.emr.files.length === 0) return

        for await (let [index, value] of this.emr.files.entries()) {
          if (value.file?.toString() === value.oldFile?.toString()) continue
          const dataFile = await this.setupFileReader({ value })
          await this.upload({
            encryptedFileChunks: dataFile.chunks,
            fileName: dataFile.fileName,
            index: index,
            fileType: dataFile.fileType
          })
        }

        await updateElectronicMedicalRecord(this.api, this.wallet, this.emr)

        this.isLoading = false
      } catch (e) {
        const error = await errorHandler(e.message)
        this.error = error
        this.isLoading = false
        this.disabledButton = false
      }
    },

    setupFileReader({ value }) {
      return new Promise((resolve, reject) => {
        const file = value.file
        const fr = new FileReader()

        fr.onload = async function () {
          resolve(value)
        }

        fr.onerror = reject

        fr.readAsArrayBuffer(file)
      })
    },

    async encrypt({ text, fileType, fileName }) {
      const context = this
      const arrChunks = []
      let chunksAmount
      const pair = {
        secretKey: this.secretKey,
        publicKey: this.publicKey
      }

      return await new Promise((resolve, reject) => {
        try {
          cryptWorker.workerEncryptFile.postMessage({ pair, text, fileType }) // Access this object in e.data in worker
          cryptWorker.workerEncryptFile.onmessage = async (event) => {
            if (event.data.chunksAmount) {
              chunksAmount = event.data.chunksAmount
              return
            }

            arrChunks.push(event.data)
            context.encryptProgress = (arrChunks.length / chunksAmount) * 100

            if (arrChunks.length === chunksAmount) {
              resolve({
                fileName: fileName,
                chunks: arrChunks,
                fileType: fileType
              })
            }
          }

          this.fileEmpty = false
        } catch (err) {
          reject(new Error(err.message))
        }
      })
    },

    async upload({ encryptedFileChunks, fileName, index, fileType }) {
      const data = JSON.stringify(encryptedFileChunks)
      const blob = new Blob([data], { type: fileType })

      const result = await uploadFile({
        title: fileName,
        type: fileType,
        file: blob
      })

      const link = getFileUrl(result.IpfsHash)

      this.emr.files[index].recordLink = link
    },

    setPercent(file) {
      const selected = this.computeFiles.find(v => v.file === file)

      setInterval(() => {
        if (selected && selected.percent < 100) selected.percent += 1
      }, 2000)

      return selected?.percent
    },

    handleShowTooltip(e) {
      if (e.type === "mouseenter") {
        this.showTooltip = true
      } else {
        this.showTooltip = false
      }
    },

    onRetry() {
      // TODO: Add script later
    },

    onCancel() {
      // TODO: Add script later
    }
  }
}
</script>

<style lang="sass" scoped>
  @import "@/common/styles/mixins.sass"

  .customer-create-emr
    width: 100%
    height: 100%

    &__wrapper
      background: #ffffff
      padding: 50px 0

    &__title
      text-align: center

    &__forms
      display: flex
      flex-direction: column
      gap: 20px
      margin: 0 auto
      max-width: 450px

    &__files
      margin: 10px 0 20px

    &__files-title
      margin-bottom: 20px

    &__files-items
      display: flex
      flex-direction: column
      gap: 20px
      padding-right: .35rem
      max-height: calc(116px * 3)
      overflow-y: auto
      overflow-x: hidden

      &::-webkit-scrollbar-track
        background-color: #f2f2ff

      &::-webkit-scrollbar
        width: 0.25rem

      &::-webkit-scrollbar-thumb
        border-radius: 0.625rem
        background: #a1a1ff

    &__files-loading
      &::v-deep
        .ui-debio-modal__card
          max-width: 600px

    &__file-item
      padding: 12px 20px
      border-radius: 4px
      border-style: dashed
      border-color: #8AC1FF
      background: #F9F9FF
      transition: all cubic-bezier(.7, -0.04, .61, 1.14) .3s

      &--skeleton
        background: #F5F7F9
        border: unset
        width: 100%
        height: 120px
        position: relative

        &::before
          content: ""
          display: block
          position: absolute
          top: 0
          left: 0
          width: 300px
          height: 100%
          background: rgba(255, 255, 255, .5)
          animation: shine infinite 1s

      &:hover
        background: #f2f2ff
        border-color: #a1a1ff

      &--no-file
        height: 64px

      &--error
        border-color: #c400a5

        &::v-deep
          .customer-create-emr__file-icon > svg
            color: #c400a5 !important

        .customer-create-emr__file-name
          color: #c400a5

    &__file-title
      font-weight: 600
      overflow: hidden
      white-space: nowrap
      text-overflow: ellipsis
      @include body-text-1

    &__file-name
      max-width: 320px
      white-space: nowrap
      overflow: hidden
      text-overflow: ellipsis
      @include body-text-5

    &__file-description
      margin-top: 10px
      display: -webkit-box
      -webkit-line-clamp: 2
      -webkit-box-orient: vertical
      overflow: hidden
      color: #595959
      @include body-text-4

    &__file-details
      margin-top: 12px
      display: flex
      justify-content: space-between

      &--left,
      &--right
        display: flex
        align-items: center
        gap: 10px

    &__file-edit,
    &__file-delete
      cursor: pointer

    &::v-deep
      .ui-debio-modal__card-title
        @include h2
        font-weight: 700

  .modal-confirm
    &__title
      width: 212px
      text-align: center

    &__cta
      width: 250px
      margin: 0 auto

  .modal-password
    &__cta
      gap: 20px

    &__tx-text
      position: relative

    &__tooltip
      max-width: 143px
      padding: 10px
      position: absolute
      top: 35px
      z-index: 10
      background: #fff
      border: 1px solid #D3C9D1
      right: -120px
      transition: all .3s ease-in-out
      visibility: hidden
      opacity: 0
      @include tiny-reg

      &::after
        position: absolute
        content: ""
        display: block
        top: -20px
        height: 20px
        border-color: transparent transparent #FFF transparent
        border-style: solid
        border-width: 8px

      &::before
        position: absolute
        content: ""
        display: block
        top: -21px
        height: 20px
        border-color: transparent transparent #D3C9D1 transparent
        border-style: solid
        border-width: 8px

      &--show
        opacity: 1
        visibility: visible

  .modal-files-upload
    &__files
      display: flex
      flex-direction: column
      gap: 35px

    &__file-details
      display: flex
      align-items: center
      gap: 115px
      justify-content: space-between

    &__file-name
      max-width: 360px
      overflow: hidden
      text-overflow: ellipsis
      white-space: nowrap
      @include body-text-medium-2

    &__progress
      display: flex
      align-items: center
      justify-content: space-between
      gap: 15px
      margin-top: 8px

    &__status
      display: flex
      align-items: center
      gap: 8px

    &__file-percent,
    &__error-message
      @include body-text-5

    &__error-message
      color: #F5222D

    &__file-percent
      color: #8C8C8C

    &__progress-check
      width: 12px
      height: 12px
      border-radius: 50%

      &--success
        background: linear-gradient(225deg, #76DA92 0%, #61FFF6 100%)

      &--cancel
        background: #757274

      &--failed
        background: #FF525B

    &__progressbar
      width: 100%
      height: 6px
      background: #E7E7E7
      border-radius: 3px

      &--thumb
        width: 0%
        height: 100%
        background: #6FE4AF
        border-radius: inherit

  @keyframes shine
    0%
      transform: skew(25deg) translateX(-1000px)
    100%
      transform: skew(25deg) translateX(1000px)
</style>
