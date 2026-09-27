// This file is part of midnightntwrk/example-bboard.
// Copyright (C) Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * BhoomiChain common types and abstractions.
 *
 * @module
 */

import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { ParcelStatus, BBoardPrivateState, Contract, Witnesses } from '../../contract/src/index';

export const bboardPrivateStateKey = 'bboardPrivateState';
export type PrivateStateId = typeof bboardPrivateStateKey;

export type PrivateStates = {
  readonly bboardPrivateState: BBoardPrivateState;
};

export type BBoardContract = Contract<BBoardPrivateState, Witnesses<BBoardPrivateState>>;

export type BBoardCircuitKeys = Exclude<keyof BBoardContract['impureCircuits'], number | symbol | 'publicKey' | 'computeLoanAmount'>;

export type BBoardProviders = MidnightProviders<BBoardCircuitKeys, PrivateStateId, BBoardPrivateState>;

export type DeployedBBoardContract = FoundContract<BBoardContract>;

/**
 * Summary information about a single parcel, looked up on demand.
 */
export type ParcelInfo = {
  readonly parcelId: bigint;
  readonly exists: boolean;
  readonly owner?: string;
  readonly status?: ParcelStatus;
  readonly docHash?: string;
  readonly loanPrincipal?: bigint;
  readonly loanDueBlock?: bigint;
  readonly approvedSpender?: string;
};

/**
 * The derived combination of public (ledger) and private state, tracked continuously.
 */
export type BBoardDerivedState = {
  readonly parcelCount: bigint;
  readonly adminKey: string;
  readonly isAdmin: boolean;
};
