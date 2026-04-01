// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract VoteGame {
    enum Direction {
        Up,
        Down,
        Left,
        Right
    }

    struct Vote {
        address voter;
        Direction direction;
        uint256 timestamp;
    }

    struct Round {
        uint8 characterX;
        uint8 characterY;
        uint8 treasureX;
        uint8 treasureY;
        address winner;
        uint256 pool;          // このラウンドの賞金プール
        bool prizeClaimed;     // winnerが賞金を引き出し済みか
        Vote[] votes;
    }

    uint8 public constant GRID_SIZE = 11;
    uint256 public constant ROUND_DURATION = 10 minutes;
    uint256 public constant VOTE_FEE = 0.001 ether;  // 参加費
    uint8 public constant OWNER_FEE_PERCENT = 10;     // オーナー手数料 10%

    // コントラクトのオーナー（デプロイした人）
    address public owner;

    // オーナーが引き出せる手数料の残高
    uint256 public ownerBalance;

    mapping(uint256 => Round) public rounds;
    mapping(uint256 => bool) public roundInitialized;

    // --- コンストラクタ ---

    constructor() {
        owner = msg.sender; // デプロイした人がオーナーになる
    }

    // --- ラウンド計算 ---

    function getCurrentRound() public view returns (uint256) {
        return block.timestamp / ROUND_DURATION;
    }

    function getRoundStartTime(uint256 roundId) public pure returns (uint256) {
        return roundId * ROUND_DURATION;
    }

    function getRoundEndTime(uint256 roundId) public pure returns (uint256) {
        return (roundId + 1) * ROUND_DURATION;
    }

    function isRoundActive(uint256 roundId) public view returns (bool) {
        return getCurrentRound() == roundId;
    }

    function isRoundFinished(uint256 roundId) public view returns (bool) {
        return getCurrentRound() > roundId;
    }

    // --- ラウンド初期化 ---

    function _initRound(uint256 roundId) private {
        if (roundInitialized[roundId]) return;

        Round storage round = rounds[roundId];
        round.characterX = 5;
        round.characterY = 5;

        uint256 random = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            roundId
        )));

        round.treasureX = uint8(random % GRID_SIZE);
        round.treasureY = uint8((random / GRID_SIZE) % GRID_SIZE);

        if (round.treasureX == 5 && round.treasureY == 5) {
            round.treasureX = 0;
            round.treasureY = 0;
        }

        roundInitialized[roundId] = true;
    }

    // --- 投票 ---

    // payable = この関数はETHを受け取れる
    function vote(Direction direction) external payable {
        // 参加費が正しいか確認
        require(msg.value == VOTE_FEE, "Must send exactly 0.001 ETH");

        uint256 roundId = getCurrentRound();
        _initRound(roundId);

        Round storage round = rounds[roundId];

        // 手数料を計算してオーナーに積み立て
        uint256 ownerFee = (msg.value * OWNER_FEE_PERCENT) / 100;
        uint256 prizeAmount = msg.value - ownerFee;

        ownerBalance += ownerFee;
        round.pool += prizeAmount;

        // 投票を記録
        round.votes.push(Vote({
            voter: msg.sender,
            direction: direction,
            timestamp: block.timestamp
        }));

        // キャラクターを移動
        _moveCharacter(round, direction);

        // 宝箱に到達 かつ まだwinnerがいない
        if (
            round.characterX == round.treasureX &&
            round.characterY == round.treasureY &&
            round.winner == address(0)
        ) {
            round.winner = msg.sender;
        }
    }

    function _moveCharacter(Round storage round, Direction direction) private {
        if (direction == Direction.Up && round.characterY > 0) {
            round.characterY -= 1;
        } else if (direction == Direction.Down && round.characterY < GRID_SIZE - 1) {
            round.characterY += 1;
        } else if (direction == Direction.Left && round.characterX > 0) {
            round.characterX -= 1;
        } else if (direction == Direction.Right && round.characterX < GRID_SIZE - 1) {
            round.characterX += 1;
        }
    }

    // --- 賞金引き出し ---

    // winnerが賞金を引き出す
    function claimPrize(uint256 roundId) external {
        Round storage round = rounds[roundId];

        require(isRoundFinished(roundId), "Round not finished yet");
        require(round.winner == msg.sender, "You are not the winner");
        require(!round.prizeClaimed, "Prize already claimed");

        round.prizeClaimed = true;

        // winnerにETHを送金
        // call = 低レベルのETH送金方法（最も安全）
        (bool success, ) = msg.sender.call{value: round.pool}("");
        require(success, "Transfer failed");
    }

    // オーナーが手数料を引き出す
    function withdrawOwnerFees() external {
        require(msg.sender == owner, "Only owner");
        require(ownerBalance > 0, "No fees to withdraw");

        uint256 amount = ownerBalance;
        ownerBalance = 0;

        (bool success, ) = owner.call{value: amount}("");
        require(success, "Transfer failed");
    }

    // オーナーを別のアドレスに変更する
    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Only owner");
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    // --- 読み取り用の関数 ---

    function getRoundVotes(uint256 roundId) external view returns (Vote[] memory) {
        return rounds[roundId].votes;
    }

    function getRoundVoteCount(uint256 roundId) external view returns (uint256) {
        return rounds[roundId].votes.length;
    }

    function getRoundCharacterPosition(uint256 roundId) external view returns (uint8, uint8) {
        return (rounds[roundId].characterX, rounds[roundId].characterY);
    }

    function getRoundTreasurePosition(uint256 roundId) external view returns (uint8, uint8) {
        return (rounds[roundId].treasureX, rounds[roundId].treasureY);
    }

    function getRoundWinner(uint256 roundId) external view returns (address) {
        return rounds[roundId].winner;
    }

    function getRoundPool(uint256 roundId) external view returns (uint256) {
        return rounds[roundId].pool;
    }
}
