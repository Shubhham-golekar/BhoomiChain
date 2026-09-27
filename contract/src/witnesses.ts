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

import { Ledger } from "./managed/bhoomi/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

export type BBoardPrivateState = {
  readonly secretKey: Uint8Array;
  readonly landValue: bigint;
};

export const createBBoardPrivateState = (secretKey: Uint8Array, landValue: bigint = 100000n) => ({
  secretKey,
  landValue,
});

export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, BBoardPrivateState>): [
    BBoardPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],

  getLandValue: ({
    privateState,
  }: WitnessContext<Ledger, BBoardPrivateState>): [
    BBoardPrivateState,
    bigint,
  ] => [privateState, privateState.landValue],

  computeLoanDivision: (
    { privateState }: WitnessContext<Ledger, BBoardPrivateState>,
    dividend: bigint,
    divisor: bigint,
  ): [BBoardPrivateState, [bigint, bigint]] => [
    privateState,
    [dividend / divisor, dividend % divisor],
  ],
};
