// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {SafeDelivery} from "../contracts/SafeDelivery.sol";

contract DeployScript is Script {
    function run() external returns (address) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        SafeDelivery safeDelivery = new SafeDelivery();
        
        console.log("SafeDelivery deployed at:", address(safeDelivery));
        console.log("Admin address:", safeDelivery.admin());
        
        vm.stopBroadcast();
        
        return address(safeDelivery);
    }
}

