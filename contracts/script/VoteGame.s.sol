// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {VoteGame} from "../src/VoteGame.sol";

contract VoteGameScript is Script {
    function run() public {
        vm.startBroadcast();

        VoteGame game = new VoteGame();
        console.log("VoteGame deployed at:", address(game));

        vm.stopBroadcast();
    }
}
