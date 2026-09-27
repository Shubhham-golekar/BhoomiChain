import * as Bhoomi from '../../contract/src/managed/bhoomi/contract/index.js';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type Logger } from 'pino';
import {
  type BBoardDerivedState,
  type BBoardContract,
  type BBoardProviders,
  type DeployedBBoardContract,
  type ParcelInfo,
  bboardPrivateStateKey,
} from './common-types.js';
import { CompiledBBoardContractContract, pureCircuits } from '../../contract/src/index';
import * as utils from './utils/index.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { combineLatest, map, tap, from, type Observable } from 'rxjs';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { BBoardPrivateState, createBBoardPrivateState } from '../../contract/src/witnesses.js';

const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.trim().toLowerCase().replace(/^0x/, '');
  if (clean.length !== 64) {
    throw new Error(`Expected a 32-byte (64 hex char) value, got ${clean.length} chars`);
  }
  return Buffer.from(clean, 'hex');
};

export interface DeployedBBoardAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<BBoardDerivedState>;
  mintParcel: (toOwnerPKHex: string, docHashHex: string) => Promise<void>;
  transferParcel: (parcelId: bigint, newOwnerPKHex: string) => Promise<void>;
  approveTransfer: (parcelId: bigint, spenderPKHex: string) => Promise<void>;
  lockCollateral: (parcelId: bigint, ltvPercent: bigint, dueBlock: bigint) => Promise<void>;
  repayLoan: (parcelId: bigint, repaymentAmount: bigint) => Promise<void>;
  markDefault: (parcelId: bigint, currentBlockHeight: bigint) => Promise<void>;
  updateDocHash: (parcelId: bigint, newDocHashHex: string) => Promise<void>;
  lookupParcel: (parcelId: bigint) => Promise<ParcelInfo>;
  getMyPublicKey: () => Promise<string>;
}

export class BBoardAPI implements DeployedBBoardAPI {
  private constructor(
    public readonly deployedContract: DeployedBBoardContract,
    private readonly providers: BBoardProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);
    this.state$ = combineLatest(
      [
        providers.publicDataProvider.contractStateObservable(this.deployedContractAddress, { type: 'latest' }).pipe(
          map((contractState) => Bhoomi.ledger(contractState.data)),
          tap((ledgerState) =>
            logger?.trace({
              ledgerStateChanged: {
                parcelCount: ledgerState.parcelCount,
                adminKey: toHex(ledgerState.adminKey),
              },
            }),
          ),
        ),
        from(providers.privateStateProvider.get(bboardPrivateStateKey) as Promise<BBoardPrivateState>),
      ],
      (ledgerState, privateState) => {
        const myPublicKey = pureCircuits.publicKey(privateState.secretKey);
        return {
          parcelCount: ledgerState.parcelCount as bigint,
          adminKey: toHex(ledgerState.adminKey),
          isAdmin: toHex(ledgerState.adminKey) === toHex(myPublicKey),
        };
      },
    );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<BBoardDerivedState>;

  async mintParcel(toOwnerPKHex: string, docHashHex: string): Promise<void> {
    this.logger?.info(`mintParcel: owner=${toOwnerPKHex}`);
    const txData = await this.deployedContract.callTx.mintParcel(hexToBytes(toOwnerPKHex), hexToBytes(docHashHex));
    this.logger?.trace({ transactionAdded: { circuit: 'mintParcel', txHash: txData.public.txHash } });
  }

  async transferParcel(parcelId: bigint, newOwnerPKHex: string): Promise<void> {
    this.logger?.info(`transferParcel: parcelId=${parcelId}`);
    const txData = await this.deployedContract.callTx.transferParcel(parcelId, hexToBytes(newOwnerPKHex));
    this.logger?.trace({ transactionAdded: { circuit: 'transferParcel', txHash: txData.public.txHash } });
  }

  async approveTransfer(parcelId: bigint, spenderPKHex: string): Promise<void> {
    this.logger?.info(`approveTransfer: parcelId=${parcelId}`);
    const txData = await this.deployedContract.callTx.approveTransfer(parcelId, hexToBytes(spenderPKHex));
    this.logger?.trace({ transactionAdded: { circuit: 'approveTransfer', txHash: txData.public.txHash } });
  }

  async lockCollateral(parcelId: bigint, ltvPercent: bigint, dueBlock: bigint): Promise<void> {
    this.logger?.info(`lockCollateral: parcelId=${parcelId}`);
    const txData = await this.deployedContract.callTx.lockCollateral(parcelId, ltvPercent, dueBlock);
    this.logger?.trace({ transactionAdded: { circuit: 'lockCollateral', txHash: txData.public.txHash } });
  }

  async repayLoan(parcelId: bigint, repaymentAmount: bigint): Promise<void> {
    this.logger?.info(`repayLoan: parcelId=${parcelId}`);
    const txData = await this.deployedContract.callTx.repayLoan(parcelId, repaymentAmount);
    this.logger?.trace({ transactionAdded: { circuit: 'repayLoan', txHash: txData.public.txHash } });
  }

  async markDefault(parcelId: bigint, currentBlockHeight: bigint): Promise<void> {
    this.logger?.info(`markDefault: parcelId=${parcelId}`);
    const txData = await this.deployedContract.callTx.markDefault(parcelId, currentBlockHeight);
    this.logger?.trace({ transactionAdded: { circuit: 'markDefault', txHash: txData.public.txHash } });
  }

  async updateDocHash(parcelId: bigint, newDocHashHex: string): Promise<void> {
    this.logger?.info(`updateDocHash: parcelId=${parcelId}`);
    const txData = await this.deployedContract.callTx.updateDocHash(parcelId, hexToBytes(newDocHashHex));
    this.logger?.trace({ transactionAdded: { circuit: 'updateDocHash', txHash: txData.public.txHash } });
  }

  async lookupParcel(parcelId: bigint): Promise<ParcelInfo> {
    const contractState = await this.providers.publicDataProvider.queryContractState(this.deployedContractAddress);
    if (contractState == null) {
      return { parcelId, exists: false };
    }
    const ledgerState = Bhoomi.ledger(contractState.data);
    const exists = ledgerState.parcelOwner.member(parcelId);
    if (!exists) {
      return { parcelId, exists: false };
    }
    const owner = toHex(ledgerState.parcelOwner.lookup(parcelId));
    const status = ledgerState.parcelStatus.member(parcelId) ? ledgerState.parcelStatus.lookup(parcelId) : undefined;
    const docHash = ledgerState.parcelDocHash.member(parcelId) ? toHex(ledgerState.parcelDocHash.lookup(parcelId)) : undefined;
    const loanPrincipal = ledgerState.loanPrincipal.member(parcelId) ? (ledgerState.loanPrincipal.lookup(parcelId) as bigint) : undefined;
    const loanDueBlock = ledgerState.loanDueBlock.member(parcelId) ? (ledgerState.loanDueBlock.lookup(parcelId) as bigint) : undefined;
    const approvedSpender = ledgerState.parcelApproved.member(parcelId) ? toHex(ledgerState.parcelApproved.lookup(parcelId)) : undefined;
    return { parcelId, exists: true, owner, status, docHash, loanPrincipal, loanDueBlock, approvedSpender };
  }

  async getMyPublicKey(): Promise<string> {
    const privateState = (await this.providers.privateStateProvider.get(bboardPrivateStateKey)) as BBoardPrivateState;
    return toHex(pureCircuits.publicKey(privateState.secretKey));
  }

  static async deploy(providers: BBoardProviders, logger?: Logger): Promise<BBoardAPI> {
    logger?.info('deployContract');
    const secretKey = utils.randomBytes(32);
    const adminVerifyKey = pureCircuits.publicKey(secretKey);
    const deployedBBoardContract = await deployContract<BBoardContract>(providers, {
      compiledContract: CompiledBBoardContractContract,
      privateStateId: bboardPrivateStateKey,
      initialPrivateState: createBBoardPrivateState(secretKey),
      args: [adminVerifyKey],
    });
    logger?.trace({
      contractDeployed: { finalizedDeployTxData: deployedBBoardContract.deployTxData.public },
    });
    return new BBoardAPI(deployedBBoardContract, providers, logger);
  }

  static async join(providers: BBoardProviders, contractAddress: ContractAddress, logger?: Logger): Promise<BBoardAPI> {
    logger?.info({ joinContract: { contractAddress } });
    const deployedBBoardContract = await findDeployedContract<BBoardContract>(providers, {
      contractAddress,
      compiledContract: CompiledBBoardContractContract,
      privateStateId: bboardPrivateStateKey,
      initialPrivateState: await BBoardAPI.getPrivateState(providers, contractAddress),
    });
    logger?.trace({
      contractJoined: { finalizedDeployTxData: deployedBBoardContract.deployTxData.public },
    });
    return new BBoardAPI(deployedBBoardContract, providers, logger);
  }

  private static async getPrivateState(
    providers: BBoardProviders,
    contractAddress: ContractAddress,
  ): Promise<BBoardPrivateState> {
    const existingPrivateState = await providers.privateStateProvider.get(bboardPrivateStateKey);
    if (existingPrivateState != null) {
      return existingPrivateState;
    }
    return createBBoardPrivateState(utils.randomBytes(32));
  }
}

export * from './common-types.js';
