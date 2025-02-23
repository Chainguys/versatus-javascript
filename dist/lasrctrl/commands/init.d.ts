import { Arguments, CommandBuilder } from 'yargs';
export interface InitCommandArgs {
    example: string;
}
export declare const initCommandFlags: CommandBuilder<{}, InitCommandArgs>;
declare const init: (argv: Arguments<InitCommandArgs>) => void;
export default init;
