import {
  Program,
  ProgramUpdate,
} from '@versatus/versatus-javascript/lib/programs/Program'
import { ComputeInputs } from '@versatus/versatus-javascript/lib/types'
import { Outputs } from '@versatus/versatus-javascript/lib/programs/Outputs'

import {
  ETH_PROGRAM_ADDRESS,
  THIS,
} from '@versatus/versatus-javascript/lib/consts'
import {
  buildBurnInstruction,
  buildCreateInstruction,
  buildMintInstructions,
  buildProgramUpdateField,
  buildTokenDistributionInstruction,
  buildTokenUpdateField,
  buildUpdateInstruction,
} from '@versatus/versatus-javascript/lib/programs/instruction-builders/builder-helpers'
import { TokenOrProgramUpdate } from '@versatus/versatus-javascript/lib/programs/Token'
import { AddressOrNamespace } from '@versatus/versatus-javascript/lib/programs/Address-Namespace'
import {
  formatAmountToHex,
  formatHexToAmount,
  validate,
  validateAndCreateJsonString,
} from '@versatus/versatus-javascript/lib/utils'

/**
 * Class representing a snake program, extending the base `Program` class.
 * It encapsulates the core functionality and properties of the write
 * functionality of a fungible token.
 */
class SnakeProgram extends Program {
  /**
   * Constructs a new instance of the FungibleTokenProgram class.
   */
  constructor() {
    super()
    Object.assign(this.methodStrategies, {
      burn: this.burn.bind(this),
      create: this.create.bind(this),
      mint: this.mint.bind(this),
    })
  }

  burn(computeInputs: ComputeInputs) {
    const { transaction } = computeInputs
    const burnInstruction = buildBurnInstruction({
      from: transaction.from,
      caller: transaction.from,
      programId: THIS,
      tokenAddress: transaction.programId,
      amount: transaction.value,
    })

    return new Outputs(computeInputs, [burnInstruction]).toJson()
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
      for (let i = 1; i <= parseInt(initializedSupply, 10); i++) {
        tokenIds[formatAmountToHex(i.toString())] = {
          ownerAddress: THIS,
          data: JSON.stringify({ imgUrl }),
        }
      }

      const dataPayload = {
        type: 'non-fungible',
        imgUrl,
        paymentProgramAddress,
        price,
        methods,
        tokenMap: JSON.stringify(tokenIds),
      }

      const dataWSnek = dataPayload
      // @ts-ignore
      dataWSnek.snek =
        'PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImVuIj4KPGhlYWQ+CiAgICA8bWV0YSBjaGFyc2V0PSJVVEYtOCI+CiAgICA8bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEuMCI+CiAgICA8bWV0YSBodHRwLWVxdWl2PSJYLVVBLUNvbXBhdGlibGUiIGNvbnRlbnQ9ImllPWVkZ2UiPgogICAgPHNjcmlwdCBzcmM9Imh0dHBzOi8vY2RuLnRhaWx3aW5kY3NzLmNvbSI+PC9zY3JpcHQ+CiAgICA8dGl0bGU+U25ha2U8L3RpdGxlPgogICAgPHN0eWxlPgogICAgICAgIGJvZHkgewogICAgICAgICAgICBoZWlnaHQ6IDUwdmg7CiAgICAgICAgICAgIHdpZHRoOiAxMDB2dzsKICAgICAgICAgICAgZGlzcGxheTogZmxleDsKICAgICAgICAgICAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7CiAgICAgICAgICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7CiAgICAgICAgICAgIG1hcmdpbjogMDsKICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogYmxhY2s7CiAgICAgICAgfQoKICAgICAgICAjZ2FtZS1ib2FyZCB7CiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICNDQ0M7CiAgICAgICAgICAgIHdpZHRoOiA1MHZtaW47CiAgICAgICAgICAgIGhlaWdodDogNTB2bWluOwogICAgICAgICAgICBkaXNwbGF5OiBncmlkOwogICAgICAgICAgICBncmlkLXRlbXBsYXRlLXJvd3M6IHJlcGVhdCgyMSwgMWZyKTsKICAgICAgICAgICAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiByZXBlYXQoMjEsIDFmcik7CiAgICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDE2cHg7CiAgICAgICAgfQoKICAgICAgICAuc25ha2UgewogICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjZGIyNzc3OwogICAgICAgICAgICBib3JkZXI6IC4yNXZtaW4gc29saWQgYmxhY2s7CiAgICAgICAgfQoKICAgICAgICAuZm9vZCB7CiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6IGhzbCg1MCwgMTAwJSwgNTAlKTsKICAgICAgICAgICAgYm9yZGVyOiAuMjV2bWluIHNvbGlkIGJsYWNrOwogICAgICAgIH0KCiAgICAgICAgLm1vZGFsIHsKICAgICAgICAgICAgZGlzcGxheTogbm9uZTsgLyogSGlkZGVuIGJ5IGRlZmF1bHQgKi8KICAgICAgICAgICAgcG9zaXRpb246IGZpeGVkOyAvKiBTdGF5IGluIHBsYWNlICovCiAgICAgICAgICAgIHotaW5kZXg6IDE7IC8qIFNpdCBvbiB0b3AgKi8KICAgICAgICAgICAgbGVmdDogMDsKICAgICAgICAgICAgdG9wOiAwOwogICAgICAgICAgICB3aWR0aDogMTAwJTsgLyogRnVsbCB3aWR0aCAqLwogICAgICAgICAgICBoZWlnaHQ6IDEwMCU7IC8qIEZ1bGwgaGVpZ2h0ICovCiAgICAgICAgICAgIG92ZXJmbG93OiBhdXRvOyAvKiBFbmFibGUgc2Nyb2xsIGlmIG5lZWRlZCAqLwogICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2IoMCwwLDApOyAvKiBGYWxsYmFjayBjb2xvciAqLwogICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDAsMCwwLDAuNCk7IC8qIEJsYWNrIHcvIG9wYWNpdHkgKi8KICAgICAgICB9CgogICAgICAgIC5tb2RhbC1jb250ZW50IHsKICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogI2ZlZmVmZTsKICAgICAgICAgICAgbWFyZ2luOiAxNSUgYXV0bzsgLyogMTUlIGZyb20gdGhlIHRvcCBhbmQgY2VudGVyZWQgKi8KICAgICAgICAgICAgcGFkZGluZzogMjBweDsKICAgICAgICAgICAgYm9yZGVyOiA0cHggc29saWQgIzg4ODsKICAgICAgICAgICAgd2lkdGg6IDgwJTsgLyogQ291bGQgYmUgbW9yZSBvciBsZXNzLCBkZXBlbmRpbmcgb24gc2NyZWVuIHNpemUgKi8KICAgICAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyOwogICAgICAgICAgICBib3JkZXItcmFkaXVzOiAyNnB4OwogICAgICAgICAgICBmb250LXNpemU6IDI0cHg7CiAgICAgICAgICAgIGZvbnQtZmFtaWx5OiBzYW5zLXNlcmlmOwogICAgICAgICAgICBmb250LXdlaWdodDogYm9sZGVyOwogICAgICAgIH0KCiAgICAgICAgYnV0dG9uIHsKICAgICAgICAgICAgcGFkZGluZzogMTBweCAyMHB4OwogICAgICAgICAgICBjdXJzb3I6IHBvaW50ZXI7CiAgICAgICAgfQogICAgPC9zdHlsZT4KCiAgICA8c2NyaXB0PgogICAgICAgIGNvbnNvbGUubG9nKCJURVNUSU5HIikKICAgIDwvc2NyaXB0Pgo8L2hlYWQ+Cjxib2R5Pgo8ZGl2IGlkPSJ3YWxsZXQtY29ubmVjdC1tb2RhbCIgY2xhc3M9Im1vZGFsIHRleHQtYmxhY2siPgogICAgPGRpdiBjbGFzcz0ibW9kYWwtY29udGVudCI+CiAgICAgICAgPGltZyBzcmM9Imh0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9HSnc2SXZyWHdBQVlGcWI/Zm9ybWF0PWpwZyZuYW1lPW1lZGl1bSIgY2xhc3M9InJvdW5kZWQtbWQgdy02NCBoLTY0IG0tYXV0byI+CiAgICAgICAgPHAgaWQ9Im1vZGFsLXRleHQiIGNsYXNzPSIiPkxBU1IgU25lazwvcD4KICAgICAgICA8cCBpZD0ibW9kYWwtYWRkcmVzcyIgY2xhc3M9InRleHQtc20gbWItNiI+PC9wPgogICAgICAgIDxidXR0b24gaWQ9Im1vZGFsLWJ1dHRvbiIgY2xhc3M9ImJnLXBpbmstNjAwIGJvcmRlci1ibGFjayBwLTYgcm91bmRlZC1tZCB0ZXh0LXdoaXRlIGhvdmVyOm9wYWNpdHktNTAiPkNvbm5lY3QgV2FsbGV0PC9idXR0b24+CiAgICA8L2Rpdj4KPC9kaXY+CjxkaXYgaWQ9ImdhbWUtYm9hcmQiPjwvZGl2Pgo8c2NyaXB0PgogICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uICgpIHsKICAgICAgICB0cnkgewogICAgICAgICAgICBsZXQgbGFzdFJlbmRlclRpbWUgPSAwCiAgICAgICAgICAgIGxldCBnYW1lT3ZlciA9IGZhbHNlCiAgICAgICAgICAgIGNvbnN0IGdhbWVCb2FyZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnYW1lLWJvYXJkJykKICAgICAgICAgICAgbGV0IGNvbm5lY3RlZCA9IGZhbHNlCiAgICAgICAgICAgIGxldCBjb25uZWN0ZWRBY2NvdW50ID0gbnVsbAogICAgICAgICAgICBjb25zdCBtb2RhbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd3YWxsZXQtY29ubmVjdC1tb2RhbCcpOwogICAgICAgICAgICBjb25zdCBtb2RhbEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtb2RhbC1idXR0b24nKTsKICAgICAgICAgICAgY29uc3QgbW9kYWxUZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21vZGFsLXRleHQnKTsKICAgICAgICAgICAgY29uc3QgbW9kYWxBZGRyZXNzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21vZGFsLWFkZHJlc3MnKTsKICAgICAgICAgICAgbGV0IGdhbWVTdGFydGVkID0gZmFsc2U7CiAgICAgICAgICAgIG1vZGFsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snOwogICAgICAgICAgICBtb2RhbEJ1dHRvbi5vbmNsaWNrID0gZnVuY3Rpb24oKSB7CiAgICAgICAgICAgICAgICBpZiAoIWdhbWVTdGFydGVkKSB7CiAgICAgICAgICAgICAgICAgICAgd2luZG93Py5sYXNyPy5yZXF1ZXN0QWNjb3VudCgpLnRoZW4oKGFjY291bnQpID0+IHsKICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYWNjb3VudCk7CiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3RlZEFjY291bnQgPSBhY2NvdW50CiAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3RlZCA9IHRydWU7IC8vIFRoaXMgc2hvdWxkIGJlIGRlY2xhcmVkIGF0IGEgaGlnaGVyIHNjb3BlIGlmIG5lZWRlZCBlbHNld2hlcmUKICAgICAgICAgICAgICAgICAgICAgICAgbW9kYWxUZXh0LnRleHRDb250ZW50ID0gYENvbm5lY3RlZCB0bzpgOwogICAgICAgICAgICAgICAgICAgICAgICBtb2RhbEFkZHJlc3MudGV4dENvbnRlbnQgPSBgJHthY2NvdW50LmFkZHJlc3N9YDsKICAgICAgICAgICAgICAgICAgICAgICAgbW9kYWxCdXR0b24udGV4dENvbnRlbnQgPSAnU3RhcnQgR2FtZSc7CiAgICAgICAgICAgICAgICAgICAgICAgIGdhbWVTdGFydGVkID0gdHJ1ZTsKICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHsKICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQ29ubmVjdGlvbiBmYWlsZWQ6JywgZXJyb3IpOwogICAgICAgICAgICAgICAgICAgIH0pOwogICAgICAgICAgICAgICAgfSBlbHNlIHsKICAgICAgICAgICAgICAgICAgICBtb2RhbC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnOyAvLyBIaWRlIG1vZGFsIGFuZCBzdGFydCB0aGUgZ2FtZQogICAgICAgICAgICAgICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUobWFpbik7CiAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgIH07CgogICAgICAgICAgICBhc3luYyBmdW5jdGlvbiBtYWluKGN1cnJlbnRUaW1lKSB7CiAgICAgICAgICAgICAgICB0cnkgewoKICAgICAgICAgICAgICAgICAgICBpZiAoZ2FtZU92ZXIpIHsKICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbmZpcm0oJ1lvdSBsb3N0LiBQcmVzcyBvayB0byByZXN0YXJ0LicpKSB7CiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSAnL2FwcHMvc25laycKICAgICAgICAgICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4KICAgICAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgICAgICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShtYWluKQogICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlY29uZHNTaW5jZUxhc3RSZW5kZXIgPSAoY3VycmVudFRpbWUgLSBsYXN0UmVuZGVyVGltZSkgLyAxMDAwCiAgICAgICAgICAgICAgICAgICAgaWYgKHNlY29uZHNTaW5jZUxhc3RSZW5kZXIgPCAxIC8gU05BS0VfU1BFRUQpIHJldHVybgogICAgICAgICAgICAgICAgICAgIGxhc3RSZW5kZXJUaW1lID0gY3VycmVudFRpbWUKICAgICAgICAgICAgICAgICAgICB1cGRhdGUoKQogICAgICAgICAgICAgICAgICAgIGRyYXcoKQogICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkgewogICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpCiAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgIH0KCgogICAgICAgICAgICBmdW5jdGlvbiB1cGRhdGVTbmFrZSgpIHsKICAgICAgICAgICAgICAgIGFkZFNlZ21lbnRzKCkKICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0RGlyZWN0aW9uID0gZ2V0SW5wdXREaXJlY3Rpb24oKQogICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IHNuYWtlQm9keS5sZW5ndGggLSAyOyBpID49IDA7IGktLSkgewogICAgICAgICAgICAgICAgICAgIHNuYWtlQm9keVtpICsgMV0gPSB7Li4uc25ha2VCb2R5W2ldfQogICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgc25ha2VCb2R5WzBdLnggKz0gaW5wdXREaXJlY3Rpb24ueAogICAgICAgICAgICAgICAgc25ha2VCb2R5WzBdLnkgKz0gaW5wdXREaXJlY3Rpb24ueQogICAgICAgICAgICB9CgogICAgICAgICAgICBmdW5jdGlvbiBkcmF3U25ha2UoZ2FtZUJvYXJkKSB7CiAgICAgICAgICAgICAgICBzbmFrZUJvZHkuZm9yRWFjaChzZWdtZW50ID0+IHsKICAgICAgICAgICAgICAgICAgICBjb25zdCBzbmFrZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKQogICAgICAgICAgICAgICAgICAgIHNuYWtlRWxlbWVudC5zdHlsZS5ncmlkUm93U3RhcnQgPSBzZWdtZW50LnkKICAgICAgICAgICAgICAgICAgICBzbmFrZUVsZW1lbnQuc3R5bGUuZ3JpZENvbHVtblN0YXJ0ID0gc2VnbWVudC54CiAgICAgICAgICAgICAgICAgICAgc25ha2VFbGVtZW50LmNsYXNzTGlzdC5hZGQoJ3NuYWtlJykKICAgICAgICAgICAgICAgICAgICBnYW1lQm9hcmQuYXBwZW5kQ2hpbGQoc25ha2VFbGVtZW50KQogICAgICAgICAgICAgICAgfSkKICAgICAgICAgICAgfQoKICAgICAgICAgICAgZnVuY3Rpb24gZXhwYW5kU25ha2UoYW1vdW50KSB7CiAgICAgICAgICAgICAgICBuZXdTZWdtZW50cyArPSBhbW91bnQKICAgICAgICAgICAgfQoKICAgICAgICAgICAgZnVuY3Rpb24gb25TbmFrZShwb3NpdGlvbiwge2lnbm9yZUhlYWQgPSBmYWxzZX0gPSB7fSkgewogICAgICAgICAgICAgICAgcmV0dXJuIHNuYWtlQm9keS5zb21lKChzZWdtZW50LCBpbmRleCkgPT4gewogICAgICAgICAgICAgICAgICAgIGlmIChpZ25vcmVIZWFkICYmIGluZGV4ID09PSAwKSByZXR1cm4gZmFsc2UKICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXF1YWxQb3NpdGlvbnMoc2VnbWVudCwgcG9zaXRpb24pCiAgICAgICAgICAgICAgICB9KQogICAgICAgICAgICB9CgogICAgICAgICAgICBmdW5jdGlvbiBnZXRTbmFrZUhlYWQoKSB7CiAgICAgICAgICAgICAgICByZXR1cm4gc25ha2VCb2R5WzBdCiAgICAgICAgICAgIH0KCiAgICAgICAgICAgIGZ1bmN0aW9uIHNuYWtlSW50ZXJzZWN0aW9uKCkgewogICAgICAgICAgICAgICAgcmV0dXJuIG9uU25ha2Uoc25ha2VCb2R5WzBdLCB7aWdub3JlSGVhZDogdHJ1ZX0pCiAgICAgICAgICAgIH0KCiAgICAgICAgICAgIGZ1bmN0aW9uIGVxdWFsUG9zaXRpb25zKHBvczEsIHBvczIpIHsKICAgICAgICAgICAgICAgIHJldHVybiBwb3MxLnggPT09IHBvczIueCAmJiBwb3MxLnkgPT09IHBvczIueQogICAgICAgICAgICB9CgogICAgICAgICAgICBmdW5jdGlvbiBhZGRTZWdtZW50cygpIHsKICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbmV3U2VnbWVudHM7IGkrKykgewogICAgICAgICAgICAgICAgICAgIHNuYWtlQm9keS5wdXNoKHsuLi5zbmFrZUJvZHlbc25ha2VCb2R5Lmxlbmd0aCAtIDFdfSkKICAgICAgICAgICAgICAgIH0KCiAgICAgICAgICAgICAgICBuZXdTZWdtZW50cyA9IDAKICAgICAgICAgICAgfQoKCiAgICAgICAgICAgIGNvbnN0IFNOQUtFX1NQRUVEID0gNQogICAgICAgICAgICBjb25zdCBzbmFrZUJvZHkgPSBbe3g6IDExLCB5OiAxMX1dCiAgICAgICAgICAgIGxldCBuZXdTZWdtZW50cyA9IDAKCiAgICAgICAgICAgIGxldCBpbnB1dERpcmVjdGlvbiA9IHt4OiAwLCB5OiAwfQogICAgICAgICAgICBsZXQgbGFzdElucHV0RGlyZWN0aW9uID0ge3g6IDAsIHk6IDB9CgogICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGUgPT4gewogICAgICAgICAgICAgICAgc3dpdGNoIChlLmtleSkgewogICAgICAgICAgICAgICAgICAgIGNhc2UgJ0Fycm93VXAnOgogICAgICAgICAgICAgICAgICAgICAgICBpZiAobGFzdElucHV0RGlyZWN0aW9uLnkgIT09IDApIGJyZWFrCiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0RGlyZWN0aW9uID0ge3g6IDAsIHk6IC0xfQogICAgICAgICAgICAgICAgICAgICAgICBicmVhawogICAgICAgICAgICAgICAgICAgIGNhc2UgJ0Fycm93RG93bic6CiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsYXN0SW5wdXREaXJlY3Rpb24ueSAhPT0gMCkgYnJlYWsKICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXREaXJlY3Rpb24gPSB7eDogMCwgeTogMX0KICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWsKICAgICAgICAgICAgICAgICAgICBjYXNlICdBcnJvd0xlZnQnOgogICAgICAgICAgICAgICAgICAgICAgICBpZiAobGFzdElucHV0RGlyZWN0aW9uLnggIT09IDApIGJyZWFrCiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0RGlyZWN0aW9uID0ge3g6IC0xLCB5OiAwfQogICAgICAgICAgICAgICAgICAgICAgICBicmVhawogICAgICAgICAgICAgICAgICAgIGNhc2UgJ0Fycm93UmlnaHQnOgogICAgICAgICAgICAgICAgICAgICAgICBpZiAobGFzdElucHV0RGlyZWN0aW9uLnggIT09IDApIGJyZWFrCiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0RGlyZWN0aW9uID0ge3g6IDEsIHk6IDB9CiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrCiAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgIH0pCgogICAgICAgICAgICBmdW5jdGlvbiBnZXRJbnB1dERpcmVjdGlvbigpIHsKICAgICAgICAgICAgICAgIGxhc3RJbnB1dERpcmVjdGlvbiA9IGlucHV0RGlyZWN0aW9uCiAgICAgICAgICAgICAgICByZXR1cm4gaW5wdXREaXJlY3Rpb24KICAgICAgICAgICAgfQoKICAgICAgICAgICAgY29uc3QgR1JJRF9TSVpFID0gMjEKCiAgICAgICAgICAgIGZ1bmN0aW9uIHJhbmRvbUdyaWRQb3NpdGlvbigpIHsKICAgICAgICAgICAgICAgIHJldHVybiB7CiAgICAgICAgICAgICAgICAgICAgeDogTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogR1JJRF9TSVpFKSArIDEsCiAgICAgICAgICAgICAgICAgICAgeTogTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogR1JJRF9TSVpFKSArIDEKICAgICAgICAgICAgICAgIH0KICAgICAgICAgICAgfQoKICAgICAgICAgICAgZnVuY3Rpb24gb3V0c2lkZUdyaWQocG9zaXRpb24pIHsKICAgICAgICAgICAgICAgIHJldHVybiAoCiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb24ueCA8IDEgfHwgcG9zaXRpb24ueCA+IEdSSURfU0laRSB8fAogICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uLnkgPCAxIHx8IHBvc2l0aW9uLnkgPiBHUklEX1NJWkUKICAgICAgICAgICAgICAgICkKICAgICAgICAgICAgfQoKICAgICAgICAgICAgbGV0IGZvb2QgPSBnZXRSYW5kb21Gb29kUG9zaXRpb24oKQogICAgICAgICAgICBjb25zdCBFWFBBTlNJT05fUkFURSA9IDUKCiAgICAgICAgICAgIGZ1bmN0aW9uIHVwZGF0ZUZvb2QoKSB7CiAgICAgICAgICAgICAgICBpZiAob25TbmFrZShmb29kKSkgewogICAgICAgICAgICAgICAgICAgIGV4cGFuZFNuYWtlKEVYUEFOU0lPTl9SQVRFKQogICAgICAgICAgICAgICAgICAgIGZvb2QgPSBnZXRSYW5kb21Gb29kUG9zaXRpb24oKQogICAgICAgICAgICAgICAgfQogICAgICAgICAgICB9CgogICAgICAgICAgICBmdW5jdGlvbiBkcmF3Rm9vZChnYW1lQm9hcmQpIHsKICAgICAgICAgICAgICAgIGNvbnN0IGZvb2RFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykKICAgICAgICAgICAgICAgIGZvb2RFbGVtZW50LnN0eWxlLmdyaWRSb3dTdGFydCA9IGZvb2QueQogICAgICAgICAgICAgICAgZm9vZEVsZW1lbnQuc3R5bGUuZ3JpZENvbHVtblN0YXJ0ID0gZm9vZC54CiAgICAgICAgICAgICAgICBmb29kRWxlbWVudC5jbGFzc0xpc3QuYWRkKCdmb29kJykKICAgICAgICAgICAgICAgIGdhbWVCb2FyZC5hcHBlbmRDaGlsZChmb29kRWxlbWVudCkKICAgICAgICAgICAgfQoKICAgICAgICAgICAgZnVuY3Rpb24gZ2V0UmFuZG9tRm9vZFBvc2l0aW9uKCkgewogICAgICAgICAgICAgICAgbGV0IG5ld0Zvb2RQb3NpdGlvbgogICAgICAgICAgICAgICAgd2hpbGUgKG5ld0Zvb2RQb3NpdGlvbiA9PSBudWxsIHx8IG9uU25ha2UobmV3Rm9vZFBvc2l0aW9uKSkgewogICAgICAgICAgICAgICAgICAgIG5ld0Zvb2RQb3NpdGlvbiA9IHJhbmRvbUdyaWRQb3NpdGlvbigpCiAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgICAgICByZXR1cm4gbmV3Rm9vZFBvc2l0aW9uCiAgICAgICAgICAgIH0KCiAgICAgICAgICAgIGNvbnN0IHNpZ25NZXNzYWdlID0gYXN5bmMgKGluaXRUeCkgPT4gewogICAgICAgICAgICAgICAgaWYgKHdpbmRvdz8ubGFzcikgewogICAgICAgICAgICAgICAgICAgIHRyeSB7CiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB3aW5kb3cubGFzci5zaWduTWVzc2FnZShpbml0VHgpOwogICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHsKICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTsKICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGUubWVzc2FnZSk7CiAgICAgICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgfSBlbHNlIHsKICAgICAgICAgICAgICAgICAgICBhbGVydCgiUGxlYXNlIGluc3RhbGwgTEFTUiBDaHJvbWUgRXh0ZW5zaW9uIik7CiAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgIH07CgogICAgICAgICAgICBmdW5jdGlvbiB1cGRhdGUoKSB7CiAgICAgICAgICAgICAgICB1cGRhdGVTbmFrZSgpCiAgICAgICAgICAgICAgICB1cGRhdGVGb29kKCkKICAgICAgICAgICAgICAgIGNoZWNrRGVhdGgoKQogICAgICAgICAgICB9CgogICAgICAgICAgICBmdW5jdGlvbiBkcmF3KCkgewogICAgICAgICAgICAgICAgZ2FtZUJvYXJkLmlubmVySFRNTCA9ICcnCiAgICAgICAgICAgICAgICBkcmF3U25ha2UoZ2FtZUJvYXJkKQogICAgICAgICAgICAgICAgZHJhd0Zvb2QoZ2FtZUJvYXJkKQogICAgICAgICAgICB9CgogICAgICAgICAgICBmdW5jdGlvbiBjaGVja0RlYXRoKCkgewogICAgICAgICAgICAgICAgZ2FtZU92ZXIgPSBvdXRzaWRlR3JpZChnZXRTbmFrZUhlYWQoKSkgfHwgc25ha2VJbnRlcnNlY3Rpb24oKQogICAgICAgICAgICB9CgoKICAgICAgICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShtYWluKQoKICAgICAgICB9IGNhdGNoIChlKSB7CiAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpCiAgICAgICAgfQogICAgfSkKPC9zY3JpcHQ+CjwvYm9keT4KPC9odG1sPgo='

      const dataStr = validateAndCreateJsonString(dataPayload)
      const dataSnekStr = validateAndCreateJsonString(dataWSnek)

      const addProgramData = buildProgramUpdateField({
        field: 'data',
        value: dataSnekStr,
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
    const { transaction } = computeInputs
    const inputTokenAddress = ETH_PROGRAM_ADDRESS
    const inputValue = BigInt(transaction?.value)
    const conversionRate = BigInt(2)
    const returnedValue = inputValue / conversionRate

    const mintInstructions = buildMintInstructions({
      from: transaction.from,
      programId: transaction.programId,
      paymentTokenAddress: inputTokenAddress,
      inputValue: inputValue,
      returnedValue: returnedValue,
    })

    return new Outputs(computeInputs, mintInstructions).toJson()
  }
}

const start = (input: ComputeInputs) => {
  const contract = new SnakeProgram()
  return contract.start(input)
}

process.stdin.setEncoding('utf8')

let data = ''

process.stdin.on('readable', () => {
  let chunk
  while ((chunk = process.stdin.read()) !== null) {
    data += chunk
  }
})

process.stdin.on('end', () => {
  try {
    const parsedData = JSON.parse(data)
    const result = start(parsedData)
    process.stdout.write(JSON.stringify(result))
  } catch (err) {
    console.error('Failed to parse JSON input:', err)
  }
})
