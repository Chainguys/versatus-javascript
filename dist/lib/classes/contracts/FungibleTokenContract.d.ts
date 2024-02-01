import { Contract } from './Contract';
import { Inputs } from '../../types';
/**
 * Class representing a fungible token contract, extending the base `Contract` class.
 * It encapsulates the core functionality and properties of a fungible token.
 */
export declare class FungibleTokenContract extends Contract {
    /**
     * Constructs a new instance of the FungibleTokenContract class.
     */
    constructor();
    create(inputs: Inputs): object;
    mint(inputs: Inputs): object;
}
