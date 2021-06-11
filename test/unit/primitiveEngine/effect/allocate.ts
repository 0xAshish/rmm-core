import { waffle } from 'hardhat'
import { expect } from 'chai'
import { BigNumber, constants } from 'ethers'

import { parseWei, PERCENTAGE } from '../../../shared/Units'

import { allocateFragment } from '../fragments'

import loadContext from '../../context'

const [strike, sigma, time, _] = [parseWei('1000').raw, 0.85 * PERCENTAGE, 31449600, parseWei('1100').raw]

describe('allocate', function () {
  before(async function () {
    loadContext(waffle.provider, ['engineCreate', 'engineDeposit', 'engineAllocate'], allocateFragment)
  })

  describe('when the parameters are valid', function () {
    it('allocates enough stable and risky for 1 LP share from margin', async function () {
      const pid = await this.contracts.engine.getPoolId(strike, sigma, time)
      const posid = await this.contracts.engineAllocate.getPosition(pid)
      await this.contracts.engineAllocate.allocateFromMargin(pid, this.contracts.engineAllocate.address, parseWei('1').raw)

      expect(await this.contracts.engine.positions(posid)).to.be.deep.eq([
        BigNumber.from('0'),
        BigNumber.from('0'),
        BigNumber.from('0'),
        parseWei('1').raw,
        BigNumber.from('0'),
      ])
    })

    it('allocates enough stable and risky for 1 LP share from external', async function () {
      const pid = await this.contracts.engine.getPoolId(strike, sigma, time)
      const posid = await this.contracts.engineAllocate.getPosition(pid)
      await this.contracts.engineAllocate.allocateFromExternal(pid, this.contracts.engineAllocate.address, parseWei('1').raw)
      expect(await this.contracts.engine.positions(posid)).to.be.deep.eq([
        BigNumber.from('0'),
        BigNumber.from('0'),
        BigNumber.from('0'),
        parseWei('1').raw,
        BigNumber.from('0'),
      ])
    })

    it('fails to allocate liquidity when margin is insufficient', async function () {
      const pid = await this.contracts.engine.getPoolId(strike, sigma, time)
      await expect(
        this.contracts.engineAllocate.allocateFromMargin(pid, this.contracts.engineAllocate.address, parseWei('10000').raw)
      ).to.be.reverted
    })

    it('fails to allocate liquidity when external balances are insufficient', async function () {
      const pid = await this.contracts.engine.getPoolId(strike, sigma, time)
      await expect(
        this.contracts.engineAllocate.allocateFromExternal(pid, this.contracts.engineAllocate.address, parseWei('10000').raw)
      ).to.be.reverted
    })
  })
})