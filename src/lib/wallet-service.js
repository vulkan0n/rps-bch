/**
 * Servicio de Wallet BCH usando mainnet-js
 *
 * Opciones de wallet:
 * 1. Wallet temporal (nueva) - para pruebas rapidas
 * 2. Wallet nombrada (persistente) - guardada en IndexedDB del navegador
 * 3. Wallet desde WIF - importar wallet existente
 */

// Nota: mainnet-js usa imports dinamicos para el navegador
let Wallet = null;
let TestNetWallet = null;

// Inicializar la libreria (necesario en navegador)
async function initMainnet() {
  if (Wallet) return; // Ya inicializado

  const mainnet = await import('mainnet-js');
  Wallet = mainnet.Wallet;
  TestNetWallet = mainnet.TestNetWallet;
}

class WalletService {
  constructor() {
    this.wallet = null;
    this.isTestnet = false; // Usar mainnet por defecto (BCH tiene tarifas muy bajas)
  }

  /**
   * Crear una wallet nueva (temporal)
   * La wallet se pierde si el usuario cierra el navegador
   */
  async createNewWallet() {
    await initMainnet();

    const WalletClass = this.isTestnet ? TestNetWallet : Wallet;
    this.wallet = await WalletClass.newRandom();

    return {
      address: this.wallet.getDepositAddress(),
      balance: await this.getBalance(),
    };
  }

  /**
   * Crear o recuperar una wallet nombrada (persistente)
   * Se guarda en IndexedDB del navegador
   * @param {string} name - Nombre unico para la wallet
   */
  async getNamedWallet(name = "rps-bch-wallet") {
    await initMainnet();

    const WalletClass = this.isTestnet ? TestNetWallet : Wallet;
    this.wallet = await WalletClass.named(name);

    return {
      address: this.wallet.getDepositAddress(),
      balance: await this.getBalance(),
    };
  }

  /**
   * Importar wallet desde WIF (Wallet Import Format)
   * @param {string} wif - Clave privada en formato WIF
   */
  async importFromWIF(wif) {
    await initMainnet();

    const WalletClass = this.isTestnet ? TestNetWallet : Wallet;
    this.wallet = await WalletClass.fromWIF(wif);

    return {
      address: this.wallet.getDepositAddress(),
      balance: await this.getBalance(),
    };
  }

  /**
   * Obtener el balance de la wallet
   * @returns {Promise<{bch: number, sats: bigint}>}
   */
  async getBalance() {
    if (!this.wallet) throw new Error("Wallet no conectada");

    const balanceSats = await this.wallet.getBalance("sat");
    return {
      bch: Number(balanceSats) / 100_000_000,
      sats: balanceSats,
    };
  }

  /**
   * Obtener la direccion de deposito
   * @returns {string}
   */
  getAddress() {
    if (!this.wallet) throw new Error("Wallet no conectada");
    return this.wallet.getDepositAddress();
  }

  /**
   * Exportar la clave privada en formato WIF
   * @returns {string} WIF (Wallet Import Format)
   */
  exportWIF() {
    if (!this.wallet) throw new Error("Wallet no conectada");
    return this.wallet.privateKeyWif;
  }

  /**
   * Obtener el hash publico de la clave (PKH) para smart contracts
   * @returns {Promise<Uint8Array>}
   */
  async getPublicKeyHash() {
    if (!this.wallet) throw new Error("Wallet no conectada");
    return this.wallet.getPublicKeyHash();
  }

  /**
   * Enviar BCH a una direccion
   * @param {string} toAddress - Direccion destino
   * @param {number} amountBCH - Cantidad en BCH
   * @returns {Promise<{txid: string}>}
   */
  async send(toAddress, amountBCH) {
    if (!this.wallet) throw new Error("Wallet no conectada");

    const amountSats = BigInt(Math.floor(amountBCH * 100_000_000));

    const result = await this.wallet.send([
      { cashaddr: toAddress, value: amountSats, unit: "sat" }
    ]);

    return {
      txid: result.txId,
      hex: result.hex,
    };
  }

  /**
   * Firmar un mensaje (util para verificar propiedad de la wallet)
   * @param {string} message - Mensaje a firmar
   * @returns {Promise<string>} Firma en formato base64
   */
  async signMessage(message) {
    if (!this.wallet) throw new Error("Wallet no conectada");
    return this.wallet.sign(message);
  }

  /**
   * Verificar firma de un mensaje
   * @param {string} message - Mensaje original
   * @param {string} signature - Firma a verificar
   * @param {string} address - Direccion que supuestamente firmo
   * @returns {Promise<boolean>}
   */
  async verifySignature(message, signature, address) {
    await initMainnet();
    const WalletClass = this.isTestnet ? TestNetWallet : Wallet;
    return WalletClass.verify(message, signature, address);
  }

  /**
   * Observar cambios en el balance
   * @param {function} callback - Funcion a llamar cuando cambia el balance
   */
  watchBalance(callback) {
    if (!this.wallet) throw new Error("Wallet no conectada");
    return this.wallet.watchBalance(callback);
  }

  /**
   * Desconectar la wallet
   */
  disconnect() {
    this.wallet = null;
  }

  /**
   * Verificar si hay wallet conectada
   */
  isConnected() {
    return this.wallet !== null;
  }

  /**
   * Cambiar entre mainnet y testnet
   * @param {boolean} useTestnet
   */
  setTestnet(useTestnet) {
    this.isTestnet = useTestnet;
    if (this.wallet) {
      console.warn("Cambiando red requiere reconectar la wallet");
      this.disconnect();
    }
  }
}

// Exportar una instancia singleton
export const walletService = new WalletService();
export default walletService;
