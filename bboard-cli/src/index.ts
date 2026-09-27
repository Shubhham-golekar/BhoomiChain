import { createInterface, type Interface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createHash } from 'node:crypto';
import { WebSocket } from 'ws';
import {
  BBoardAPI,
  type BBoardDerivedState,
  bboardPrivateStateKey,
  type BBoardProviders,
  type DeployedBBoardContract,
  type PrivateStateId,
} from '../../api/src/index';
import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { ledger, type Ledger, ParcelStatus } from '../../contract/src/managed/bhoomi/contract/index.js';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { type Logger } from 'pino';
import { type Config, StandaloneConfig, setNetworkIdGlobal } from './config.js';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { TestEnvironment } from '@midnight-ntwrk/testkit-js';
import { MidnightWalletProvider } from './midnight-wallet-provider';
import { randomBytes } from '../../api/src/utils';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { syncWallet, waitForUnshieldedFunds } from './wallet-utils';
import { generateDust } from './generate-dust';
import { BBoardPrivateState } from '../../contract/src/witnesses.js';

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

const PARCEL_STATUS_NAMES = ['VERIFIED', 'LOCKED', 'UNLOCKED', 'DEFAULTED'];

const hashTextToHex = (text: string): string => createHash('sha256').update(text).digest('hex');

export const getBBoardLedgerState = async (
  providers: BBoardProviders,
  contractAddress: ContractAddress,
): Promise<Ledger | null> => {
  assertIsContractAddress(contractAddress);
  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  return contractState != null ? ledger(contractState.data) : null;
};

const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new BhoomiChain contract
  2. Join an existing BhoomiChain contract
  3. Exit
Which would you like to do? `;

const deployOrJoin = async (providers: BBoardProviders, rli: Interface, logger: Logger): Promise<BBoardAPI | null> => {
  let api: BBoardAPI | null = null;
  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1':
        api = await BBoardAPI.deploy(providers, logger);
        logger.info(`Deployed contract at address: ${api.deployedContractAddress}`);
        return api;
      case '2':
        api = await BBoardAPI.join(providers, await rli.question('What is the contract address (in hex)? '), logger);
        logger.info(`Joined contract at address: ${api.deployedContractAddress}`);
        return api;
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const displayPrivateState = async (providers: BBoardProviders, logger: Logger): Promise<void> => {
  const privateState = await providers.privateStateProvider.get(bboardPrivateStateKey);
  if (privateState === null) {
    logger.info(`There is no existing BhoomiChain private state`);
  } else {
    logger.info(`Current secret key is: ${toHex(privateState.secretKey)}`);
    logger.info(`Current (test) land value witness is: ${privateState.landValue}`);
  }
};

const displayDerivedState = (state: BBoardDerivedState | undefined, logger: Logger) => {
  if (state === undefined) {
    logger.info(`No BhoomiChain state currently available`);
  } else {
    logger.info(`Total parcels minted: ${state.parcelCount}`);
    logger.info(`Admin public key: ${state.adminKey}`);
    logger.info(`Are you the admin? ${state.isAdmin ? 'yes' : 'no'}`);
  }
};

const displayParcelInfo = async (bboardApi: BBoardAPI, parcelId: bigint, logger: Logger): Promise<void> => {
  const info = await bboardApi.lookupParcel(parcelId);
  if (!info.exists) {
    logger.info(`No parcel found with ID ${parcelId}`);
    return;
  }
  logger.info(`Parcel ${parcelId}:`);
  logger.info(`  Owner:          ${info.owner}`);
  logger.info(`  Status:         ${PARCEL_STATUS_NAMES[Number(info.status)] ?? info.status}`);
  logger.info(`  Doc hash:       ${info.docHash}`);
  logger.info(`  Loan principal: ${info.loanPrincipal ?? 'none'}`);
  logger.info(`  Loan due block: ${info.loanDueBlock ?? 'none'}`);
  logger.info(`  Approved spend: ${info.approvedSpender ?? 'none'}`);
};

const promptPublicKey = async (bboardApi: BBoardAPI, rli: Interface, prompt: string): Promise<string> => {
  const useOwn = await rli.question(`${prompt} Use your own public key? (y/n): `);
  if (useOwn.trim().toLowerCase() === 'y') {
    return await bboardApi.getMyPublicKey();
  }
  return await rli.question('Enter public key (64 hex chars): ');
};

const MAIN_LOOP_QUESTION = `
You can do one of the following:
  1. Mint a new parcel (admin only)
  2. Transfer a parcel
  3. Approve a transfer
  4. Lock collateral (get a loan)
  5. Repay a loan
  6. Mark a loan as defaulted (admin only)
  7. Update a parcel's document hash (admin only)
  8. Look up a parcel by ID
  9. Show my public key
  10. Display the current derived state (parcel count, admin key)
  11. Display the current private state (known only to this DApp instance)
  12. Exit
Which would you like to do? `;

const mainLoop = async (providers: BBoardProviders, rli: Interface, logger: Logger): Promise<void> => {
  const bboardApi = await deployOrJoin(providers, rli, logger);
  if (bboardApi === null) {
    return;
  }
  let currentState: BBoardDerivedState | undefined;
  const stateObserver = {
    next: (state: BBoardDerivedState) => (currentState = state),
  };
  const subscription = bboardApi.state$.subscribe(stateObserver);
  try {
    while (true) {
      const choice = await rli.question(MAIN_LOOP_QUESTION);
      try {
        switch (choice) {
          case '1': {
            const ownerPKHex = await promptPublicKey(bboardApi, rli, 'Mint to whom?');
            const description = await rli.question('Describe the land document (will be hashed): ');
            const docHashHex = hashTextToHex(description);
            await bboardApi.mintParcel(ownerPKHex, docHashHex);
            logger.info(`Minted parcel. Owner=${ownerPKHex}, docHash=${docHashHex}`);
            break;
          }
          case '2': {
            const parcelId = BigInt(await rli.question('Parcel ID: '));
            const newOwnerPKHex = await promptPublicKey(bboardApi, rli, 'Transfer to whom?');
            await bboardApi.transferParcel(parcelId, newOwnerPKHex);
            break;
          }
          case '3': {
            const parcelId = BigInt(await rli.question('Parcel ID: '));
            const spenderPKHex = await promptPublicKey(bboardApi, rli, 'Approve whom to transfer?');
            await bboardApi.approveTransfer(parcelId, spenderPKHex);
            break;
          }
          case '4': {
            const parcelId = BigInt(await rli.question('Parcel ID: '));
            const ltvPercent = BigInt(await rli.question('LTV percent (1-80): '));
            const dueBlock = BigInt(await rli.question('Due block height: '));
            await bboardApi.lockCollateral(parcelId, ltvPercent, dueBlock);
            break;
          }
          case '5': {
            const parcelId = BigInt(await rli.question('Parcel ID: '));
            const repaymentAmount = BigInt(await rli.question('Repayment amount: '));
            await bboardApi.repayLoan(parcelId, repaymentAmount);
            break;
          }
          case '6': {
            const parcelId = BigInt(await rli.question('Parcel ID: '));
            const currentBlockHeight = BigInt(await rli.question('Current block height: '));
            await bboardApi.markDefault(parcelId, currentBlockHeight);
            break;
          }
          case '7': {
            const parcelId = BigInt(await rli.question('Parcel ID: '));
            const description = await rli.question('Describe the new document (will be hashed): ');
            await bboardApi.updateDocHash(parcelId, hashTextToHex(description));
            break;
          }
          case '8': {
            const parcelId = BigInt(await rli.question('Parcel ID: '));
            await displayParcelInfo(bboardApi, parcelId, logger);
            break;
          }
          case '9': {
            const pk = await bboardApi.getMyPublicKey();
            logger.info(`Your public key is: ${pk}`);
            break;
          }
          case '10':
            displayDerivedState(currentState, logger);
            break;
          case '11':
            await displayPrivateState(providers, logger);
            break;
          case '12':
            logger.info('Exiting...');
            return;
          default:
            logger.error(`Invalid choice: ${choice}`);
        }
      } catch (e) {
        logError(logger, e);
        logger.info('Returning to main menu...');
      }
    }
  } finally {
    subscription.unsubscribe();
  }
};

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const WALLET_LOOP_QUESTION = `
You can do one of the following:
  1. Build a fresh wallet
  2. Build wallet from a seed
  3. Exit
Which would you like to do? `;

const buildWallet = async (config: Config, rli: Interface, logger: Logger): Promise<string | undefined> => {
  if (config instanceof StandaloneConfig) {
    return GENESIS_MINT_WALLET_SEED;
  }
  while (true) {
    const choice = await rli.question(WALLET_LOOP_QUESTION);
    switch (choice) {
      case '1':
        return toHex(randomBytes(32));
      case '2':
        return await rli.question('Enter your wallet seed: ');
      case '3':
        logger.info('Exiting...');
        return undefined;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

export const run = async (config: Config, testEnv: TestEnvironment, logger: Logger): Promise<void> => {
  const rli = createInterface({ input, output, terminal: true });
  const providersToBeStopped: MidnightWalletProvider[] = [];
  try {
    const envConfiguration = await testEnv.start();
    setNetworkIdGlobal(envConfiguration.networkId);
    logger.info(`Environment started with configuration: ${JSON.stringify(envConfiguration)}`);
    const seed = await buildWallet(config, rli, logger);
    if (seed === undefined) {
      return;
    }
    const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, seed);
    providersToBeStopped.push(walletProvider);
    const walletFacade: WalletFacade = walletProvider.wallet;

    await walletProvider.start();

    const unshieldedState = await waitForUnshieldedFunds(logger, walletFacade, envConfiguration, unshieldedToken(), config.generateDust);
    const nightBalance = unshieldedState.balances[unshieldedToken().raw];
    if (nightBalance === undefined) {
      logger.info('No funds received, exiting...');
      return;
    }
    logger.info(`Your NIGHT wallet balance is: ${nightBalance}`);

    if (config.generateDust) {
      const dustGeneration = await generateDust(logger, seed, unshieldedState, walletFacade);
      if (dustGeneration) {
        logger.info(`Submitted dust generation registration transaction: ${dustGeneration}`);
        await syncWallet(logger, walletFacade);
      }
    }

    const zkConfigProvider = new NodeZkConfigProvider<'mintParcel' | 'transferParcel' | 'approveTransfer' | 'lockCollateral' | 'repayLoan' | 'markDefault' | 'updateDocHash'>(config.zkConfigPath);
    const providers: BBoardProviders = {
      privateStateProvider: levelPrivateStateProvider<PrivateStateId, BBoardPrivateState>({
        privateStateStoreName: config.privateStateStoreName,
        signingKeyStoreName: `${config.privateStateStoreName}-signing-keys`,
        privateStoragePasswordProvider: () => {
          return 'Bboard-Test-2026!';
        },
        accountId: seed,
      }),
      publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
      zkConfigProvider: zkConfigProvider,
      proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
      walletProvider: walletProvider,
      midnightProvider: walletProvider,
    };
    await mainLoop(providers, rli, logger);
  } catch (e) {
    logError(logger, e);
    logger.info('Exiting...');
  } finally {
    try {
      rli.close();
      rli.removeAllListeners();
    } catch (e) {
      logError(logger, e);
    } finally {
      try {
        for (const wallet of providersToBeStopped) {
          logger.info('Stopping wallet...');
          await wallet.stop();
        }
        if (testEnv) {
          logger.info('Stopping test environment...');
          await testEnv.shutdown();
        }
      } catch (e) {
        logError(logger, e);
      }
    }
  }
};

function logError(logger: Logger, e: unknown) {
  if (e instanceof Error) {
    logger.error(`Found error '${e.message}'`);
    logger.debug(`${e.stack}`);
  } else {
    logger.error(`Found error (unknown type)`);
  }
}
