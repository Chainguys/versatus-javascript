import { ComputeInputs } from '@versatus/versatus-javascript/lib/types'

import {
  buildBurnInstruction,
  buildCreateInstruction,
  buildMintInstructions,
  buildProgramUpdateField,
  buildTokenDistributionInstruction,
  buildTokenUpdateField,
  buildTransferInstruction,
  buildUpdateInstruction,
} from '@versatus/versatus-javascript/lib/programs/instruction-builders/builder-helpers'
import { THIS } from '@versatus/versatus-javascript/lib/consts'
import {
  Program,
  ProgramUpdate,
} from '@versatus/versatus-javascript/lib/programs/Program'
import {
  Address,
  AddressOrNamespace,
} from '@versatus/versatus-javascript/lib/programs/Address-Namespace'
import {
  TokenOrProgramUpdate,
  TokenUpdate,
} from '@versatus/versatus-javascript/lib/programs/Token'
import { Outputs } from '@versatus/versatus-javascript/lib/programs/Outputs'
import {
  checkIfValuesAreUndefined,
  formatAmountToHex,
  formatHexToAmount,
  parseAmountToBigInt,
  validate,
  validateAndCreateJsonString,
} from '@versatus/versatus-javascript/lib/utils'

class NonFungibleTokenProgram extends Program {
  constructor() {
    super()
    Object.assign(this.methodStrategies, {
      burn: this.burn.bind(this),
      create: this.create.bind(this),
      mint: this.mint.bind(this),
      transfer: this.transfer.bind(this),
    })
  }

  burn(computeInputs: ComputeInputs) {
    try {
      const { transaction } = computeInputs
      const { transactionInputs, from } = transaction
      const txInputs = validate(
        JSON.parse(transactionInputs),
        'unable to parse transactionInputs'
      )

      const tokenIds = validate(txInputs.tokenIds, 'missing tokenIds...')

      const burnInstruction = buildBurnInstruction({
        from: transaction.from,
        caller: transaction.from,
        programId: THIS,
        tokenAddress: transaction.programId,
        tokenIds,
      })

      return new Outputs(computeInputs, [burnInstruction]).toJson()
    } catch (e) {
      throw e
    }
  }

  create(computeInputs: ComputeInputs) {
    try {
      const { transaction } = computeInputs
      const { transactionInputs, from } = transaction
      const txInputs = validate(
        JSON.parse(transactionInputs),
        'unable to parse transactionInputs'
      )

      // metadata
      const totalSupply = txInputs?.totalSupply
      const initializedSupply = txInputs?.initializedSupply
      const symbol = txInputs?.symbol
      const name = txInputs?.name
      const recipientAddress = txInputs?.to ?? transaction.to

      // data
      const imgUrl = txInputs?.imgUrl
      const imgUrls = txInputs?.imgUrls
      const paymentProgramAddress = txInputs?.paymentProgramAddress
      const price = txInputs?.price
      const methods = 'approve,create,burn,mint,update'

      validate(parseFloat(price), 'invalid price')
      validate(
        parseInt(initializedSupply) <= parseInt(totalSupply),
        'invalid supply'
      )

      validate(
        parseInt(formatHexToAmount(formatAmountToHex(initializedSupply))) <= 16,
        'woah partner, too many tokens for beta. 16 max.'
      )

      const metadataStr = validateAndCreateJsonString({
        symbol,
        name,
        totalSupply,
        initializedSupply,
      })

      const addProgramMetadata = buildProgramUpdateField({
        field: 'metadata',
        value: metadataStr,
        action: 'extend',
      })

      // generate a map of tokenIds
      const tokenIds: Record<string, any> = {}
      for (let i = 0; i < parseInt(initializedSupply, 10); i++) {
        tokenIds[i.toString()] = {
          ownerAddress: THIS,
          imgUrl: imgUrls[i],
        }
      }

      const dataStr = validateAndCreateJsonString({
        type: 'non-fungible',
        imgUrl,
        paymentProgramAddress,
        price,
        methods,
        tokenMap: JSON.stringify(tokenIds),
      })

      const addProgramData = buildProgramUpdateField({
        field: 'data',
        value: dataStr,
        action: 'extend',
      })

      const programUpdateInstructions = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'programUpdate',
          new ProgramUpdate(new AddressOrNamespace(THIS), [
            addProgramMetadata,
            addProgramData,
          ])
        ),
      })

      const addMetadataToToken = buildTokenUpdateField({
        field: 'metadata',
        value: metadataStr,
        action: 'extend',
      })

      const addDataToToken = buildTokenUpdateField({
        field: 'data',
        value: dataStr,
        action: 'extend',
      })

      const distributionInstruction = buildTokenDistributionInstruction({
        programId: THIS,
        initializedSupply,
        to: recipientAddress,
        tokenUpdates: [addDataToToken, addMetadataToToken],
        nonFungible: true,
      })

      const createInstruction = buildCreateInstruction({
        from,
        totalSupply,
        initializedSupply,
        programId: THIS,
        programOwner: from,
        programNamespace: THIS,
        distributionInstruction,
      })

      return new Outputs(computeInputs, [
        createInstruction,
        programUpdateInstructions,
      ]).toJson()
    } catch (e) {
      throw e
    }
  }

  mint(computeInputs: ComputeInputs) {
    try {
      const { transaction } = computeInputs
      const currProgramInfo = validate(
        computeInputs.accountInfo?.programs[transaction.to],
        'token missing from self...'
      )

      const tokenData = validate(
        currProgramInfo?.data,
        'token missing required data to mint...'
      )

      const price = parseInt(tokenData.price)
      const paymentProgramAddress = tokenData.paymentProgramAddress

      const availableTokenIds = validate(
        currProgramInfo?.tokenIds,
        'missing nfts to mint...'
      )

      const quantityAvailable = validate(
        parseInt(availableTokenIds?.length),
        'minted out...'
      )

      const { transactionInputs } = transaction
      const parsedInputMetadata = JSON.parse(transactionInputs)

      const quantity = validate(
        parseInt(parsedInputMetadata?.quantity),
        'please specify a quantity'
      )

      validate(
        quantity <= quantityAvailable,
        'not enough supply for quantity desired'
      )

      const tokenIds = []

      for (let i = 0; i < quantity; i++) {
        tokenIds.push(availableTokenIds[i])
      }

      const tokenMap = validate(
        JSON.parse(tokenData.tokenMap),
        'tokenMap is not valid'
      )

      const tokenIdMap: Record<string, any> = tokenMap
      for (let i = 0; i < tokenIds.length; i++) {
        const tokenIdStr = parseInt(formatHexToAmount(tokenIds[i])).toString()
        const token = tokenMap[tokenIdStr]
        tokenIdMap[tokenIdStr] = {
          ownerAddress: transaction.from,
          imgUrl: token.imgUrl,
        }
      }

      const amountNeededToMint = parseAmountToBigInt(
        (price * quantity).toString()
      )

      const mintInstructions = buildMintInstructions({
        from: transaction.from,
        programId: transaction.programId,
        paymentTokenAddress: paymentProgramAddress,
        inputValue: amountNeededToMint,
        returnedTokenIds: tokenIds,
      })

      const dataStr = validateAndCreateJsonString({
        ...tokenData,
        tokenMap: JSON.stringify(tokenIdMap),
      })

      const updateTokenIds = buildTokenUpdateField({
        field: 'data',
        value: dataStr,
        action: 'extend',
      })

      const tokenUpdateInstruction = buildUpdateInstruction({
        update: new TokenOrProgramUpdate(
          'tokenUpdate',
          new TokenUpdate(
            new AddressOrNamespace(new Address(transaction.from)),
            new AddressOrNamespace(THIS),
            [updateTokenIds]
          )
        ),
      })

      return new Outputs(computeInputs, [
        ...mintInstructions,
        tokenUpdateInstruction,
      ]).toJson()
    } catch (e) {
      throw e
    }
  }

  transfer(computeInputs: ComputeInputs) {
    try {
      const { transaction } = computeInputs
      const { transactionInputs, programId, from, to } = transaction
      const txInputs = validate(
        JSON.parse(transactionInputs),
        'unable to parse transactionInputs'
      )

      const { tokenIds, recipientAddress } = txInputs
      validate(Array.isArray(tokenIds), 'tokenIds must be an array')
      checkIfValuesAreUndefined({ tokenIds, recipientAddress })

      const transferArguments: {
        from: string
        to: string
        tokenAddress: string
        amount?: BigInt
        tokenIds?: string[]
      } = {
        from,
        to: recipientAddress,
        tokenAddress: programId,
        tokenIds: tokenIds,
      }

      const transferToCaller = buildTransferInstruction(transferArguments)

      return new Outputs(computeInputs, [transferToCaller]).toJson()
    } catch (e) {
      throw e
    }
  }
}

const start = (input: ComputeInputs) => {
  try {
    const contract = new NonFungibleTokenProgram()
    return contract.start(input)
  } catch (e) {
    throw e
  }
}

process.stdin.setEncoding('utf8')

let data = ''

process.stdin.on('readable', () => {
  try {
    let chunk

    while ((chunk = process.stdin.read()) !== null) {
      data += chunk
    }
  } catch (e) {
    throw e
  }
})

process.stdin.on('end', () => {
  try {
    const parsedData = JSON.parse(data)
    const result = start(parsedData)
    process.stdout.write(JSON.stringify(result))
  } catch (err) {
    // @ts-ignore
    process.stdout.write(err.message)
  }
})
