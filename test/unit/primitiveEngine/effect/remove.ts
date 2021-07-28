import { waffle } from 'hardhat'
import { expect } from 'chai'
import { BigNumber, constants, BytesLike } from 'ethers'

import { parseWei } from 'web3-units'
import { removeFragment } from '../fragments'
import { computePoolId } from '../../utils'

import loadContext, { DEFAULT_CONFIG as config } from '../../context'
const { strike, sigma, maturity } = config

const delLiquidity = parseWei('1')
const empty: BytesLike = constants.HashZero
let poolId: string
let posId: string

describe('remove', function () {
  before(async function () {
    loadContext(waffle.provider, ['engineCreate', 'engineDeposit', 'engineAllocate', 'engineRemove'], removeFragment)
  })

  describe('when removing to margin', function () {
    beforeEach(async function () {
      poolId = computePoolId(this.contracts.factory.address, maturity.raw, sigma.raw, strike.raw)
      posId = await this.contracts.engineRemove.getPosition(poolId)
    })

    describe('success cases', function () {
      it('updates the margin', async function () {
        await this.contracts.engineRemove.removeToMargin(poolId, delLiquidity.raw, empty)

        const res = await this.contracts.engine.reserves(poolId)
        const delRisky = delLiquidity.mul(res.reserveRisky).div(res.liquidity)
        const delStable = delLiquidity.mul(res.reserveStable).div(res.liquidity)

        const margin = await this.contracts.engine.margins(this.contracts.engineRemove.address)
        expect(margin.balanceRisky).to.equal(delRisky.raw)
        expect(margin.balanceStable).to.equal(delStable.raw)
      })

      it('updates the position', async function () {
        await this.contracts.engineRemove.removeToMargin(poolId, delLiquidity.raw, empty)

        expect(await this.contracts.engine.positions(posId)).to.be.deep.eq([
          BigNumber.from('0'),
          parseWei('9').raw,
          BigNumber.from('0'),
        ])
      })

      it('updates the reserves', async function () {
        const res = await this.contracts.engine.reserves(poolId)
        const delRisky = delLiquidity.mul(res.reserveRisky).div(res.liquidity)
        const delStable = delLiquidity.mul(res.reserveStable).div(res.liquidity)

        await this.contracts.engineRemove.removeToMargin(poolId, delLiquidity.raw, empty)

        const updatedRes = await this.contracts.engine.reserves(poolId)
        expect(updatedRes.liquidity).to.equal(res.liquidity.sub(delLiquidity.raw))
        expect(updatedRes.reserveRisky).to.equal(res.reserveRisky.sub(delRisky.raw))
        expect(updatedRes.reserveStable).to.equal(res.reserveStable.sub(delStable.raw))
      })

      it('emits the Removed event', async function () {
        const res = await this.contracts.engine.reserves(poolId)
        const delRisky = delLiquidity.mul(res.reserveRisky).div(res.liquidity)
        const delStable = delLiquidity.mul(res.reserveStable).div(res.liquidity)

        await expect(this.contracts.engineRemove.removeToMargin(poolId, delLiquidity.raw, empty))
          .to.emit(this.contracts.engine, 'Removed')
          .withArgs(this.contracts.engineRemove.address, delRisky.raw, delStable.raw)
      })
    })

    describe('fail cases', function () {
      it('reverts if value is 0', async function () {
        await expect(this.contracts.engineRemove.removeToMargin(poolId, 0, empty)).to.be.revertedWith('ZeroLiquidityError()')
      })

      it('reverts if required amount is too big', async function () {
        await expect(this.contracts.engineRemove.removeToMargin(poolId, parseWei('11').raw, empty)).to.be.reverted
      })
    })
  })

  describe('when removing to external', function () {
    beforeEach(async function () {
      poolId = computePoolId(this.contracts.factory.address, maturity.raw, sigma.raw, strike.raw)
      posId = await this.contracts.engineRemove.getPosition(poolId)
    })

    describe('success cases', function () {
      it('transfers the tokens', async function () {
        await this.contracts.engineRemove.removeToExternal(poolId, delLiquidity.raw, empty)

        const res = await this.contracts.engine.reserves(poolId)
        const delRisky = delLiquidity.mul(res.reserveRisky).div(res.liquidity)
        const delStable = delLiquidity.mul(res.reserveStable).div(res.liquidity)

        expect(await this.contracts.risky.balanceOf(this.contracts.engineRemove.address)).to.equal(delRisky.raw)

        expect(await this.contracts.stable.balanceOf(this.contracts.engineRemove.address)).to.equal(delStable.raw)
      })

      it('updates the position', async function () {
        await this.contracts.engineRemove.removeToExternal(poolId, delLiquidity.raw, empty)

        expect(await this.contracts.engine.positions(posId)).to.be.deep.eq([
          BigNumber.from('0'),
          parseWei('9').raw,
          BigNumber.from('0'),
        ])
      })

      it('updates the reserves', async function () {
        const res = await this.contracts.engine.reserves(poolId)
        const delRisky = delLiquidity.mul(res.reserveRisky).div(res.liquidity)
        const delStable = delLiquidity.mul(res.reserveStable).div(res.liquidity)

        await this.contracts.engineRemove.removeToExternal(poolId, delLiquidity.raw, empty)

        const updatedRes = await this.contracts.engine.reserves(poolId)
        expect(updatedRes.liquidity).to.equal(res.liquidity.sub(delLiquidity.raw))
        expect(updatedRes.reserveRisky).to.equal(res.reserveRisky.sub(delRisky.raw))
        expect(updatedRes.reserveStable).to.equal(res.reserveStable.sub(delStable.raw))
      })

      it('emits the Removed event', async function () {
        const res = await this.contracts.engine.reserves(poolId)
        const delRisky = delLiquidity.mul(res.reserveRisky).div(res.liquidity)
        const delStable = delLiquidity.mul(res.reserveStable).div(res.liquidity)

        await expect(this.contracts.engineRemove.removeToExternal(poolId, delLiquidity.raw, empty))
          .to.emit(this.contracts.engine, 'Removed')
          .withArgs(this.contracts.engineRemove.address, delRisky.raw, delStable.raw)
      })
    })

    describe('fail cases', function () {
      it('reverts if value is 0', async function () {
        await expect(this.contracts.engineRemove.removeToExternal(poolId, 0, empty)).to.be.revertedWith(
          'ZeroLiquidityError()'
        )
      })

      it('reverts if required amount is too big', async function () {
        await expect(this.contracts.engineRemove.removeToExternal(poolId, parseWei('11').raw, empty)).to.be.reverted
      })
    })
  })
})
