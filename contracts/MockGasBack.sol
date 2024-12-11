// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockGasBack {
    function withdraw(
        uint256 _tokenId,
        address payable _recipient,
        uint256 _amount
    ) external returns (uint256) {
        require(_amount > 0, "Invalid amount");
        (bool success, ) = _recipient.call{value: _amount}("");
        require(success, "Transfer failed");
        return _amount;
    }

    receive() external payable {}
}