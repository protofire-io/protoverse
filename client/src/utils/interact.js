import { ethers } from 'ethers'
import addresses from '../contracts/addresses.json'

const LOCAL_CHAIN_ID = Number(
  process.env.REACT_APP_CHAIN_ID || addresses.chainId || 31337,
)

const toHexChainId = (id) => `0x${Number(id).toString(16)}`

const ensureLocalNetwork = async () => {
  const hexId = toHexChainId(LOCAL_CHAIN_ID)
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexId }],
    })
  } catch (err) {
    // 4902 = chain not added to MetaMask
    if (err && (err.code === 4902 || err.code === -32603)) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: hexId,
            chainName: 'Hardhat Local',
            rpcUrls: ['http://127.0.0.1:8545'],
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18,
            },
          },
        ],
      })
      return
    }
    throw err
  }
}

export const connectMetamask = async () => {
  if (!window.ethereum) {
    return {
      event: 'No Wallet',
      response: 'Please install MetaMask in your browser',
    }
  }

  try {
    const currentChain = await window.ethereum.request({
      method: 'eth_chainId',
    })
    const currentId = parseInt(currentChain, 16)

    if (currentId !== LOCAL_CHAIN_ID) {
      await ensureLocalNetwork()
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    })

    if (!accounts || !accounts[0]) {
      return { event: 'error', response: 'No account selected' }
    }

    return { event: 'connected', response: accounts[0] }
  } catch (err) {
    console.error(err)
    return {
      event: 'error',
      response: (err && err.message) || 'Wallet connection failed',
    }
  }
}
