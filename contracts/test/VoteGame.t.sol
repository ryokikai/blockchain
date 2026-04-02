// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {VoteGame} from "../src/VoteGame.sol";

contract VoteGameTest is Test {
    VoteGame public game;

    // テスト用のアドレス
    address player1 = address(0x1);
    address player2 = address(0x2);

    function setUp() public {
        game = new VoteGame();
        // テスト用にプレイヤーにETHを配布
        vm.deal(player1, 1 ether);
        vm.deal(player2, 1 ether);
    }

    // テスト1: 参加費なしでは投票できない
    function test_VoteRequiresFee() public {
        vm.prank(player1); // player1として実行
        vm.expectRevert("Must send exactly 0.0001 ETH");
        game.vote(VoteGame.Direction.Up); // 参加費なし → 失敗
    }

    // テスト2: 正しい参加費で投票できる
    function test_VoteWithFee() public {
        uint256 roundId = game.getCurrentRound();

        vm.prank(player1);
        game.vote{value: 0.0001 ether}(VoteGame.Direction.Up);

        assertEq(game.getRoundVoteCount(roundId), 1);
    }

    // テスト3: 賞金プールが正しく積み上がる
    function test_PoolAccumulates() public {
        uint256 roundId = game.getCurrentRound();

        vm.prank(player1);
        game.vote{value: 0.0001 ether}(VoteGame.Direction.Up);

        vm.prank(player2);
        game.vote{value: 0.0001 ether}(VoteGame.Direction.Down);

        // プール = 0.0001 * 90% * 2 = 0.00018 ETH
        assertEq(game.getRoundPool(roundId), 0.00018 ether);
        // オーナー残高 = 0.0001 * 10% * 2 = 0.00002 ETH
        assertEq(game.ownerBalance(), 0.00002 ether);
    }

    // テスト4: キャラクターが正しく移動する
    function test_CharacterMoves() public {
        uint256 roundId = game.getCurrentRound();

        vm.prank(player1);
        game.vote{value: 0.0001 ether}(VoteGame.Direction.Right);

        (uint8 x, uint8 y) = game.getRoundCharacterPosition(roundId);
        assertEq(x, 6);
        assertEq(y, 5);
    }

    // テスト5: グリッドの端で止まる
    function test_CharacterStopsAtEdge() public {
        uint256 roundId = game.getCurrentRound();

        for (uint8 i = 0; i < 6; i++) {
            vm.prank(player1);
            game.vote{value: 0.0001 ether}(VoteGame.Direction.Left);
        }

        (uint8 x, uint8 y) = game.getRoundCharacterPosition(roundId);
        assertEq(x, 0);
        assertEq(y, 5);
    }

    // テスト6: 宝箱到達後も投票できる
    function test_CanVoteAfterTreasureReached() public {
        uint256 roundId = game.getCurrentRound();

        // 最初の投票でラウンド初期化
        vm.prank(player1);
        game.vote{value: 0.0001 ether}(VoteGame.Direction.Up);

        (uint8 trsX, uint8 trsY) = game.getRoundTreasurePosition(roundId);

        uint8 startX = 5;
        uint8 startY = 4;

        if (trsX > startX) {
            for (uint8 i = 0; i < trsX - startX; i++) {
                vm.prank(player1);
                game.vote{value: 0.0001 ether}(VoteGame.Direction.Right);
            }
        } else if (trsX < startX) {
            for (uint8 i = 0; i < startX - trsX; i++) {
                vm.prank(player1);
                game.vote{value: 0.0001 ether}(VoteGame.Direction.Left);
            }
        }

        if (trsY > startY) {
            for (uint8 i = 0; i < trsY - startY; i++) {
                vm.prank(player1);
                game.vote{value: 0.0001 ether}(VoteGame.Direction.Down);
            }
        } else if (trsY < startY) {
            for (uint8 i = 0; i < startY - trsY; i++) {
                vm.prank(player1);
                game.vote{value: 0.0001 ether}(VoteGame.Direction.Up);
            }
        }

        address roundWinner = game.getRoundWinner(roundId);
        assertTrue(roundWinner != address(0));

        // 到達後も投票可能
        uint256 countBefore = game.getRoundVoteCount(roundId);
        vm.prank(player2);
        game.vote{value: 0.0001 ether}(VoteGame.Direction.Up);
        assertEq(game.getRoundVoteCount(roundId), countBefore + 1);
    }

    // テスト7: オーナーが手数料を引き出せる
    function test_OwnerWithdraw() public {
        vm.prank(player1);
        game.vote{value: 0.0001 ether}(VoteGame.Direction.Up);

        uint256 ownerBalanceBefore = address(this).balance;
        game.withdrawOwnerFees(); // テストコントラクト = オーナー
        uint256 ownerBalanceAfter = address(this).balance;

        assertEq(ownerBalanceAfter - ownerBalanceBefore, 0.00001 ether);
    }

    // テスト8: オーナー以外は引き出せない
    function test_NonOwnerCannotWithdraw() public {
        vm.prank(player1);
        game.vote{value: 0.0001 ether}(VoteGame.Direction.Up);

        vm.prank(player1);
        vm.expectRevert("Only owner");
        game.withdrawOwnerFees();
    }

    // ETHを受け取れるようにする（オーナー引き出しテスト用）
    receive() external payable {}
}
